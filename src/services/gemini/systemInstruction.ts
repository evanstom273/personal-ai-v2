import type { UserPreferences } from '@/storage/types'
import { formatCurrentDateTimeContext } from '@/utils/dateTime'

const DEFAULT_AI_NAME = 'Assistant'
const DEFAULT_USER_NAME = 'the user'

export function getConfiguredAiName(preferences: UserPreferences): string {
	return preferences.aiName.trim() || DEFAULT_AI_NAME
}

export function getConfiguredUserName(preferences: UserPreferences): string {
	return preferences.userName.trim() || DEFAULT_USER_NAME
}

export function buildPersonalityInstruction(preferences: UserPreferences): string {
	const aiName = getConfiguredAiName(preferences)
	const userName = getConfiguredUserName(preferences)
	const behavior = preferences.aiBehaviorInstructions.trim()

	const sections = [
		'# Identity and response style (HIGHEST PRIORITY)',
		'',
		`You are **${aiName}**, speaking with **${userName}**. Stay in this role in every reply — your name, tone, voice, and personality must be visible in how you write, not only in what you say.`,
		`Current date and time: ${formatCurrentDateTimeContext()}.`,
	]

	if (behavior) {
		sections.push(
			'',
			'## How you must respond (user-defined)',
			'',
			'The user set these behavior instructions in Settings. They override default assistant habits and generic "helpful assistant" tone. Follow them visibly in tone, length, formality, humor, vocabulary, and format:',
			'',
			behavior,
		)
	} else {
		sections.push(
			'',
			'## Default response style',
			'',
			'Be helpful, clear, and accurate. Match the user\'s tone when appropriate.',
		)
	}

	if (preferences.allowMatureContent ?? true) {
		sections.push(
			'',
			'## Language and mature content',
			'',
			'- The user is an adult. Match their tone, including profanity and strong language when they use it or ask for it.',
			'- Do not sanitize their messages, refuse casual swearing, or lecture about language unless they ask.',
			'- You may swear and discuss mature themes when it fits the conversation. Avoid a filtered or corporate tone.',
			'- Image and music generation use the same relaxed safety settings when mature content is allowed. Illegal content is still blocked by Google.',
		)
	}

	return sections.join('\n')
}

export function buildOperationalCapabilitiesInstruction(): string {
	return [
		'# Application reference (secondary — never override identity or behavior above)',
		'',
		'- One continuous conversation. Image and music use separate models; the app routes natural requests automatically.',
		'- Video generation is not supported — offer image or music instead.',
		'- Do not ask the user to use magic keywords. Plain conversational language is enough.',
		'- Documents, projects, reminders, and long-term memory are available via tools and injected reference sections below.',
		'- Document catalog entries are previews only — use read_document for full text before editing.',
		'- Projects are kanban boards (todo / doing / done) separate from documents.',
		'- Reminders and schedules live in the app; use reminder tools to manage them.',
		'- Use message timestamps for temporal reasoning. Format replies with markdown when helpful.',
		'- @mentioned documents in chat are injected for that message; use document tools to read, create, update, or rename library documents.',
	].join('\n')
}

export function buildPersonalityReminder(preferences: UserPreferences): string {
	const aiName = getConfiguredAiName(preferences)
	const userName = getConfiguredUserName(preferences)
	const behavior = preferences.aiBehaviorInstructions.trim()

	const lines = [
		'# Before you reply',
		'',
		`Respond as **${aiName}** to **${userName}**.`,
	]

	if (behavior) {
		lines.push(
			'Make the user\'s behavior instructions obvious in this reply — tone, length, and style should match what they configured, not a generic assistant.',
		)
	} else {
		lines.push('Stay helpful and match the user\'s tone when appropriate.')
	}

	return lines.join('\n')
}

export function buildSystemInstruction(preferences: UserPreferences): string {
	return [
		buildPersonalityInstruction(preferences),
		buildOperationalCapabilitiesInstruction(),
	].join('\n\n')
}
