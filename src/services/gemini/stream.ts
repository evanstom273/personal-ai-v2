import { GeminiApiError } from '@/services/gemini/client'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

interface StreamPart {
	text?: string
	thought?: boolean
	thoughtSignature?: string
	functionCall?: {
		name: string
		args?: Record<string, unknown>
	}
}

interface StreamCandidate {
	content?: {
		role?: string
		parts?: StreamPart[]
	}
	groundingMetadata?: Record<string, unknown>
}

export interface StreamedGenerateResult {
	role?: string
	parts: StreamPart[]
	groundingMetadata?: Record<string, unknown>
}

export async function geminiStreamGenerateContent(
	apiKey: string,
	modelId: string,
	requestBody: Record<string, unknown>,
	options?: {
		signal?: AbortSignal
		onTextDelta?: (delta: string) => void
		onThoughtDelta?: (delta: string) => void
	},
): Promise<StreamedGenerateResult> {
	const url = `${GEMINI_API_BASE}/models/${modelId}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
		signal: options?.signal,
	})

	if (!response.ok) {
		let message = `Gemini API request failed (${response.status})`
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
		throw new GeminiApiError('Streaming response had no body', 500)
	}

	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''
	let role: string | undefined
	let accumulatedText = ''
	const functionCallParts: StreamPart[] = []
	let groundingMetadata: Record<string, unknown> | undefined

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

			const candidate = parsed.candidates?.[0]
			if (!candidate) {
				continue
			}

			if (candidate.groundingMetadata) {
				groundingMetadata = candidate.groundingMetadata
			}

			const content = candidate.content
			if (content?.role) {
				role = content.role
			}

			for (const part of content?.parts ?? []) {
				if (part.text) {
					if (part.thought) {
						options?.onThoughtDelta?.(part.text)
					} else {
						accumulatedText += part.text
						options?.onTextDelta?.(part.text)
					}
				}

				if (part.functionCall?.name) {
					functionCallParts.push(part)
				}
			}
		}
	}

	const parts: StreamPart[] = []
	if (accumulatedText) {
		parts.push({ text: accumulatedText })
	}
	parts.push(...functionCallParts)

	return {
		role,
		parts,
		groundingMetadata,
	}
}
