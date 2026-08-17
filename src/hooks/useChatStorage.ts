import { useCallback, useEffect, useState } from 'react'
import { MAIN_CONVERSATION_ID } from '@/services/gemini/constants'
import { getValue, setValue } from '@/storage/storageService'
import {
	DEFAULT_PREFERENCES,
	MEMORY_ARCHIVE_INTERVAL_OPTIONS,
	TTS_READ_ALOUD_MODE_OPTIONS,
	type ConversationRecord,
	type MemoryArchiveInterval,
	type StoredMessage,
	type TtsReadAloudMode,
	type UserPreferences,
} from '@/storage/types'
import { normalizeTtsVoiceName } from '@/services/gemini/ttsVoices'
import {
	getActiveGeminiApiKey,
	getGeminiApiKeyForSlot,
} from '@/storage/geminiApiKeys'

const PREFERENCES_KEY = 'user'

interface StoredPreferences extends Partial<UserPreferences> {
	geminiApiKey?: string
}

function normalizeGeminiApiKeySlot(value: unknown): UserPreferences['activeGeminiApiKeySlot'] {
	return value === 'free' ? 'free' : 'paid'
}

function normalizePreferences(stored: StoredPreferences | undefined): UserPreferences {
	const merged: UserPreferences = {
		...DEFAULT_PREFERENCES,
		...stored,
		memoryArchiveInterval: normalizeMemoryArchiveInterval(
			stored?.memoryArchiveInterval,
		),
		ttsReadAloudMode: normalizeTtsReadAloudMode(stored?.ttsReadAloudMode),
		ttsVoiceName: normalizeTtsVoiceName(stored?.ttsVoiceName),
		activeGeminiApiKeySlot: normalizeGeminiApiKeySlot(stored?.activeGeminiApiKeySlot),
		geminiApiKeyPaid: stored?.geminiApiKeyPaid ?? '',
		geminiApiKeyFree: stored?.geminiApiKeyFree ?? '',
	}

	const legacyKey = stored?.geminiApiKey?.trim() ?? ''
	if (
		legacyKey &&
		!getGeminiApiKeyForSlot(merged, 'paid') &&
		!getGeminiApiKeyForSlot(merged, 'free')
	) {
		merged.geminiApiKeyPaid = legacyKey
	}

	const activeKey = getActiveGeminiApiKey(merged)
	if (!activeKey) {
		if (getGeminiApiKeyForSlot(merged, 'paid')) {
			merged.activeGeminiApiKeySlot = 'paid'
		} else if (getGeminiApiKeyForSlot(merged, 'free')) {
			merged.activeGeminiApiKeySlot = 'free'
		}
	}

	return merged
}

function normalizeMemoryArchiveInterval(value: unknown): MemoryArchiveInterval {
	if (
		typeof value === 'number' &&
		MEMORY_ARCHIVE_INTERVAL_OPTIONS.includes(value as MemoryArchiveInterval)
	) {
		return value as MemoryArchiveInterval
	}

	return DEFAULT_PREFERENCES.memoryArchiveInterval
}

function normalizeTtsReadAloudMode(value: unknown): TtsReadAloudMode {
	if (
		typeof value === 'string' &&
		TTS_READ_ALOUD_MODE_OPTIONS.includes(value as TtsReadAloudMode)
	) {
		return value as TtsReadAloudMode
	}

	return DEFAULT_PREFERENCES.ttsReadAloudMode
}

function normalizeConversation(
	conversation: ConversationRecord,
): ConversationRecord {
	return {
		...conversation,
		memoryArchiveCursor:
			typeof conversation.memoryArchiveCursor === 'number' &&
			conversation.memoryArchiveCursor >= 0
				? conversation.memoryArchiveCursor
				: 0,
	}
}

function createMainConversation(modelId: string): ConversationRecord {
	const now = Date.now()
	return {
		id: MAIN_CONVERSATION_ID,
		title: 'Chat',
		modelId,
		messages: [],
		memoryArchiveCursor: 0,
		createdAt: now,
		updatedAt: now,
	}
}

export function usePreferences() {
	const [preferences, setPreferencesState] =
		useState<UserPreferences>(DEFAULT_PREFERENCES)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		let cancelled = false

		async function load(): Promise<void> {
			const stored = await getValue<UserPreferences>(
				'preferences',
				PREFERENCES_KEY,
			)
			if (!cancelled) {
				setPreferencesState(normalizePreferences(stored))
				setIsLoading(false)
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [])

	const savePreferences = useCallback(
		async (next: UserPreferences): Promise<void> => {
			setPreferencesState(next)
			await setValue('preferences', PREFERENCES_KEY, next)
		},
		[],
	)

	return {
		preferences,
		savePreferences,
		isLoading,
	}
}

export function useMainConversation(defaultModelId: string) {
	const [conversation, setConversation] = useState<ConversationRecord | null>(
		null,
	)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		let cancelled = false

		async function load(): Promise<void> {
			const stored = await getValue<ConversationRecord>(
				'conversations',
				MAIN_CONVERSATION_ID,
			)

			if (!cancelled) {
				setConversation(
					stored
						? normalizeConversation(stored)
						: createMainConversation(defaultModelId),
				)
				setIsLoading(false)
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [defaultModelId])

	const persistConversation = useCallback(
		async (next: ConversationRecord): Promise<void> => {
			const normalized = normalizeConversation(next)
			setConversation(normalized)
			await setValue('conversations', MAIN_CONVERSATION_ID, normalized)
		},
		[],
	)

	const ensureConversation = useCallback(async (): Promise<ConversationRecord> => {
		const stored = await getValue<ConversationRecord>(
			'conversations',
			MAIN_CONVERSATION_ID,
		)
		if (stored) {
			const normalized = normalizeConversation(stored)
			setConversation(normalized)
			return normalized
		}

		const created = createMainConversation(defaultModelId)
		await persistConversation(created)
		return created
	}, [defaultModelId, persistConversation])

	const appendMessages = useCallback(
		async (
			newMessages: StoredMessage[],
			modelId?: string,
		): Promise<ConversationRecord> => {
			const existing = normalizeConversation(
				(await getValue<ConversationRecord>(
					'conversations',
					MAIN_CONVERSATION_ID,
				)) ?? (await ensureConversation()),
			)

			const updated: ConversationRecord = {
				...existing,
				modelId: modelId ?? existing.modelId,
				messages: [...existing.messages, ...newMessages],
				updatedAt: Date.now(),
			}
			await persistConversation(updated)
			return updated
		},
		[ensureConversation, persistConversation],
	)

	const updateMessage = useCallback(
		async (
			messageId: string,
			patch: Partial<StoredMessage>,
		): Promise<ConversationRecord> => {
			const existing = normalizeConversation(
				(await getValue<ConversationRecord>(
					'conversations',
					MAIN_CONVERSATION_ID,
				)) ?? (await ensureConversation()),
			)

			const updated: ConversationRecord = {
				...existing,
				messages: existing.messages.map((message) =>
					message.id === messageId ? { ...message, ...patch } : message,
				),
				updatedAt: Date.now(),
			}
			await persistConversation(updated)
			return updated
		},
		[ensureConversation, persistConversation],
	)

	const truncateMessagesFrom = useCallback(
		async (messageId: string): Promise<ConversationRecord> => {
			const existing = normalizeConversation(
				(await getValue<ConversationRecord>(
					'conversations',
					MAIN_CONVERSATION_ID,
				)) ?? (await ensureConversation()),
			)

			const messageIndex = existing.messages.findIndex(
				(message) => message.id === messageId,
			)
			if (messageIndex === -1) {
				throw new Error('Message not found.')
			}

			const updated: ConversationRecord = {
				...existing,
				messages: existing.messages.slice(0, messageIndex),
				memoryArchiveCursor: Math.min(
					existing.memoryArchiveCursor,
					messageIndex,
				),
				updatedAt: Date.now(),
			}
			await persistConversation(updated)
			return updated
		},
		[ensureConversation, persistConversation],
	)

	const clearConversation = useCallback(async (): Promise<ConversationRecord> => {
		const existing = normalizeConversation(
			(await getValue<ConversationRecord>(
				'conversations',
				MAIN_CONVERSATION_ID,
			)) ?? (await ensureConversation()),
		)

		const cleared: ConversationRecord = {
			...existing,
			messages: [],
			memoryArchiveCursor: 0,
			updatedAt: Date.now(),
		}
		await persistConversation(cleared)
		return cleared
	}, [ensureConversation, persistConversation])

	const replaceConversation = useCallback(
		async (next: ConversationRecord): Promise<ConversationRecord> => {
			const replaced: ConversationRecord = normalizeConversation({
				...next,
				id: MAIN_CONVERSATION_ID,
				memoryArchiveCursor: 0,
				updatedAt: Date.now(),
			})
			await persistConversation(replaced)
			return replaced
		},
		[persistConversation],
	)

	return {
		conversation,
		isLoading,
		appendMessages,
		updateMessage,
		truncateMessagesFrom,
		ensureConversation,
		clearConversation,
		replaceConversation,
		saveConversation: persistConversation,
	}
}
