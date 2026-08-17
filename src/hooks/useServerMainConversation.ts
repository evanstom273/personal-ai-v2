import { useCallback, useEffect, useRef, useState } from 'react'
import { MAIN_CONVERSATION_ID } from '@/services/gemini/constants'
import {
	checkServerHealth,
	createMessage,
	createSession,
	deleteMessage,
	deleteSession,
	fetchSessions,
	loadCachedPersonalaiHost,
	updateMessage,
	updateSession,
} from '@/services/personalaiApi'
import type { ChatMessage, ChatSession } from '@/types/serverChat'
import type { ConversationRecord, StoredMessage } from '@/storage/types'

const MAIN_SESSION_KEY = 'personal_ai_main_session_id'

function toStoredMessage(message: ChatMessage): StoredMessage {
	const media =
		message.fileAttachments
			?.filter((file) => file.kind === 'image')
			.map((file) => ({
				type: 'image' as const,
				mimeType: file.type,
				dataUrl: file.content.startsWith('data:')
					? file.content
					: `data:${file.type};base64,${file.content}`,
			})) ?? undefined

	return {
		id: message.id,
		role: message.role === 'assistant' ? 'assistant' : 'user',
		content: message.content,
		media: media && media.length > 0 ? media : undefined,
		createdAt: message.timestamp,
	}
}

function toConversationRecord(session: ChatSession): ConversationRecord {
	return {
		id: MAIN_CONVERSATION_ID,
		title: session.title,
		modelId: session.model,
		messages: session.messages.map(toStoredMessage),
		memoryArchiveCursor: 0,
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
	}
}

function readMainSessionId(): string | null {
	return localStorage.getItem(MAIN_SESSION_KEY)
}

function writeMainSessionId(sessionId: string): void {
	localStorage.setItem(MAIN_SESSION_KEY, sessionId)
}

export function useServerMainConversation(defaultModelId: string) {
	const [conversation, setConversation] = useState<ConversationRecord | null>(null)
	const conversationRef = useRef<ConversationRecord | null>(null)
	const defaultModelIdRef = useRef(defaultModelId)
	const [isLoading, setIsLoading] = useState(true)
	const [serverOnline, setServerOnline] = useState(false)
	const [sessionId, setSessionId] = useState<string | null>(null)

	const host = loadCachedPersonalaiHost()
	defaultModelIdRef.current = defaultModelId

	const syncConversation = useCallback((next: ConversationRecord | null) => {
		conversationRef.current = next
		setConversation(next)
	}, [])

	const loadConversation = useCallback(async (): Promise<void> => {
		setIsLoading(true)
		const health = await checkServerHealth(host)
		if (!health.ok) {
			setServerOnline(false)
			syncConversation(null)
			setSessionId(null)
			setIsLoading(false)
			return
		}

		setServerOnline(true)
		const sessions = await fetchSessions(host)
		const storedId = readMainSessionId()
		let session =
			sessions.find((item) => item.id === storedId) ??
			sessions[0] ??
			null

		if (!session) {
			session = await createSession(host, {
				title: 'Chat',
				model: defaultModelIdRef.current,
			})
		}

		writeMainSessionId(session.id)
		setSessionId(session.id)
		syncConversation(toConversationRecord(session))
		setIsLoading(false)
	}, [host, syncConversation])

	useEffect(() => {
		void loadConversation()
	}, [loadConversation])

	const persistSession = useCallback(
		async (next: ConversationRecord): Promise<void> => {
			if (!sessionId) return
			syncConversation(next)
			await updateSession(host, sessionId, {
				title: next.title,
				model: next.modelId,
			})
		},
		[host, sessionId, syncConversation],
	)

	const ensureConversation = useCallback(async (): Promise<ConversationRecord> => {
		if (conversationRef.current) return conversationRef.current
		await loadConversation()
		if (conversationRef.current) return conversationRef.current
		throw new Error('PersonalAI server is offline')
	}, [loadConversation])

	const appendMessages = useCallback(
		async (
			newMessages: StoredMessage[],
			modelId?: string,
		): Promise<ConversationRecord> => {
			if (!sessionId) throw new Error('No active chat session')

			let existing = conversationRef.current
			if (!existing) {
				const sessions = await fetchSessions(host)
				const session = sessions.find((item) => item.id === sessionId)
				if (!session) throw new Error('Session not found')
				existing = toConversationRecord(session)
			}

			for (const message of newMessages) {
				const fileAttachments =
					message.media?.map((item) => ({
						name: item.type,
						size: 0,
						content: item.dataUrl,
						type: item.mimeType,
						kind: 'image' as const,
					})) ?? undefined

				await createMessage(host, sessionId, {
					id: message.id,
					role: message.role,
					content: message.content,
					streamStatus: 'complete',
					fileAttachments,
				})
			}

			if (modelId && modelId !== existing.modelId) {
				await updateSession(host, sessionId, { model: modelId })
			}

			const updated: ConversationRecord = {
				...existing,
				modelId: modelId ?? existing.modelId,
				messages: [...existing.messages, ...newMessages],
				updatedAt: Date.now(),
			}
			syncConversation(updated)
			return updated
		},
		[host, sessionId, syncConversation],
	)

	const updateMessageInSession = useCallback(
		async (
			messageId: string,
			patch: Partial<StoredMessage>,
		): Promise<ConversationRecord> => {
			const current = conversationRef.current
			if (!current) throw new Error('No conversation loaded')

			await updateMessage(host, messageId, {
				content: patch.content,
				streamStatus: 'complete',
			})

			const updated: ConversationRecord = {
				...current,
				messages: current.messages.map((message) =>
					message.id === messageId ? { ...message, ...patch } : message,
				),
				updatedAt: Date.now(),
			}
			syncConversation(updated)
			return updated
		},
		[host, syncConversation],
	)

	const truncateMessagesFrom = useCallback(
		async (messageId: string): Promise<ConversationRecord> => {
			const current = conversationRef.current
			if (!current || !sessionId) throw new Error('No conversation loaded')

			const messageIndex = current.messages.findIndex(
				(message) => message.id === messageId,
			)
			if (messageIndex === -1) throw new Error('Message not found.')

			const toRemove = current.messages.slice(messageIndex)
			for (const message of toRemove) {
				await deleteMessage(host, message.id)
			}

			const updated: ConversationRecord = {
				...current,
				messages: current.messages.slice(0, messageIndex),
				memoryArchiveCursor: Math.min(
					current.memoryArchiveCursor,
					messageIndex,
				),
				updatedAt: Date.now(),
			}
			syncConversation(updated)
			return updated
		},
		[host, sessionId, syncConversation],
	)

	const clearConversation = useCallback(async (): Promise<ConversationRecord> => {
		const current = conversationRef.current
		if (!current || !sessionId) throw new Error('No conversation loaded')

		for (const message of current.messages) {
			await deleteMessage(host, message.id)
		}

		const cleared: ConversationRecord = {
			...current,
			messages: [],
			memoryArchiveCursor: 0,
			updatedAt: Date.now(),
		}
		syncConversation(cleared)
		return cleared
	}, [host, sessionId, syncConversation])

	const replaceConversation = useCallback(
		async (next: ConversationRecord): Promise<ConversationRecord> => {
			if (!sessionId) throw new Error('No active session')

			for (const message of conversationRef.current?.messages ?? []) {
				await deleteMessage(host, message.id)
			}

			for (const message of next.messages) {
				await createMessage(host, sessionId, {
					id: message.id,
					role: message.role,
					content: message.content,
					streamStatus: 'complete',
				})
			}

			const replaced: ConversationRecord = {
				...next,
				id: MAIN_CONVERSATION_ID,
				memoryArchiveCursor: 0,
				updatedAt: Date.now(),
			}
			syncConversation(replaced)
			await updateSession(host, sessionId, {
				title: replaced.title,
				model: replaced.modelId,
			})
			return replaced
		},
		[host, sessionId, syncConversation],
	)

	const deleteMainSession = useCallback(async (): Promise<void> => {
		if (!sessionId) return
		await deleteSession(host, sessionId)
		localStorage.removeItem(MAIN_SESSION_KEY)
		setSessionId(null)
		syncConversation(null)
	}, [host, sessionId, syncConversation])

	const setActiveModel = useCallback(
		async (modelId: string): Promise<void> => {
			const current = conversationRef.current
			if (!sessionId || !current) return
			await updateSession(host, sessionId, { model: modelId })
			syncConversation({
				...current,
				modelId,
				updatedAt: Date.now(),
			})
		},
		[host, sessionId, syncConversation],
	)

	return {
		conversation,
		isLoading,
		serverOnline,
		sessionId,
		appendMessages,
		updateMessage: updateMessageInSession,
		truncateMessagesFrom,
		ensureConversation,
		clearConversation,
		replaceConversation,
		saveConversation: persistSession,
		reloadConversation: loadConversation,
		deleteMainSession,
		setActiveModel,
	}
}
