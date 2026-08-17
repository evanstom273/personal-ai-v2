import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeAudioWithGemini } from '@/services/gemini/transcribeAudio'
import {
	getAndroidSpeechHelpMessage,
	getRecorderSpeechHint,
	getSpeechRecognitionConstructor,
	getSpeechRecognitionErrorMessage,
	getSpeechRecognitionProfile,
	isAndroidDevice,
	isVoiceInputSupported,
	openMicrophoneStream,
	releaseMicrophoneStream,
	shouldUseRecorderTranscription,
} from '@/utils/speechRecognition'

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'transcribing' | 'review'

interface UseSpeechRecognitionOptions {
	onTranscriptChange?: (transcript: string) => void
	geminiApiKey?: string
	transcriptionModelId?: string
}

interface UseSpeechRecognitionResult {
	isSupported: boolean
	status: SpeechRecognitionStatus
	transcript: string
	error: string | null
	hint: string | null
	startListening: (baseText?: string) => Promise<void>
	continueListening: () => Promise<string>
	cancelListening: () => void
}

export function useSpeechRecognition(
	options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionResult {
	const { onTranscriptChange, geminiApiKey = '', transcriptionModelId = '' } =
		options
	const useRecorder = shouldUseRecorderTranscription()
	const profile = getSpeechRecognitionProfile()
	const [isSupported] = useState(isVoiceInputSupported)
	const [status, setStatus] = useState<SpeechRecognitionStatus>('idle')
	const [transcript, setTranscript] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [hint, setHint] = useState<string | null>(null)

	const recognitionRef = useRef<SpeechRecognition | null>(null)
	const micStreamRef = useRef<MediaStream | null>(null)
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioChunksRef = useRef<Blob[]>([])
	const committedRef = useRef('')
	const baseTextRef = useRef('')
	const statusRef = useRef<SpeechRecognitionStatus>('idle')
	const restartTimeoutRef = useRef<number | null>(null)
	const silentRestartCountRef = useRef(0)
	const sessionHadResultRef = useRef(false)
	const sessionHadAudioRef = useRef(false)

	statusRef.current = status

	const updateTranscript = useCallback(
		(next: string) => {
			setTranscript(next)
			onTranscriptChange?.(next)
		},
		[onTranscriptChange],
	)

	const clearRestartTimeout = useCallback(() => {
		if (restartTimeoutRef.current !== null) {
			window.clearTimeout(restartTimeoutRef.current)
			restartTimeoutRef.current = null
		}
	}, [])

	const releaseMicrophone = useCallback(() => {
		releaseMicrophoneStream(micStreamRef.current)
		micStreamRef.current = null
	}, [])

	const stopRecognition = useCallback(() => {
		clearRestartTimeout()
		const active = recognitionRef.current
		recognitionRef.current = null
		if (active) {
			try {
				active.abort()
			} catch {
				// ignore abort errors during teardown
			}
		}
	}, [clearRestartTimeout])

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
						? new Blob(chunks, { type: chunks[0]?.type || recorder.mimeType || 'audio/webm' })
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

	const resetSessionState = useCallback(() => {
		silentRestartCountRef.current = 0
		sessionHadResultRef.current = false
		sessionHadAudioRef.current = false
	}, [])

	const cancelListening = useCallback(() => {
		stopRecognition()
		void stopRecorder()
		releaseMicrophone()
		committedRef.current = ''
		baseTextRef.current = ''
		resetSessionState()
		setHint(null)
		setError(null)
		setStatus('idle')
		updateTranscript('')
	}, [releaseMicrophone, resetSessionState, stopRecognition, stopRecorder, updateTranscript])

	const bindRecognition = useCallback(
		(recognition: SpeechRecognition, restart: () => void) => {
			recognition.onstart = () => {
				sessionHadResultRef.current = false
				sessionHadAudioRef.current = false
			}

			recognition.onaudiostart = () => {
				sessionHadAudioRef.current = true
				setHint(null)
			}

			recognition.onresult = (event: SpeechRecognitionEvent) => {
				sessionHadResultRef.current = true
				silentRestartCountRef.current = 0
				setHint(null)

				let interim = ''

				for (let index = event.resultIndex; index < event.results.length; index += 1) {
					const result = event.results[index]
					const spoken = result[0]?.transcript ?? ''

					if (result.isFinal) {
						committedRef.current = joinTranscriptParts(
							committedRef.current,
							spoken,
						)
					} else {
						interim = joinTranscriptParts(interim, spoken)
					}
				}

				updateTranscript(joinTranscriptParts(committedRef.current, interim))
			}

			recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
				if (event.error === 'aborted') {
					return
				}

				if (event.error === 'no-speech' && statusRef.current === 'listening') {
					if (!sessionHadResultRef.current) {
						silentRestartCountRef.current += 1
					}
					if (silentRestartCountRef.current >= profile.maxSilentRestarts) {
						setError(getSpeechRecognitionErrorMessage('no-speech'))
						if (isAndroidDevice()) {
							setHint(getAndroidSpeechHelpMessage())
						}
						setStatus('review')
						stopRecognition()
					}
					return
				}

				setError(
					event.message || getSpeechRecognitionErrorMessage(event.error),
				)
				if (isAndroidDevice()) {
					setHint(getAndroidSpeechHelpMessage())
				}
				setStatus('review')
				stopRecognition()
			}

			recognition.onend = () => {
				if (recognitionRef.current === recognition) {
					recognitionRef.current = null
				}

				if (statusRef.current !== 'listening') {
					return
				}

				if (!sessionHadResultRef.current) {
					silentRestartCountRef.current += 1
				}

				if (silentRestartCountRef.current >= profile.maxSilentRestarts) {
					setError(
						sessionHadAudioRef.current
							? getSpeechRecognitionErrorMessage('no-speech')
							: 'Speech recognition ended before audio was captured.',
					)
					if (isAndroidDevice()) {
						setHint(getAndroidSpeechHelpMessage())
					}
					setStatus('review')
					return
				}

				clearRestartTimeout()
				restartTimeoutRef.current = window.setTimeout(() => {
					if (statusRef.current === 'listening') {
						restart()
					}
				}, profile.restartDelayMs)
			}
		},
		[
			clearRestartTimeout,
			profile.maxSilentRestarts,
			profile.restartDelayMs,
			stopRecognition,
			updateTranscript,
		],
	)

	const startWebSpeechListening = useCallback(
		async (trimmedBase: string) => {
			const SpeechRecognitionCtor = getSpeechRecognitionConstructor()
			if (!SpeechRecognitionCtor) {
				setError('Speech recognition is not supported in this browser.')
				return
			}

			if (profile.requireMicrophoneStream) {
				const microphone = await openMicrophoneStream()
				if (!microphone.ok) {
					setError(microphone.message)
					setStatus('idle')
					return
				}
				releaseMicrophone()
				micStreamRef.current = microphone.stream
			}

			stopRecognition()
			committedRef.current = trimmedBase
			resetSessionState()
			updateTranscript(trimmedBase)
			setError(null)
			setHint(null)
			setStatus('listening')

			const launch = (): void => {
				if (statusRef.current !== 'listening') {
					return
				}

				const recognition = new SpeechRecognitionCtor()
				recognition.continuous = profile.continuous
				recognition.interimResults = profile.interimResults
				recognition.lang = navigator.language || 'en-US'

				bindRecognition(recognition, launch)
				recognitionRef.current = recognition

				try {
					recognition.start()
				} catch (startError) {
					const message =
						startError instanceof Error
							? startError.message
							: 'Could not start speech recognition.'

					if (
						message.includes('InvalidStateError') ||
						message.toLowerCase().includes('already started')
					) {
						clearRestartTimeout()
						restartTimeoutRef.current = window.setTimeout(() => {
							if (statusRef.current === 'listening') {
								launch()
							}
						}, profile.restartDelayMs)
						return
					}

					setError(message)
					setStatus('idle')
					recognitionRef.current = null
					releaseMicrophone()
				}
			}

			launch()
		},
		[
			bindRecognition,
			clearRestartTimeout,
			profile.continuous,
			profile.interimResults,
			profile.requireMicrophoneStream,
			profile.restartDelayMs,
			releaseMicrophone,
			resetSessionState,
			stopRecognition,
			updateTranscript,
		],
	)

	const startRecorderListening = useCallback(
		async (trimmedBase: string) => {
			if (!geminiApiKey.trim()) {
				setError('Add your Gemini API key in Settings to use voice input.')
				setStatus('idle')
				return
			}

			const microphone = await openMicrophoneStream()
			if (!microphone.ok) {
				setError(microphone.message)
				setStatus('idle')
				return
			}

			releaseMicrophone()
			micStreamRef.current = microphone.stream
			audioChunksRef.current = []

			let recorder: MediaRecorder
			try {
				recorder = new MediaRecorder(microphone.stream)
			} catch {
				releaseMicrophone()
				setError('Could not start audio recording on this device.')
				setStatus('idle')
				return
			}

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data)
				}
			}

			mediaRecorderRef.current = recorder
			committedRef.current = trimmedBase
			resetSessionState()
			updateTranscript(trimmedBase)
			setError(null)
			setHint(getRecorderSpeechHint())
			setStatus('listening')

			try {
				recorder.start(250)
			} catch {
				mediaRecorderRef.current = null
				releaseMicrophone()
				setError('Could not start audio recording on this device.')
				setStatus('idle')
			}
		},
		[
			geminiApiKey,
			releaseMicrophone,
			resetSessionState,
			updateTranscript,
		],
	)

	const startListening = useCallback(
		async (baseText = '') => {
			const trimmedBase = baseText.trim()
			baseTextRef.current = trimmedBase

			if (useRecorder) {
				await startRecorderListening(trimmedBase)
				return
			}

			await startWebSpeechListening(trimmedBase)
		},
		[startRecorderListening, startWebSpeechListening, useRecorder],
	)

	const continueListening = useCallback(async (): Promise<string> => {
		if (useRecorder) {
			if (statusRef.current !== 'listening') {
				return transcript
			}

			setStatus('transcribing')
			setHint('Transcribing…')
			setError(null)

			const audioBlob = await stopRecorder()
			releaseMicrophone()

			if (!audioBlob) {
				setError('No audio was recorded. Try speaking again.')
				setHint(null)
				setStatus('review')
				return committedRef.current.trim()
			}

			try {
				const spoken = await transcribeAudioWithGemini(
					geminiApiKey,
					transcriptionModelId,
					audioBlob,
				)
				const merged = joinTranscriptParts(committedRef.current, spoken)
				committedRef.current = merged
				updateTranscript(merged)
				setHint(null)
				setStatus('review')
				return merged
			} catch (transcriptionError) {
				setError(
					transcriptionError instanceof Error
						? transcriptionError.message
						: 'Transcription failed.',
				)
				setHint(getAndroidSpeechHelpMessage())
				setStatus('review')
				return committedRef.current.trim()
			}
		}

		stopRecognition()
		releaseMicrophone()
		setHint(null)
		setStatus('review')
		return committedRef.current.trim()
	}, [
		geminiApiKey,
		releaseMicrophone,
		stopRecognition,
		stopRecorder,
		transcript,
		transcriptionModelId,
		updateTranscript,
		useRecorder,
	])

	useEffect(() => {
		return () => {
			stopRecognition()
			void stopRecorder()
			releaseMicrophone()
		}
	}, [releaseMicrophone, stopRecognition, stopRecorder])

	return {
		isSupported,
		status,
		transcript,
		error,
		hint,
		startListening,
		continueListening,
		cancelListening,
	}
}

function joinTranscriptParts(left: string, right: string): string {
	const trimmedLeft = left.trim()
	const trimmedRight = right.trim()

	if (!trimmedLeft) {
		return trimmedRight
	}

	if (!trimmedRight) {
		return trimmedLeft
	}

	return `${trimmedLeft} ${trimmedRight}`
}
