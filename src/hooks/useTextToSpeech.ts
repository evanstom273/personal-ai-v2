import { useCallback, useEffect, useRef, useState } from 'react'
import { synthesizeSpeechWithGemini } from '@/services/gemini/synthesizeSpeech'
import { streamSpeechWithGemini } from '@/services/gemini/streamingTtsService'
import { normalizeTtsVoiceName } from '@/services/gemini/ttsVoices'
import type { TtsReadAloudMode, UserPreferences } from '@/storage/types'
import { getActiveGeminiApiKey } from '@/storage/geminiApiKeys'
import { PcmStreamPlayer } from '@/utils/pcmStreamPlayer'
import { prepareTextForSpeech } from '@/utils/speechText'

export type TtsPlaybackStatus = 'idle' | 'loading' | 'playing'

export interface SpeakAssistantMessageOptions {
	messageId: string
	text: string
	onEnded?: () => void
	onError?: (error: Error) => void
	suppressErrorState?: boolean
}

interface UseTextToSpeechOptions {
	preferences: UserPreferences
}

interface CachedSpeech {
	dataUrl: string
}

export function shouldAutoPlayAssistantSpeech(
	mode: TtsReadAloudMode,
	inputMethod: 'typed' | 'speech',
): boolean {
	if (mode === 'always') {
		return true
	}

	if (mode === 'after_speech') {
		return inputMethod === 'speech'
	}

	return false
}

function dataUrlToBlob(dataUrl: string): Blob {
	const commaIndex = dataUrl.indexOf(',')
	if (commaIndex === -1) {
		throw new Error('Invalid speech audio data.')
	}

	const header = dataUrl.slice(0, commaIndex)
	const base64 = dataUrl.slice(commaIndex + 1)
	const mimeType = header.match(/^data:([^;,]+)/)?.[1] ?? 'audio/wav'
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}

	return new Blob([bytes], { type: mimeType })
}

export function useTextToSpeech({ preferences }: UseTextToSpeechOptions) {
	const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
	const [status, setStatus] = useState<TtsPlaybackStatus>('idle')
	const [error, setError] = useState<string | null>(null)

	const audioRef = useRef<HTMLAudioElement | null>(null)
	const objectUrlRef = useRef<string | null>(null)
	const cacheRef = useRef<Map<string, CachedSpeech>>(new Map())
	const requestIdRef = useRef(0)
	const pcmPlayerRef = useRef<PcmStreamPlayer | null>(null)
	const abortControllerRef = useRef<AbortController | null>(null)
	const onEndedRef = useRef<(() => void) | null>(null)

	const revokeObjectUrl = useCallback(() => {
		if (objectUrlRef.current) {
			URL.revokeObjectURL(objectUrlRef.current)
			objectUrlRef.current = null
		}
	}, [])

	const stopPcmPlayback = useCallback(() => {
		abortControllerRef.current?.abort()
		abortControllerRef.current = null
		pcmPlayerRef.current?.stop()
		pcmPlayerRef.current = null
	}, [])

	const stopPlayback = useCallback(() => {
		const audio = audioRef.current
		if (audio) {
			audio.pause()
			audio.currentTime = 0
			audio.onended = null
			audio.onerror = null
		}
		revokeObjectUrl()
		stopPcmPlayback()
	}, [revokeObjectUrl, stopPcmPlayback])

	const stop = useCallback(() => {
		requestIdRef.current += 1
		stopPlayback()
		setActiveMessageId(null)
		setStatus('idle')
		onEndedRef.current = null
	}, [stopPlayback])

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const buildCacheKey = useCallback(
		(messageId: string, speechText: string) => {
			const voiceName = normalizeTtsVoiceName(preferences.ttsVoiceName)
			return `${messageId}:${voiceName}:${speechText}`
		},
		[preferences.ttsVoiceName],
	)

	const finishPlayback = useCallback(
		(requestId: number) => {
			if (requestId !== requestIdRef.current) {
				return
			}
			const onEnded = onEndedRef.current
			onEndedRef.current = null
			setActiveMessageId(null)
			setStatus('idle')
			onEnded?.()
		},
		[],
	)

	const playDataUrl = useCallback(
		async (messageId: string, dataUrl: string, requestId: number) => {
			stopPlayback()

			const blob = dataUrlToBlob(dataUrl)
			if (requestId !== requestIdRef.current) {
				return
			}

			const objectUrl = URL.createObjectURL(blob)
			objectUrlRef.current = objectUrl

			const audio = audioRef.current ?? new Audio()
			audioRef.current = audio
			audio.preload = 'auto'
			audio.setAttribute('playsinline', 'true')
			audio.src = objectUrl

			await new Promise<void>((resolve, reject) => {
				const handleReady = () => {
					cleanup()
					resolve()
				}
				const handleFailure = () => {
					cleanup()
					reject(new Error('Could not decode speech audio.'))
				}
				const cleanup = () => {
					audio.removeEventListener('canplaythrough', handleReady)
					audio.removeEventListener('error', handleFailure)
				}

				audio.addEventListener('canplaythrough', handleReady, { once: true })
				audio.addEventListener('error', handleFailure, { once: true })
				audio.load()
			})

			if (requestId !== requestIdRef.current) {
				return
			}

			audio.onended = () => {
				finishPlayback(requestId)
			}
			audio.onerror = () => {
				if (requestId !== requestIdRef.current) {
					return
				}
				setError('Could not play speech audio.')
				finishPlayback(requestId)
			}

			setActiveMessageId(messageId)
			setStatus('playing')

			try {
				await audio.play()
			} catch (playError) {
				if (requestId !== requestIdRef.current) {
					return
				}
				finishPlayback(requestId)
				const message =
					playError instanceof Error && playError.name === 'NotAllowedError'
						? 'Speech playback was blocked by the browser. Tap Listen again to start audio.'
						: 'Could not start speech playback.'
				setError(message)
			}
		},
		[finishPlayback, stopPlayback],
	)

	const playStreamingSpeech = useCallback(
		async (
			messageId: string,
			speechText: string,
			requestId: number,
		): Promise<void> => {
			stopPlayback()

			const abortController = new AbortController()
			abortControllerRef.current = abortController

			const player = new PcmStreamPlayer(24000)
			pcmPlayerRef.current = player
			player.setOnPlaybackEnded(() => {
				finishPlayback(requestId)
			})
			await player.start()

			if (requestId !== requestIdRef.current) {
				return
			}

			setActiveMessageId(messageId)
			setStatus('playing')

			let receivedAudio = false
			await streamSpeechWithGemini({
				apiKey: getActiveGeminiApiKey(preferences),
				text: speechText,
				voiceName: normalizeTtsVoiceName(preferences.ttsVoiceName),
				preferences,
				signal: abortController.signal,
				onAudioChunk: (base64) => {
					if (requestId !== requestIdRef.current) {
						return
					}
					receivedAudio = true
					player.enqueuePcmBase64(base64)
				},
			})

			if (requestId !== requestIdRef.current) {
				return
			}

			if (!receivedAudio) {
				throw new Error('Speech generation returned no audio.')
			}

			player.markStreamComplete()
		},
		[finishPlayback, preferences, stopPlayback],
	)

	const speakAssistantMessage = useCallback(
		async ({
			messageId,
			text,
			onEnded,
			onError,
			suppressErrorState = false,
		}: SpeakAssistantMessageOptions) => {
			const apiKey = getActiveGeminiApiKey(preferences).trim()
			if (!apiKey) {
				const message = 'Add your Gemini API key in Settings to use text-to-speech.'
				if (!suppressErrorState) {
					setError(message)
				}
				onError?.(new Error(message))
				return
			}

			const speechText = prepareTextForSpeech(text)
			if (!speechText) {
				const message = 'There is no readable text to speak in this message.'
				if (!suppressErrorState) {
					setError(message)
				}
				onError?.(new Error(message))
				onEnded?.()
				return
			}

			if (activeMessageId === messageId && status === 'playing') {
				stop()
				return
			}

			stopPlayback()
			onEndedRef.current = onEnded ?? null

			const requestId = requestIdRef.current + 1
			requestIdRef.current = requestId
			if (!suppressErrorState) {
				setError(null)
			}
			setActiveMessageId(messageId)
			setStatus('loading')

			const cacheKey = buildCacheKey(messageId, speechText)
			const cached = cacheRef.current.get(cacheKey)?.dataUrl

			try {
				if (cached) {
					await playDataUrl(messageId, cached, requestId)
					return
				}

				try {
					await playStreamingSpeech(messageId, speechText, requestId)
				} catch (streamError) {
					if (requestId !== requestIdRef.current) {
						return
					}
					if (
						streamError instanceof DOMException &&
						streamError.name === 'AbortError'
					) {
						return
					}

					if (pcmPlayerRef.current?.hasQueuedAudio()) {
						pcmPlayerRef.current.markStreamComplete()
						return
					}

					const synthesized = await synthesizeSpeechWithGemini({
						apiKey,
						text: speechText,
						voiceName: normalizeTtsVoiceName(preferences.ttsVoiceName),
						preferences,
					})
					if (requestId !== requestIdRef.current) {
						return
					}
					cacheRef.current.set(cacheKey, { dataUrl: synthesized.dataUrl })
					await playDataUrl(messageId, synthesized.dataUrl, requestId)
				}
			} catch (speechError) {
				if (requestId !== requestIdRef.current) {
					return
				}
				finishPlayback(requestId)
				const errorInstance =
					speechError instanceof Error
						? speechError
						: new Error('Speech generation failed.')
				if (!suppressErrorState) {
					setError(errorInstance.message)
				}
				onError?.(errorInstance)
			}
		},
		[
			activeMessageId,
			buildCacheKey,
			finishPlayback,
			playDataUrl,
			playStreamingSpeech,
			preferences,
			status,
			stop,
			stopPlayback,
		],
	)

	const previewVoice = useCallback(
		async (voiceName: string) => {
			const apiKey = getActiveGeminiApiKey(preferences).trim()
			if (!apiKey) {
				setError('Add your Gemini API key in Settings to preview voices.')
				return
			}

			stopPlayback()

			const requestId = requestIdRef.current + 1
			requestIdRef.current = requestId
			setError(null)
			setActiveMessageId(null)
			setStatus('loading')

			try {
				const sampleText =
					'Hello! This is a short preview of how replies will sound when read aloud.'
				await playStreamingSpeech('voice-preview', sampleText, requestId)
			} catch (speechError) {
				if (requestId !== requestIdRef.current) {
					return
				}
				try {
					const synthesized = await synthesizeSpeechWithGemini({
						apiKey,
						text: 'Hello! This is a short preview of how replies will sound when read aloud.',
						voiceName: normalizeTtsVoiceName(voiceName),
						preferences: {
							...preferences,
							ttsVoiceName: normalizeTtsVoiceName(voiceName),
						},
					})
					if (requestId !== requestIdRef.current) {
						return
					}
					await playDataUrl('voice-preview', synthesized.dataUrl, requestId)
				} catch (fallbackError) {
					finishPlayback(requestId)
					setError(
						fallbackError instanceof Error
							? fallbackError.message
							: 'Voice preview failed.',
					)
				}
			}
		},
		[finishPlayback, playDataUrl, playStreamingSpeech, preferences, stopPlayback],
	)

	useEffect(() => {
		return () => {
			requestIdRef.current += 1
			stopPlayback()
			cacheRef.current.clear()
		}
	}, [stopPlayback])

	return {
		activeMessageId,
		status,
		error,
		speakAssistantMessage,
		previewVoice,
		stop,
		clearError,
	}
}
