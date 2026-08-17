export const MAIN_CONVERSATION_ID = 'main'

export const CHAT_MODEL_IDS = [
	'gemini-3.6-flash',
	'gemini-3.5-flash-lite',
	'gemini-3.1-flash-lite',
	'gemini-3.1-pro-preview',
	'gemma-4-31b-it',
] as const

export type ChatModelId = (typeof CHAT_MODEL_IDS)[number]

export const IMAGE_MODEL_IDS = [
	'gemini-3-pro-image',
	'gemini-3.1-flash-image',
	'gemini-3.1-flash-lite-image',
] as const

export const MUSIC_MODEL_IDS = [
	'lyria-3-pro-preview',
	'lyria-3-clip-preview',
] as const

export const DEFAULT_IMAGE_MODEL_ID = 'gemini-3.1-flash-image'
export const DEFAULT_MUSIC_MODEL_ID = 'lyria-3-clip-preview'

/** Flash model for transcription, memory archival, and other background tasks on paid keys. */
export const ECONOMY_MODEL_ID = 'gemini-3.6-flash'

/** When chat uses a Flash-Lite model, background tasks use the same id (separate free-tier RPD). */
export const FLASH_LITE_CHAT_MODEL_IDS = [
	'gemini-3.5-flash-lite',
	'gemini-3.1-flash-lite',
] as const

export type FlashLiteChatModelId = (typeof FLASH_LITE_CHAT_MODEL_IDS)[number]

export function resolveEconomyModelId(chatModelId: string): string {
	if ((FLASH_LITE_CHAT_MODEL_IDS as readonly string[]).includes(chatModelId)) {
		return chatModelId
	}

	return ECONOMY_MODEL_ID
}

export const MAX_CHAT_HISTORY_MESSAGES = 40
export const MAX_TOOL_ITERATIONS = 5
export const MAX_CHAT_OUTPUT_TOKENS = 8192
export const MAX_MEMORY_ARCHIVE_OUTPUT_TOKENS = 4096

export type GenerationIntent = 'image' | 'music'
