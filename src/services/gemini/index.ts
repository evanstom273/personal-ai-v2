import {
	generateChatResponse,
	generateImage,
	generateMusic,
	type ChatMessageInput,
} from '@/services/gemini/generate'
import { getModelById } from '@/services/gemini/models'
import type { MessageMedia } from '@/storage/types'

export interface GenerationResult {
	text: string
	media: MessageMedia[]
}

export async function runModelGeneration(
	apiKey: string,
	modelId: string,
	prompt: string,
	history: ChatMessageInput[],
	allowMatureContent = true,
): Promise<GenerationResult> {
	const model = getModelById(modelId)
	if (!model) {
		throw new Error(`Unknown model: ${modelId}`)
	}

	switch (model.category) {
		case 'chat':
			return generateChatResponse(
				apiKey,
				modelId,
				[...history, { role: 'user', content: prompt }],
				allowMatureContent,
			)
		case 'image':
			return generateImage(apiKey, modelId, prompt, allowMatureContent)
		case 'music':
			return generateMusic(apiKey, modelId, prompt, allowMatureContent)
		default: {
			const exhaustiveCheck: never = model.category
			throw new Error(`Unsupported model category: ${exhaustiveCheck}`)
		}
	}
}
