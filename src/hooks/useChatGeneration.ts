import { useCallback, useEffect, useRef, useState } from 'react'
import {
	DEFAULT_SETTINGS,
} from '@/services/ollamaService'
import { generateOllamaChatWithTools } from '@/services/ollamaChatWithTools'
import {
	fetchServerSettings,
	loadCachedPersonalaiHost,
	saveServerSettings,
} from '@/services/personalaiApi'
import type { ChatSettings } from '@/types/serverChat'
import type { ConversationRecord, StoredMessage, UserPreferences } from '@/storage/types'
import type { ChatInputMethod, ChatSubmitPayload } from '@/types/chat'
import type { ChatMessage } from '@/types/serverChat'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import {
	notifyGenerationComplete,
	requestNotificationPermission,
} from '@/utils/notifications'
import type { ChatGenerationActivity } from '@/utils/chatActivityLabels'

interface UseOllamaChatGenerationOptions {
	preferences: UserPreferences
	conversation: ConversationRecord | null
	appendMessages: (
		newMessages: StoredMessage[],
		modelId?: string,
	) => Promise<ConversationRecord>
	truncateMessagesFrom: (messageId: string) => Promise<ConversationRecord>
	ensureConversation: () => Promise<ConversationRecord>
	saveConversation: (next: ConversationRecord) => Promise<void>
	isChatRoute: boolean
	serverOnline: boolean
	onAssistantReply?: (payload: {
		message: StoredMessage
		inputMethod: ChatInputMethod
	}) => void
}

function toChatMessage(message: StoredMessage): ChatMessage {
	return {
		id: message.id,
		role: message.role,
		content: message.content,
		timestamp: message.createdAt,
		fileAttachments: message.media?.map((item) => ({
			name: item.type,
			size: 0,
			content: item.dataUrl,
			type: item.mimeType,
			kind: 'image',
		})),
	}
}

export function useChatGeneration({
	preferences,
	conversation,
	appendMessages,
	truncateMessagesFrom,
	ensureConversation,
	isChatRoute,
	serverOnline,
	onAssistantReply,
}: UseOllamaChatGenerationOptions) {
	const [isGenerating, setIsGenerating] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastIntent, setLastIntent] = useState<string | null>(null)
	const [streamingAssistant, setStreamingAssistant] = useState<{
		id: string
		content: string
		thinkingContent?: string
	} | null>(null)
	const [generationActivity, setGenerationActivity] =
		useState<ChatGenerationActivity | null>(null)
	const [completionNotice, setCompletionNotice] = useState<string | null>(null)
	const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS)

	const streamingContentRef = useRef('')
	const streamingThinkingRef = useRef('')
	const abortControllerRef = useRef<AbortController | null>(null)
	const isChatRouteRef = useRef(isChatRoute)

	isChatRouteRef.current = isChatRoute

	useEffect(() => {
		const host = loadCachedPersonalaiHost()
		if (!serverOnline) return

		void fetchServerSettings(host).then((serverSettings) => {
			setSettings({ ...DEFAULT_SETTINGS, ...serverSettings })
		})
	}, [serverOnline])

	useEffect(() => {
		if (isGenerating && !isChatRoute) {
			void requestNotificationPermission()
		}
	}, [isGenerating, isChatRoute])

	const clearCompletionNotice = useCallback(() => {
		setCompletionNotice(null)
	}, [])

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	const stopGeneration = useCallback(() => {
		abortControllerRef.current?.abort()
		setIsGenerating(false)
		setGenerationActivity(null)
	}, [])

	const submitMessage = useCallback(
		async (
			{
				text,
				attachments,
				editFromMessageId,
				inputMethod,
			}: ChatSubmitPayload,
		) => {
			if (!serverOnline) {
				setError('PersonalAI server is offline. Check Settings → Local connection.')
				return
			}

			if (!text.trim() && attachments.length === 0) {
				return
			}

			setError(null)
			setCompletionNotice(null)
			setIsGenerating(true)
			setStreamingAssistant(null)
			setGenerationActivity({ phase: 'starting' })
			setLastIntent('Chat')
			streamingContentRef.current = ''
			streamingThinkingRef.current = ''

			const abortController = new AbortController()
			abortControllerRef.current = abortController

			const modelId =
				conversation?.modelId ??
				settings.activeModel ??
				preferences.defaultModelId
			let activeConversation = conversation
			if (editFromMessageId) {
				activeConversation = await truncateMessagesFrom(editFromMessageId)
			}

			const assistantMessageId = crypto.randomUUID()
			const userMessageId = crypto.randomUUID()

			try {
				await ensureConversation()

				const imageAttachments = attachments
					.filter((attachment) => attachment.type === 'image' && attachment.dataUrl)
					.map((attachment) => ({
						type: 'image' as const,
						mimeType: attachment.mimeType ?? 'image/png',
						dataUrl: attachment.dataUrl!,
					}))

				const userMessage: StoredMessage = {
					id: userMessageId,
					role: 'user',
					content: text,
					media: imageAttachments.length > 0 ? imageAttachments : undefined,
					createdAt: Date.now(),
				}
				await appendMessages([userMessage], modelId)

				const historyMessages = [
					...(activeConversation?.messages ?? []),
					userMessage,
				].map(toChatMessage)

				streamingContentRef.current = ''
				streamingThinkingRef.current = ''
				setStreamingAssistant({
					id: assistantMessageId,
					content: '',
					thinkingContent: '',
				})

				const chatResult = await generateOllamaChatWithTools(
					modelId,
					historyMessages,
					settings,
					preferences,
					{
						signal: abortController.signal,
						userMessageText: text,
						onActivityChange: (phase) => {
							setGenerationActivity({ phase })
						},
						onThinkingDelta: (_, fullThinkingText) => {
							streamingThinkingRef.current = fullThinkingText
							setStreamingAssistant({
								id: assistantMessageId,
								content: streamingContentRef.current,
								thinkingContent: fullThinkingText,
							})
						},
						onTextDelta: (_, fullMainText) => {
							streamingContentRef.current = fullMainText
							setStreamingAssistant({
								id: assistantMessageId,
								content: fullMainText,
								thinkingContent: streamingThinkingRef.current,
							})
						},
						onToolActivity: (toolNames) => {
							streamingContentRef.current = ''
							streamingThinkingRef.current = ''
							setGenerationActivity({
								phase: 'tool',
								toolName: toolNames[0],
							})
							setStreamingAssistant({
								id: assistantMessageId,
								content: '',
								thinkingContent: '',
							})
						},
					},
				)

				const assistantMessage: StoredMessage = {
					id: assistantMessageId,
					role: 'assistant',
					content: chatResult.text,
					documentLinks:
						chatResult.documentLinks.length > 0
							? chatResult.documentLinks
							: undefined,
					pendingDeleteConfirmation: chatResult.pendingDeleteConfirmation,
					createdAt: Date.now(),
				}
				await appendMessages([assistantMessage], modelId)
				setStreamingAssistant(null)
				setGenerationActivity(null)
				streamingContentRef.current = ''
				streamingThinkingRef.current = ''

				if (chatResult.text.trim() && onAssistantReply) {
					onAssistantReply({
						message: assistantMessage,
						inputMethod,
					})
				}

				const aiName = getConfiguredAiName(preferences)
				if (!isChatRouteRef.current) {
					setCompletionNotice(`${aiName} finished replying.`)
				}

				void requestNotificationPermission().then(() => {
					void notifyGenerationComplete(aiName, chatResult.text, {
						isChatRoute: isChatRouteRef.current,
					})
				})
			} catch (generationError) {
				if (
					generationError instanceof DOMException &&
					generationError.name === 'AbortError'
				) {
					const partialContent = streamingContentRef.current.trim()
					if (partialContent) {
						await appendMessages([
							{
								id: assistantMessageId,
								role: 'assistant',
								content: partialContent,
								createdAt: Date.now(),
							},
						])
					}
					setStreamingAssistant(null)
					setGenerationActivity(null)
					streamingContentRef.current = ''
					streamingThinkingRef.current = ''
					return
				}

				setError(
					generationError instanceof Error
						? generationError.message
						: 'Generation failed',
				)
				setStreamingAssistant(null)
				setGenerationActivity(null)
				streamingContentRef.current = ''
				streamingThinkingRef.current = ''

				if (!isChatRouteRef.current) {
					setCompletionNotice('Generation failed. Open chat to see details.')
				}
			} finally {
				abortControllerRef.current = null
				setIsGenerating(false)
			}
		},
		[
			appendMessages,
			conversation,
			ensureConversation,
			onAssistantReply,
			preferences,
			serverOnline,
			settings,
			truncateMessagesFrom,
		],
	)

	const updateSettings = useCallback(async (patch: Partial<ChatSettings>) => {
		const next = { ...settings, ...patch }
		setSettings(next)
		const host = loadCachedPersonalaiHost()
		await saveServerSettings(host, next)
	}, [settings])

	return {
		isGenerating,
		error,
		lastIntent,
		streamingAssistant,
		generationActivity,
		completionNotice,
		submitMessage,
		stopGeneration,
		clearCompletionNotice,
		clearError,
		chatSettings: settings,
		updateChatSettings: updateSettings,
	}
}
