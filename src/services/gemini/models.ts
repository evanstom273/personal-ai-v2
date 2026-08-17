export type ModelCategory = 'chat' | 'image' | 'music'

export interface GeminiModelDefinition {
	id: string
	name: string
	description: string
	category: ModelCategory
}

export const GEMINI_MODELS: GeminiModelDefinition[] = [
	{
		id: 'gemini-3.6-flash',
		name: 'Gemini 3.6 Flash',
		description: 'Fast, frontier-level intelligence for chat and agents',
		category: 'chat',
	},
	{
		id: 'gemini-3.5-flash-lite',
		name: 'Gemini 3.5 Flash Lite',
		description: 'Free-tier friendly — high TPM; swap to 3.1 Flash Lite if you hit daily limits',
		category: 'chat',
	},
	{
		id: 'gemini-3.1-flash-lite',
		name: 'Gemini 3.1 Flash Lite',
		description: 'Free-tier friendly — separate daily quota from 3.5 Flash Lite',
		category: 'chat',
	},
	{
		id: 'gemini-3.1-pro-preview',
		name: 'Gemini 3.1 Pro',
		description: 'Advanced reasoning and complex problem solving',
		category: 'chat',
	},
	{
		id: 'gemma-4-31b-it',
		name: 'Gemma 4 31B',
		description: 'Free on Gemini API — fast, capable chat at Tier 2 quota',
		category: 'chat',
	},
	{
		id: 'gemini-3-pro-image',
		name: 'Nano Banana Pro',
		description: 'High-fidelity image generation and editing',
		category: 'image',
	},
	{
		id: 'gemini-3.1-flash-image',
		name: 'Nano Banana 2',
		description: 'Fast, production-scale image generation',
		category: 'image',
	},
	{
		id: 'gemini-3.1-flash-lite-image',
		name: 'Nano Banana 2 Lite',
		description: 'Ultra-low latency image generation',
		category: 'image',
	},
	{
		id: 'lyria-3-pro-preview',
		name: 'Lyria 3 Pro',
		description: 'Full-length music generation',
		category: 'music',
	},
	{
		id: 'lyria-3-clip-preview',
		name: 'Lyria 3 Clip',
		description: 'Short musical clips up to 30 seconds',
		category: 'music',
	},
]

const modelMap = new Map(GEMINI_MODELS.map((model) => [model.id, model]))

export function getModelById(id: string): GeminiModelDefinition | undefined {
	return modelMap.get(id)
}

export function getModelsByCategory(
	category: ModelCategory,
): GeminiModelDefinition[] {
	return GEMINI_MODELS.filter((model) => model.category === category)
}

export const MODEL_CATEGORY_LABELS: Record<ModelCategory, string> = {
	chat: 'Chat',
	image: 'Image',
	music: 'Music',
}
