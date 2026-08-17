import { geminiFetch } from '@/services/gemini/client'
import {
	MAX_MEMORY_ARCHIVE_OUTPUT_TOKENS,
	resolveEconomyModelId,
} from '@/services/gemini/constants'
import { applySafetySettingsToRequestBody } from '@/services/gemini/safetySettings'
import { getConfiguredUserName } from '@/services/gemini/systemInstruction'
import {
	addMemoryEntries,
	isMemoryCategory,
	listMemoryEntries,
} from '@/services/memory/memoryService'
import type {
	ConversationRecord,
	MemoryCategory,
	StoredMessage,
	UserPreferences,
} from '@/storage/types'
import { formatMessageDateTime } from '@/utils/dateTime'

interface ExtractedMemoryItem {
	content: string
	category: MemoryCategory
}

interface GenerateContentResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>
		}
	}>
}

let archiveInProgress = false
let archiveQueued = false

function formatMessagesForArchive(messages: StoredMessage[]): string {
	return messages
		.map((message) => {
			const speaker = message.role === 'user' ? 'User' : 'Assistant'
			return `[${formatMessageDateTime(message.createdAt)}] ${speaker}: ${message.content.trim()}`
		})
		.join('\n\n')
}

function parseExtractedMemory(text: string): ExtractedMemoryItem[] {
	const trimmed = text.trim()
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
	const jsonText = fenced?.[1]?.trim() ?? trimmed

	try {
		const parsed = JSON.parse(jsonText) as unknown
		if (!Array.isArray(parsed)) {
			return []
		}

		const items: ExtractedMemoryItem[] = []
		for (const item of parsed) {
			if (!item || typeof item !== 'object') {
				continue
			}

			const record = item as Record<string, unknown>
			const content =
				typeof record.content === 'string' ? record.content.trim() : ''
			const categoryValue =
				typeof record.category === 'string' ? record.category : 'other'

			if (!content) {
				continue
			}

			items.push({
				content,
				category: isMemoryCategory(categoryValue) ? categoryValue : 'other',
			})
		}

		return items
	} catch {
		return []
	}
}

async function extractMemoryFromBatch(
	apiKey: string,
	modelId: string,
	messages: StoredMessage[],
	preferences: UserPreferences,
): Promise<ExtractedMemoryItem[]> {
	const existing = await listMemoryEntries()
	const userName = getConfiguredUserName(preferences)
	const existingSummary =
		existing.length > 0
			? existing
					.slice(0, 80)
					.map((entry) => `- [${entry.category}] ${entry.content}`)
					.join('\n')
			: 'None yet.'

	const prompt = [
		'You are a memory archivist for a personal AI assistant.',
		`The user's name is ${userName}.`,
		'Read the conversation segment below and extract durable facts worth remembering long-term.',
		'Focus on preferences, identity, ongoing projects, decisions, constraints, and recurring context.',
		'Skip greetings, filler, transient tasks, and details already captured in existing memory.',
		'Return ONLY a JSON array. Each item: { "content": string, "category": "preference"|"fact"|"project"|"decision"|"other" }.',
		'If nothing is worth saving, return [].',
		'',
		'Existing memory (avoid duplicates):',
		existingSummary,
		'',
		'Conversation segment:',
		formatMessagesForArchive(messages),
	].join('\n')

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
							temperature: 0.2,
							maxOutputTokens: MAX_MEMORY_ARCHIVE_OUTPUT_TOKENS,
						},
					},
					preferences.allowMatureContent ?? true,
				),
			),
		},
	)

	const text =
		response.candidates?.[0]?.content?.parts
			?.map((part) => part.text ?? '')
			.join('\n')
			.trim() ?? ''

	return parseExtractedMemory(text)
}

export function getUnarchivedMessages(
	conversation: ConversationRecord,
): StoredMessage[] {
	const cursor = conversation.memoryArchiveCursor ?? 0
	return conversation.messages.slice(cursor)
}

export async function archiveConversationIfNeeded(
	apiKey: string,
	conversation: ConversationRecord,
	preferences: UserPreferences,
): Promise<ConversationRecord> {
	if (archiveInProgress) {
		archiveQueued = true
		return conversation
	}

	archiveInProgress = true
	let nextConversation = conversation
	const economyModelId = resolveEconomyModelId(preferences.defaultModelId)

	try {
		do {
			archiveQueued = false
			const interval = preferences.memoryArchiveInterval
			const cursor = nextConversation.memoryArchiveCursor ?? 0
			const unarchived = nextConversation.messages.slice(cursor)

			if (unarchived.length < interval) {
				break
			}

			const batch = unarchived.slice(0, interval)
			const extracted = await extractMemoryFromBatch(
				apiKey,
				economyModelId,
				batch,
				preferences,
			)

			if (extracted.length > 0) {
				await addMemoryEntries(
					extracted.map((item) => ({
						content: item.content,
						category: item.category,
						archivedFromMessageCount: cursor + batch.length,
					})),
				)
			}

			nextConversation = {
				...nextConversation,
				memoryArchiveCursor: cursor + batch.length,
				updatedAt: Date.now(),
			}
		} while (
			archiveQueued ||
			nextConversation.messages.length -
				(nextConversation.memoryArchiveCursor ?? 0) >=
				preferences.memoryArchiveInterval
		)
	} finally {
		archiveInProgress = false
	}

	return nextConversation
}

export interface ManualMemoryArchiveResult {
	batchesProcessed: number
	messagesArchived: number
	memoriesAdded: number
	remainingUnarchived: number
}

export async function runManualMemoryArchive(
	apiKey: string,
	conversation: ConversationRecord,
	preferences: UserPreferences,
): Promise<{
	conversation: ConversationRecord
	result: ManualMemoryArchiveResult
}> {
	if (archiveInProgress) {
		throw new Error('Memory archival is already in progress.')
	}

	if (!apiKey.trim()) {
		throw new Error('Add a Gemini API key in Settings → API to archive memory.')
	}

	archiveInProgress = true
	let nextConversation = conversation
	let batchesProcessed = 0
	let messagesArchived = 0
	let memoriesAdded = 0
	const economyModelId = resolveEconomyModelId(preferences.defaultModelId)

	try {
		const interval = Math.max(1, preferences.memoryArchiveInterval)

		while (true) {
			const cursor = nextConversation.memoryArchiveCursor ?? 0
			const unarchived = nextConversation.messages.slice(cursor)

			if (unarchived.length === 0) {
				break
			}

			const batchSize =
				unarchived.length >= interval ? interval : unarchived.length
			const batch = unarchived.slice(0, batchSize)
			const extracted = await extractMemoryFromBatch(
				apiKey,
				economyModelId,
				batch,
				preferences,
			)

			if (extracted.length > 0) {
				const added = await addMemoryEntries(
					extracted.map((item) => ({
						content: item.content,
						category: item.category,
						archivedFromMessageCount: cursor + batch.length,
					})),
				)
				memoriesAdded += added.length
			}

			messagesArchived += batch.length
			batchesProcessed += 1
			nextConversation = {
				...nextConversation,
				memoryArchiveCursor: cursor + batch.length,
				updatedAt: Date.now(),
			}
		}
	} finally {
		archiveInProgress = false
	}

	const remainingUnarchived =
		nextConversation.messages.length -
		(nextConversation.memoryArchiveCursor ?? 0)

	return {
		conversation: nextConversation,
		result: {
			batchesProcessed,
			messagesArchived,
			memoriesAdded,
			remainingUnarchived,
		},
	}
}

export function queueMemoryArchive(
	apiKey: string,
	conversation: ConversationRecord,
	preferences: UserPreferences,
	onPersist: (next: ConversationRecord) => Promise<void>,
	onError?: (error: Error) => void,
): void {
	void (async () => {
		try {
			const updated = await archiveConversationIfNeeded(
				apiKey,
				conversation,
				preferences,
			)

			if (
				updated.memoryArchiveCursor !==
				(conversation.memoryArchiveCursor ?? 0)
			) {
				await onPersist(updated)
			}
		} catch (error) {
			const normalized =
				error instanceof Error ? error : new Error('Memory archival failed.')
			console.error('Memory archival failed:', normalized)
			onError?.(normalized)
		}
	})()
}
