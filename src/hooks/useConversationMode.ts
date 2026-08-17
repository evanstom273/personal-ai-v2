import { useCallback, useRef, useState } from 'react'
import { transcribeAudioWithGemini } from '@/services/gemini/transcribeAudio'
import type { ChatSubmitPayload } from '@/types/chat'
import {
	getSpeechRecognitionConstructor,
	getSpeechRecognitionProfile,
	openMicrophoneStream,
	releaseMicrophoneStream,
	shouldUseRecorderTranscription,
} from '@/utils/speechRecognition'

export type ConversationModeStatus =
	| 'idle'
	| 'listening'
	| 'transcribing'
	| 'thinking'
	| 'speaking'

const SILENCE_MS = 5500
const SPEECH_RMS_THRESHOLD = 0.018

interface UseConversationModeOptions {
	geminiApiKey: string
	transcriptionModelId: string
	onSubmit: (payload: ChatSubmitPayload) => Promise<void>
	onStopSpeaking: () => void
}

export function useConversationMode({
	geminiApiKey,
	transcriptionModelId,
	onSubmit,
	onStopSpeaking,
}: UseConversationModeOptions) {
	const [isActive, setIsActive] = useState(false)
	const [isMuted, setIsMuted] = useState(false)
	const [status, setStatus] = useState<ConversationModeStatus>('idle')
	const [liveTranscript, setLiveTranscript] = useState('')
	const [error, setError] = useState<string | null>(null)

	const useRecorder = shouldUseRecorderTranscription()
	const recognitionRef = useRef<SpeechRecognition | null>(null)
	const micStreamRef = useRef<MediaStream | null>(null)
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioChunksRef = useRef<Blob[]>([])
	const committedRef = useRef('')
	const interimRef = useRef('')
	const hasSpeechRef = useRef(false)
	const lastSpeechAtRef = useRef(0)
	const silenceTimerRef = useRef<number | null>(null)
	const isActiveRef = useRef(false)
	const isMutedRef = useRef(false)
	const statusRef = useRef<ConversationModeStatus>('idle')
	const beginListeningRef = useRef<() => Promise<void>>(async () => {})

	const setConversationStatus = useCallback((next: ConversationModeStatus) => {
		statusRef.current = next
		setStatus(next)
	}, [])

	const clearSilenceTimer = useCallback(() => {
		if (silenceTimerRef.current !== null) {
			window.clearTimeout(silenceTimerRef.current)
			silenceTimerRef.current = null
		}
	}, [])

	const releaseMicrophone = useCallback(() => {
		releaseMicrophoneStream(micStreamRef.current)
		micStreamRef.current = null
	}, [])

	const stopRecognition = useCallback(() => {
		const active = recognitionRef.current
		recognitionRef.current = null
		if (active) {
			try {
				active.abort()
			} catch {
				// ignore
			}
		}
	}, [])

	const stopRecorder = useCallback(async (): Promise<Blob | null> => {
		const recorder = mediaRecorderRef.current
		mediaRecorderRef.current = null

		if (!recorder || recorder.state === 'inactive') {
			const chunks = audioChunksRef.current
			audioChunksRef.current = []
			return chunks.length > 0
				? new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' })
				: null
		}

		return new Promise((resolve) => {
			recorder.onstop = () => {
				const chunks = audioChunksRef.current
				audioChunksRef.current = []
				resolve(
					chunks.length > 0
						? new Blob(chunks, {
								type: chunks[0]?.type || recorder.mimeType || 'audio/webm',
							})
						: null,
				)
			}
			try {
				recorder.stop()
			} catch {
				resolve(null)
			}
		})
	}, [])

	const submitTranscript = useCallback(async () => {
		if (!isActiveRef.current || isMutedRef.current) {
			return
		}

		clearSilenceTimer()
		stopRecognition()
		setConversationStatus('transcribing')

		let transcript = `${committedRef.current} ${interimRef.current}`.trim()

		if (useRecorder) {
			const audioBlob = await stopRecorder()
			releaseMicrophone()
			if (audioBlob) {
				try {
					const spoken = await transcribeAudioWithGemini(
						geminiApiKey,
						transcriptionModelId,
						audioBlob,
					)
					transcript = `${transcript} ${spoken}`.trim()
				} catch (transcriptionError) {
					setError(
						transcriptionError instanceof Error
							? transcriptionError.message
							: 'Transcription failed.',
					)
					setConversationStatus('listening')
					void beginListeningRef.current()
					return
				}
			}
		} else {
			releaseMicrophone()
		}

		committedRef.current = ''
		interimRef.current = ''
		setLiveTranscript('')

		if (!transcript) {
			setConversationStatus('listening')
			void beginListeningRef.current()
			return
		}

		setConversationStatus('thinking')
		await onSubmit({
			text: transcript,
			attachments: [],
			webSearchEnabled: false,
			inputMethod: 'speech',
		})
	}, [
		clearSilenceTimer,
		geminiApiKey,
		onSubmit,
		releaseMicrophone,
		stopRecognition,
		stopRecorder,
		setConversationStatus,
		transcriptionModelId,
		useRecorder,
	])

	const scheduleSilenceSubmit = useCallback(() => {
		clearSilenceTimer()
		silenceTimerRef.current = window.setTimeout(() => {
			if (
				!isActiveRef.current ||
				isMutedRef.current ||
				statusRef.current !== 'listening'
			) {
				return
			}
			if (Date.now() - lastSpeechAtRef.current < SILENCE_MS - 100) {
				return
			}
			void submitTranscript()
		}, SILENCE_MS)
	}, [clearSilenceTimer, submitTranscript])

	const beginListening = useCallback(async () => {
		if (!isActiveRef.current || isMutedRef.current) {
			return
		}

		if (useRecorder) {
			const microphone = await openMicrophoneStream()
			if (!microphone.ok) {
				setError(microphone.message)
				return
			}

			releaseMicrophone()
			micStreamRef.current = microphone.stream
			audioChunksRef.current = []

			const audioContext = new AudioContext()
			await audioContext.resume()
			const source = audioContext.createMediaStreamSource(microphone.stream)
			const analyser = audioContext.createAnalyser()
			analyser.fftSize = 2048
			source.connect(analyser)

			let recorder: MediaRecorder
			try {
				recorder = new MediaRecorder(microphone.stream)
			} catch {
				releaseMicrophone()
				setError('Could not start audio recording on this device.')
				return
			}

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data)
				}
			}
			mediaRecorderRef.current = recorder
			committedRef.current = ''
			interimRef.current = ''
			hasSpeechRef.current = false
			setLiveTranscript('')
			setError(null)
			setConversationStatus('listening')
			lastSpeechAtRef.current = Date.now()
			recorder.start(250)

			const data = new Uint8Array(analyser.fftSize)
			const pollSilence = () => {
				if (!isActiveRef.current || statusRef.current !== 'listening') {
					void audioContext.close()
					return
				}
				analyser.getByteTimeDomainData(data)
				let sum = 0
				for (let index = 0; index < data.length; index += 1) {
					const value = (data[index]! - 128) / 128
					sum += value * value
				}
				const rms = Math.sqrt(sum / data.length)
				if (rms > SPEECH_RMS_THRESHOLD) {
					hasSpeechRef.current = true
					lastSpeechAtRef.current = Date.now()
				} else if (
					hasSpeechRef.current &&
					Date.now() - lastSpeechAtRef.current > SILENCE_MS
				) {
					void audioContext.close()
					void submitTranscript()
					return
				}
				window.setTimeout(pollSilence, 200)
			}
			pollSilence()
			return
		}

		const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
		if (!SpeechRecognitionCtor) {
			setError('Speech recognition is not supported in this browser.')
			return
		}

		const profile = getSpeechRecognitionProfile()
		if (profile.requireMicrophoneStream) {
			const microphone = await openMicrophoneStream()
			if (!microphone.ok) {
				setError(microphone.message)
				return
			}
			releaseMicrophone()
			micStreamRef.current = microphone.stream
		}

		stopRecognition()
		committedRef.current = ''
		interimRef.current = ''
		setLiveTranscript('')
		setError(null)
		setConversationStatus('listening')
		lastSpeechAtRef.current = Date.now()

		const recognition = new SpeechRecognitionCtor()
		recognition.continuous = true
		recognition.interimResults = true
		recognition.lang = navigator.language || 'en-US'

		recognition.onresult = (event: SpeechRecognitionEvent) => {
			let interim = ''
			for (let index = event.resultIndex; index < event.results.length; index += 1) {
				const result = event.results[index]
				const spoken = result[0]?.transcript ?? ''
				if (result.isFinal) {
					committedRef.current = `${committedRef.current} ${spoken}`.trim()
					lastSpeechAtRef.current = Date.now()
				} else {
					interim = `${interim} ${spoken}`.trim()
					lastSpeechAtRef.current = Date.now()
				}
			}
			interimRef.current = interim
			setLiveTranscript(`${committedRef.current} ${interim}`.trim())
			scheduleSilenceSubmit()
		}

		recognition.onerror = () => {
			setError('Speech recognition error. End the conversation and try again.')
		}

		recognitionRef.current = recognition
		recognition.start()
	}, [
		releaseMicrophone,
		scheduleSilenceSubmit,
		stopRecognition,
		setConversationStatus,
		submitTranscript,
		useRecorder,
	])

	beginListeningRef.current = beginListening

	const startConversation = useCallback(async () => {
		isActiveRef.current = true
		isMutedRef.current = false
		setIsActive(true)
		setIsMuted(false)
		setError(null)
		setConversationStatus('listening')
		await beginListening()
	}, [beginListening, setConversationStatus])

	const endConversation = useCallback(async () => {
		isActiveRef.current = false
		isMutedRef.current = false
		setIsActive(false)
		clearSilenceTimer()
		stopRecognition()
		await stopRecorder()
		releaseMicrophone()
		onStopSpeaking()
		setConversationStatus('idle')
		setLiveTranscript('')
		committedRef.current = ''
		interimRef.current = ''
		hasSpeechRef.current = false
	}, [
		clearSilenceTimer,
		onStopSpeaking,
		releaseMicrophone,
		setConversationStatus,
		stopRecognition,
		stopRecorder,
	])

	const resumeListening = useCallback(async () => {
		if (!isActiveRef.current) {
			return
		}
		setConversationStatus('listening')
		await beginListening()
	}, [beginListening, setConversationStatus])

	const finishSpeaking = useCallback(() => {
		if (
			!isActiveRef.current ||
			isMutedRef.current ||
			statusRef.current !== 'listening'
		) {
			return
		}

		void submitTranscript()
	}, [submitTranscript])

	const interruptSpeaking = useCallback(() => {
		onStopSpeaking()
		void resumeListening()
	}, [onStopSpeaking, resumeListening])

	const toggleMute = useCallback(() => {
		setIsMuted((current) => {
			const next = !current
			isMutedRef.current = next
			if (next) {
				clearSilenceTimer()
				stopRecognition()
				void stopRecorder()
				releaseMicrophone()
			} else if (isActiveRef.current) {
				void beginListening()
			}
			return next
		})
	}, [beginListening, clearSilenceTimer, releaseMicrophone, stopRecognition, stopRecorder])

	return {
		isActive,
		isMuted,
		status,
		liveTranscript,
		error,
		startConversation,
		endConversation,
		finishSpeaking,
		interruptSpeaking,
		toggleMute,
		resumeListening,
		setStatus: setConversationStatus,
		clearError: () => setError(null),
	}
}
