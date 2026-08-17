import type { GenerationIntent } from '@/services/gemini/constants'
import { resolveEconomyModelId } from '@/services/gemini/constants'
import type { UserPreferences } from '@/storage/types'

export interface GenerationModelPreferences {
	chatModelId: string
	imageModelId: string
	musicModelId: string
}

export function getGenerationModelPreferences(
	preferences: UserPreferences,
): GenerationModelPreferences {
	return {
		chatModelId: preferences.defaultModelId,
		imageModelId: preferences.defaultImageModelId,
		musicModelId: preferences.defaultMusicModelId,
	}
}

export function getModelIdForIntent(
	intent: 'chat' | GenerationIntent,
	models: GenerationModelPreferences,
): string {
	switch (intent) {
		case 'chat':
			return models.chatModelId
		case 'image':
			return models.imageModelId
		case 'music':
			return models.musicModelId
	}
}

export function getTranscriptionModelId(chatModelId: string): string {
	return resolveEconomyModelId(chatModelId)
}

export function getEconomyModelId(chatModelId: string): string {
	return resolveEconomyModelId(chatModelId)
}
