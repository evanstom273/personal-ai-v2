import type { GenerationIntent } from '@/services/gemini/constants'
import {
	getModelIdForIntent,
	type GenerationModelPreferences,
} from '@/services/gemini/modelPreferences'

export interface ResolvedPrompt {
	modelId: string
	prompt: string
	intent: 'chat' | GenerationIntent
}

export interface IntentMessageContext {
	role: 'user' | 'assistant'
	content: string
	mediaTypes?: Array<'image' | 'audio'>
}

interface IntentPattern {
	intent: GenerationIntent
	regex: RegExp
}

const INTENT_PATTERNS: IntentPattern[] = [
	{
		intent: 'image',
		regex:
			/^generate\s+(?:an?\s+)?image\s+(?:of|for|showing|about)\s+([\s\S]+)$/i,
	},
	{
		intent: 'image',
		regex: /^generate\s+(?:an?\s+)?image(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'image',
		regex:
			/^generate\s+(?:a\s+)?picture\s+(?:of|for|showing|about)\s+([\s\S]+)$/i,
	},
	{
		intent: 'image',
		regex: /^generate\s+(?:a\s+)?picture(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'image',
		regex:
			/^(?:create|make|draw|render|design)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration|artwork)\s+(?:of|for|showing|about)\s+([\s\S]+)$/i,
	},
	{
		intent: 'image',
		regex:
			/^(?:create|make|draw|render|design)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration|artwork)(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'image',
		regex:
			/^(?:can you|could you|please)\s+(?:generate|create|make|draw)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration|artwork)\s*(?:of|for|showing|about)?\s*([\s\S]*)$/i,
	},
	{
		intent: 'music',
		regex:
			/^generate\s+(?:an?\s+)?(?:music|song|track)\s+(?:about|for|called|of)\s+([\s\S]+)$/i,
	},
	{
		intent: 'music',
		regex: /^generate\s+(?:an?\s+)?(?:music|song|track)(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'music',
		regex:
			/^(?:create|make|compose)\s+(?:me\s+)?(?:an?\s+)?(?:music|song|track)(?:[:\s,-]+([\s\S]*))?$/i,
	},
	{
		intent: 'music',
		regex:
			/^generate\s+the\s+(?:music|song|track|sample)(?:[:\s,.-]+([\s\S]*))?$/i,
	},
	{
		intent: 'music',
		regex:
			/^(?:let'?s|lets)\s+(?:do|make|create)\s+(?:an?\s+)?(?:instrumental|acoustic)(?:[:\s,-]+([\s\S]*))?$/i,
	},
]

const CONVERSATIONAL_INTENT_PATTERNS: IntentPattern[] = [
	{
		intent: 'music',
		regex:
			/\bwhat about (?:an?\s+)?(?:music|song|track|instrumental|soundtrack|beat)\b/i,
	},
	{
		intent: 'music',
		regex:
			/\bhow about (?:an?\s+)?(?:music|song|track|instrumental|soundtrack|beat)\b/i,
	},
	{
		intent: 'music',
		regex:
			/\b(?:matching|similar|complementing|corresponding)\s+(?:\d+\s*(?:second|sec|minute|min)[-\s]*)?(?:instrumental|music|track|song|soundtrack)\b/i,
	},
	{
		intent: 'music',
		regex:
			/\b(?:a\s+)?\d+\s*(?:second|sec|minute|min)[-\s]*(?:instrumental|music|track|song)\b/i,
	},
	{
		intent: 'music',
		regex:
			/\b(?:also|now)\s+(?:some\s+)?(?:music|a song|a track|an instrumental)\b/i,
	},
	{
		intent: 'music',
		regex:
			/\b(?:let'?s|lets)\s+(?:do|make|create)\s+[\s\S]*\b(?:instrumental|acoustic)\b[\s\S]*\b(?:song|track|music|sample)\b/i,
	},
	{
		intent: 'music',
		regex: /\b\d+\s*(?:s|sec(?:onds?)?)\s*sample\b/i,
	},
	{
		intent: 'image',
		regex:
			/\bwhat about (?:an?\s+)?(?:image|picture|photo|illustration|artwork|poster|scene|cityscape|portrait|visual|drawing)\b/i,
	},
	{
		intent: 'image',
		regex:
			/\bhow about (?:an?\s+)?(?:image|picture|photo|illustration|artwork|poster|scene|cityscape|portrait|visual|drawing)\b/i,
	},
	{
		intent: 'image',
		regex:
			/\b(?:matching|similar|complementing|corresponding)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork|poster|scene|cityscape|portrait|visual|drawing)\b/i,
	},
	{
		intent: 'image',
		regex:
			/\b(?:also|now)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork|poster|scene|cityscape|portrait)\b/i,
	},
	{
		intent: 'image',
		regex:
			/\b(?:an?\s+)?(?:image|picture|photo|illustration|artwork|poster)\s+of\s+(?:it|that|this|them)\b/i,
	},
	{
		intent: 'image',
		regex:
			/\b(?:can you|could you)\s+(?:also\s+)?(?:generate|create|make|draw|render|design)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture|photo|illustration|artwork)\b/i,
	},
]

const CONTEXTUAL_FOLLOW_UP_PATTERNS: RegExp[] = [
	/\bwhat about\b/i,
	/\bhow about\b/i,
	/\bmatching\b/i,
	/\bsimilar\b/i,
	/\bcomplementing\b/i,
	/\bcorresponding\b/i,
	/\bto go with\b/i,
	/\bfor that\b/i,
	/\bfor it\b/i,
	/\b(?:also|now)\s+(?:some\s+)?(?:music|an?\s+(?:image|picture|photo|track|song|instrumental))\b/i,
	/\b(?:image|picture|photo|illustration)\s+of\s+(?:it|that|this|them)\b/i,
	/\b(?:same|that)\s+(?:style|vibe|look|aesthetic)\b/i,
	/\bgenerate\s+(?:the\s+)?(?:music|song|track|sample)\b/i,
	/\b(?:go ahead|make that|make the)\b[\s\S]{0,40}\b(?:track|song|music|sample)\b/i,
]

function resolveGenerationPrompt(
	trimmed: string,
	detail: string | undefined,
): string {
	const normalizedDetail = detail?.trim()
	return normalizedDetail && normalizedDetail.length > 0 ? normalizedDetail : trimmed
}

function needsConversationContext(trimmed: string): boolean {
	return CONTEXTUAL_FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(trimmed))
}

function shouldEnrichMusicPrompt(trimmed: string): boolean {
	if (needsConversationContext(trimmed)) {
		return true
	}

	return /\b(?:sample|that track|that song|the music|the track|the song|instrumental)\b/i.test(
		trimmed,
	)
}

function shouldEnrichImagePrompt(trimmed: string): boolean {
	if (needsConversationContext(trimmed)) {
		return true
	}

	return /\b(?:female|femme|woman|male|masculine|feminine|version|likeness|portrait|try again|wrong|not (?:right|me)|actually|instead|beard|myself|of me)\b/i.test(
		trimmed,
	)
}

function formatMediaSummary(
	mediaTypes: IntentMessageContext['mediaTypes'],
): string {
	if (!mediaTypes || mediaTypes.length === 0) {
		return ''
	}

	const labels = mediaTypes.map((type) =>
		type === 'image' ? 'generated image' : 'generated music',
	)

	return ` [${labels.join(', ')}]`
}

function formatMessageForContext(message: IntentMessageContext): string {
	const roleLabel = message.role === 'user' ? 'User' : 'Assistant'
	const mediaSummary = formatMediaSummary(message.mediaTypes)
	return `${roleLabel}: ${message.content}${mediaSummary}`
}

export function enrichPromptWithConversationContext(
	prompt: string,
	recentMessages: IntentMessageContext[],
): string {
	if (recentMessages.length === 0 || !needsConversationContext(prompt.trim())) {
		return prompt
	}

	const contextLines = recentMessages.map(formatMessageForContext).join('\n')

	return `Conversation context:\n${contextLines}\n\nCurrent request: ${prompt}`
}

function detectConversationalIntent(trimmed: string): GenerationIntent | null {
	for (const { intent, regex } of CONVERSATIONAL_INTENT_PATTERNS) {
		if (regex.test(trimmed)) {
			return intent
		}
	}
	return null
}

function finalizeGenerationPrompt(
	prompt: string,
	recentMessages: IntentMessageContext[],
	shouldEnrich: boolean,
): string {
	if (!shouldEnrich) {
		return prompt
	}
	return enrichPromptWithConversationContext(prompt, recentMessages)
}

export function resolvePromptIntent(
	text: string,
	models: GenerationModelPreferences,
	forcedIntent?: GenerationIntent | null,
	recentMessages: IntentMessageContext[] = [],
): ResolvedPrompt {
	const trimmed = text.trim()

	if (forcedIntent) {
		return {
			intent: forcedIntent,
			modelId: getModelIdForIntent(forcedIntent, models),
			prompt: finalizeGenerationPrompt(
				trimmed,
				recentMessages,
				forcedIntent === 'music'
					? shouldEnrichMusicPrompt(trimmed)
					: forcedIntent === 'image'
						? shouldEnrichImagePrompt(trimmed)
						: true,
			),
		}
	}

	for (const { intent, regex } of INTENT_PATTERNS) {
		const match = trimmed.match(regex)
		if (match) {
			const prompt = resolveGenerationPrompt(trimmed, match[1])
			return {
				intent,
				modelId: getModelIdForIntent(intent, models),
				prompt: finalizeGenerationPrompt(
					prompt,
					recentMessages,
					intent === 'music'
						? shouldEnrichMusicPrompt(trimmed)
						: intent === 'image'
							? shouldEnrichImagePrompt(trimmed)
							: needsConversationContext(trimmed),
				),
			}
		}
	}

	const conversationalIntent = detectConversationalIntent(trimmed)
	if (conversationalIntent) {
		return {
			intent: conversationalIntent,
			modelId: getModelIdForIntent(conversationalIntent, models),
			prompt: finalizeGenerationPrompt(
				trimmed,
				recentMessages,
				conversationalIntent === 'music'
					? shouldEnrichMusicPrompt(trimmed)
					: shouldEnrichImagePrompt(trimmed),
			),
		}
	}

	return {
		intent: 'chat',
		modelId: getModelIdForIntent('chat', models),
		prompt: trimmed,
	}
}

export function getIntentLabel(intent: ResolvedPrompt['intent']): string {
	switch (intent) {
		case 'chat':
			return 'Chat'
		case 'image':
			return 'Image generation'
		case 'music':
			return 'Music generation'
	}
}
