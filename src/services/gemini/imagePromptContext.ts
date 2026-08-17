import type { IntentMessageContext } from '@/services/gemini/intent'
import { getConfiguredUserName } from '@/services/gemini/systemInstruction'
import { listMemoryEntries } from '@/services/memory/memoryService'
import type { MemoryEntry, UserPreferences } from '@/storage/types'

const MAX_IMAGE_PROFILE_CHARS = 6_000

const PERSONALIZED_IMAGE_PATTERNS: RegExp[] = [
	/\b(?:picture|image|photo|portrait|illustration|drawing|artwork|character|render)\s+of\s+me\b/i,
	/\b(?:picture|image|photo|portrait|illustration|drawing|artwork|character|render)\s+of\s+myself\b/i,
	/\bof\s+myself\b/i,
	/\bwhat you know about me\b/i,
	/\blook like me\b/i,
	/\bmy likeness\b/i,
	/\bmy appearance\b/i,
	/\bdepict(?:ing)?\s+me\b/i,
	/\bme\s+as\s+(?:a|an)\b/i,
	/\bas\s+me\b/i,
	/\b(?:version|likeness|portrait)\s+of\s+me\b/i,
	/\b(?:female|femme|woman|male|masculine|feminine)\s+version\b/i,
	/\bnot (?:a\s+)?(?:man|guy|male|beard)/i,
	/\b(?:i am|i'm)\s+(?:a\s+)?(?:trans\s+)?woman\b/i,
]

const APPEARANCE_KEYWORDS =
	/\b(woman|man|female|male|trans|femme|feminine|masculine|hair|eyes|skin|tall|short|age|years old|ft|cm|build|style|wearing|dress|look|beard|face)\b/i

const IDENTITY_KEYWORDS =
	/\b(name|identity|gender|pronoun|she|her|he|him|they|trans|woman|man|girl|boy)\b/i

function formatMessageForContext(message: IntentMessageContext): string {
	const roleLabel = message.role === 'user' ? 'User' : 'Assistant'
	const mediaSummary =
		message.mediaTypes && message.mediaTypes.length > 0
			? ` [${message.mediaTypes.join(', ')}]`
			: ''
	return `${roleLabel}: ${message.content}${mediaSummary}`
}

function isMemoryRelevantForLikeness(entry: MemoryEntry): boolean {
	return (
		APPEARANCE_KEYWORDS.test(entry.content) ||
		IDENTITY_KEYWORDS.test(entry.content) ||
		entry.category === 'preference'
	)
}

function buildMemoryProfileLines(entries: MemoryEntry[]): string[] {
	const relevant = entries.filter(isMemoryRelevantForLikeness)
	const pool = relevant.length > 0 ? relevant : entries
	const sorted = [...pool].sort((a, b) => a.createdAt - b.createdAt)

	return sorted.map((entry) => `- ${entry.content}`)
}

export function needsImageUserContext(prompt: string): boolean {
	const trimmed = prompt.trim()
	return PERSONALIZED_IMAGE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

export async function enrichImagePromptWithUserContext(
	prompt: string,
	preferences: UserPreferences,
	recentMessages: IntentMessageContext[] = [],
): Promise<string> {
	if (!needsImageUserContext(prompt)) {
		return prompt
	}

	const userName = getConfiguredUserName(preferences)
	const memoryEntries = await listMemoryEntries()
	const memoryLines = buildMemoryProfileLines(memoryEntries)

	const profileSections = [`Name: ${userName}`]

	if (memoryLines.length > 0) {
		profileSections.push(
			'Known facts about the user (authoritative for likeness and identity):',
			...memoryLines,
		)
	}

	if (recentMessages.length > 0) {
		const conversationLines = recentMessages.map(formatMessageForContext).join('\n')
		profileSections.push('Recent conversation (for corrections and style follow-ups):', conversationLines)
	}

	const profile = profileSections.join('\n').slice(0, MAX_IMAGE_PROFILE_CHARS)

	return [
		'Subject profile for personalized image generation:',
		profile,
		'',
		'Instructions:',
		'- When the request refers to "me", "myself", or the user\'s likeness, depict the subject profile above — not a generic stock character.',
		'- Honor stated gender, identity, and appearance details. Do not default to a bearded male warrior or other stereotype when the profile describes a woman or trans woman.',
		'- Apply any correction in the recent conversation (e.g. "female version", "not a man").',
		'',
		`Image request: ${prompt}`,
	].join('\n')
}
