import { geminiFetch, toDataUrl } from '@/services/gemini/client'
import {
	applyImageGenerationRequestBody,
	applySafetySettingsToRequestBody,
} from '@/services/gemini/safetySettings'
import type { MessageMedia } from '@/storage/types'

export interface ChatMessageInput {
	role: 'user' | 'assistant'
	content: string
	media?: MessageMedia[]
	createdAt?: number
}

interface GenerateContentResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{
				text?: string
				inlineData?: {
					mimeType: string
					data: string
				}
			}>
		}
		finishReason?: string
	}>
	promptFeedback?: {
		blockReason?: string
	}
}

function buildChatParts(message: ChatMessageInput): Array<{
	text?: string
	inlineData?: { mimeType: string; data: string }
}> {
	const parts: Array<{
		text?: string
		inlineData?: { mimeType: string; data: string }
	}> = []

	if (message.content.trim()) {
		parts.push({ text: message.content })
	}

	for (const item of message.media ?? []) {
		if (item.type !== 'image') {
			continue
		}

		const base64 = item.dataUrl.split(',')[1]
		if (!base64) {
			continue
		}

		parts.push({
			inlineData: {
				mimeType: item.mimeType,
				data: base64,
			},
		})
	}

	if (parts.length === 0) {
		parts.push({ text: message.content || ' ' })
	}

	return parts
}

export async function generateChatResponse(
	apiKey: string,
	modelId: string,
	messages: ChatMessageInput[],
	allowMatureContent = true,
): Promise<{ text: string; media: MessageMedia[] }> {
	const response = await geminiFetch<GenerateContentResponse>(
		apiKey,
		`/models/${modelId}:generateContent`,
		{
			method: 'POST',
			body: JSON.stringify(
				applySafetySettingsToRequestBody(
					{
						contents: messages.map((message) => ({
							role: message.role === 'assistant' ? 'model' : 'user',
							parts: buildChatParts(message),
						})),
					},
					allowMatureContent,
				),
			),
		},
	)

	return parseContentResponse(response)
}

export async function generateImage(
	apiKey: string,
	modelId: string,
	prompt: string,
	allowMatureContent = true,
): Promise<{ text: string; media: MessageMedia[] }> {
	const trimmedPrompt = prompt.trim()
	const imagePrompt = /\b(generate|create|make|draw|render)\b/i.test(trimmedPrompt)
		? trimmedPrompt
		: `Generate an image: ${trimmedPrompt}`

	const response = await geminiFetch<GenerateContentResponse>(
		apiKey,
		`/models/${modelId}:generateContent`,
		{
			method: 'POST',
			body: JSON.stringify(
				applyImageGenerationRequestBody(
					{
						contents: [
							{
								role: 'user',
								parts: [{ text: imagePrompt }],
							},
						],
						generationConfig: {
							responseModalities: ['TEXT', 'IMAGE'],
						},
					},
					allowMatureContent,
				),
			),
		},
	)

	const parsed = parseContentResponse(response)

	if (parsed.media.length === 0) {
		const finishReason = response.candidates?.[0]?.finishReason
		const blockReason = response.promptFeedback?.blockReason
		const detail = blockReason
			? `Blocked by Gemini: ${blockReason}. Illegal content (e.g. CSAM) is always blocked; some mature prompts may still be rejected.`
			: finishReason
				? `Finish reason: ${finishReason}.`
				: 'The image model returned text only.'

		throw new Error(
			`Image generation did not return a file. ${detail} Confirm your image model in the + menu and check Settings → Allow mature content.`,
		)
	}

	return parsed
}

export async function generateMusic(
	apiKey: string,
	modelId: string,
	prompt: string,
	allowMatureContent = true,
): Promise<{ text: string; media: MessageMedia[] }> {
	const response = await geminiFetch<GenerateContentResponse>(
		apiKey,
		`/models/${modelId}:generateContent`,
		{
			method: 'POST',
			body: JSON.stringify(
				applySafetySettingsToRequestBody(
					{
						contents: [
							{
								role: 'user',
								parts: [{ text: prompt }],
							},
						],
						generationConfig: {
							responseModalities: ['TEXT', 'AUDIO'],
						},
					},
					allowMatureContent,
				),
			),
		},
	)

	return parseContentResponse(response)
}

function parseContentResponse(response: GenerateContentResponse): {
	text: string
	media: MessageMedia[]
} {
	const parts = response.candidates?.[0]?.content?.parts ?? []
	const textParts: string[] = []
	const media: MessageMedia[] = []

	for (const part of parts) {
		if (part.text) {
			textParts.push(part.text)
		}

		if (part.inlineData) {
			const mimeType = part.inlineData.mimeType
			const dataUrl = toDataUrl(mimeType, part.inlineData.data)

			if (mimeType.startsWith('image/')) {
				media.push({ type: 'image', mimeType, dataUrl })
			} else if (mimeType.startsWith('audio/')) {
				media.push({ type: 'audio', mimeType, dataUrl })
			}
		}
	}

	return {
		text: textParts.join('\n').trim() || 'Generation completed.',
		media,
	}
}
