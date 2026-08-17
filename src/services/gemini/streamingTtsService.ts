import { GeminiApiError } from '@/services/gemini/client'
import { buildTtsPrompt } from '@/services/gemini/synthesizeSpeech'
import { DEFAULT_TTS_MODEL_ID } from '@/services/gemini/ttsVoices'
import type { UserPreferences } from '@/storage/types'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const MAX_TTS_RETRIES = 2
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

export interface StreamTtsOptions {
	apiKey: string
	text: string
	voiceName: string
	preferences: UserPreferences
	modelId?: string
	signal?: AbortSignal
	onAudioChunk: (base64Pcm: string, mimeType: string) => void
}

interface StreamInlinePart {
	inlineData?: {
		mimeType: string
		data: string
	}
}

interface StreamCandidate {
	content?: {
		parts?: StreamInlinePart[]
	}
}

function isRetryableError(error: unknown): boolean {
	if (error instanceof GeminiApiError) {
		return RETRYABLE_STATUSES.has(error.status)
	}
	return false
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms)
	})
}

async function streamTtsOnce(options: StreamTtsOptions): Promise<void> {
	const modelId = options.modelId?.trim() || DEFAULT_TTS_MODEL_ID
	const prompt = buildTtsPrompt(options.preferences, options.text.trim())
	const url = `${GEMINI_API_BASE}/models/${modelId}:streamGenerateContent?alt=sse&key=${encodeURIComponent(options.apiKey)}`

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			contents: [{ parts: [{ text: prompt }] }],
			generationConfig: {
				responseModalities: ['AUDIO'],
				speechConfig: {
					voiceConfig: {
						prebuiltVoiceConfig: {
							voiceName: options.voiceName,
						},
					},
				},
			},
		}),
		signal: options.signal,
	})

	if (!response.ok) {
		let message = `Gemini TTS request failed (${response.status})`
		try {
			const body = (await response.json()) as {
				error?: { message?: string }
			}
			if (body.error?.message) {
				message = body.error.message
			}
		} catch {
			// ignore parse errors
		}
		throw new GeminiApiError(message, response.status)
	}

	if (!response.body) {
		throw new GeminiApiError('Streaming TTS response had no body', 500)
	}

	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''
	let receivedAudio = false

	while (true) {
		const { done, value } = await reader.read()
		if (done) {
			break
		}

		buffer += decoder.decode(value, { stream: true })

		while (true) {
			const lineEnd = buffer.indexOf('\n')
			if (lineEnd < 0) {
				break
			}

			const line = buffer.slice(0, lineEnd).trim()
			buffer = buffer.slice(lineEnd + 1)

			if (!line.startsWith('data:')) {
				continue
			}

			const payload = line.slice(5).trim()
			if (!payload || payload === '[DONE]') {
				continue
			}

			let parsed: { candidates?: StreamCandidate[] }
			try {
				parsed = JSON.parse(payload) as { candidates?: StreamCandidate[] }
			} catch {
				continue
			}

			for (const part of parsed.candidates?.[0]?.content?.parts ?? []) {
				if (!part.inlineData?.data) {
					continue
				}
				receivedAudio = true
				options.onAudioChunk(
					part.inlineData.data,
					part.inlineData.mimeType || 'audio/pcm;rate=24000',
				)
			}
		}
	}

	if (!receivedAudio) {
		throw new Error('Speech generation returned no audio.')
	}
}

export async function streamSpeechWithGemini(
	options: StreamTtsOptions,
): Promise<{ receivedAudio: boolean }> {
	let lastError: unknown

	for (let attempt = 0; attempt <= MAX_TTS_RETRIES; attempt += 1) {
		if (options.signal?.aborted) {
			throw new DOMException('Speech synthesis aborted', 'AbortError')
		}

		try {
			await streamTtsOnce(options)
			return { receivedAudio: true }
		} catch (error) {
			lastError = error
			if (
				options.signal?.aborted ||
				attempt >= MAX_TTS_RETRIES ||
				!isRetryableError(error)
			) {
				throw error
			}
			await sleep(400 * (attempt + 1))
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error('Speech generation failed.')
}
