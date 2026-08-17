import {
	useChatGenerationContext,
	useChatHeaderSlot,
	useMainConversationContext,
	usePreferencesContext,
	useTextToSpeechContext,
} from '@/providers/ChatProvider'
import { confirmDocumentDeletion } from '@/services/gemini/documentTools'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import type { StoredMessage } from '@/storage/types'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatConversationActions } from '@/components/chat/ChatConversationActions'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { OllamaChatModelSelector } from '@/components/chat/OllamaChatModelSelector'

export function ChatPage() {
	const { preferences, savePreferences } = usePreferencesContext()
	const {
		conversation,
		appendMessages,
		updateMessage,
		clearConversation,
		replaceConversation,
		serverOnline,
		setActiveModel,
	} = useMainConversationContext()
	const {
		isGenerating,
		error,
		streamingAssistant,
		generationActivity,
		submitMessage,
		stopGeneration,
		clearCompletionNotice,
		updateChatSettings,
		chatSettings,
	} = useChatGenerationContext()
	const {
		activeMessageId: activeSpeechMessageId,
		status: speechStatus,
		error: speechError,
		speakAssistantMessage,
		stop: stopSpeech,
		clearError: clearSpeechError,
	} = useTextToSpeechContext()
	const { slot: voiceHeaderSlot } = useChatHeaderSlot()

	const [editingMessage, setEditingMessage] = useState<StoredMessage | null>(null)

	const aiName = getConfiguredAiName(preferences)
	const chatReady = serverOnline
	const activeModelId =
		conversation?.modelId ?? preferences.defaultModelId

	useEffect(() => {
		clearCompletionNotice()
	}, [clearCompletionNotice])

	const handleSelectModel = useCallback(
		async (modelId: string) => {
			await savePreferences({ ...preferences, defaultModelId: modelId })
			await setActiveModel(modelId)
			await updateChatSettings({ activeModel: modelId })
		},
		[preferences, savePreferences, setActiveModel, updateChatSettings],
	)

	const handleClearChat = useCallback(async () => {
		stopGeneration()
		setEditingMessage(null)
		await clearConversation()
	}, [clearConversation, stopGeneration])

	const handleImportChat = useCallback(
		async (imported: Parameters<typeof replaceConversation>[0]) => {
			setEditingMessage(null)
			await replaceConversation(imported)
		},
		[replaceConversation],
	)

	const handleEditUserMessage = useCallback(
		(message: StoredMessage) => {
			stopGeneration()
			setEditingMessage(message)
		},
		[stopGeneration],
	)

	const handleSubmit = useCallback(
		async (payload: Parameters<typeof submitMessage>[0]) => {
			stopSpeech()
			await submitMessage(payload)
			setEditingMessage(null)
		},
		[stopSpeech, submitMessage],
	)

	const handleConfirmDelete = useCallback(
		async (messageId: string, documentId: string, documentTitle: string) => {
			const deleted = await confirmDocumentDeletion(documentId)
			await updateMessage(messageId, { pendingDeleteConfirmation: undefined })
			if (deleted) {
				await appendMessages([
					{
						id: crypto.randomUUID(),
						role: 'assistant',
						content: `Deleted the document "${documentTitle}".`,
						createdAt: Date.now(),
					},
				])
			}
		},
		[appendMessages, updateMessage],
	)

	const handleCancelDelete = useCallback(
		async (messageId: string) => {
			await updateMessage(messageId, { pendingDeleteConfirmation: undefined })
			await appendMessages([
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					content: 'Document deletion was cancelled.',
					createdAt: Date.now(),
				},
			])
		},
		[appendMessages, updateMessage],
	)

	const handleSpeakMessage = useCallback(
		(message: StoredMessage) => {
			clearSpeechError()
			void speakAssistantMessage({
				messageId: message.id,
				text: message.content,
			})
		},
		[clearSpeechError, speakAssistantMessage],
	)

	return (
		<div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
			<header className="hidden shrink-0 flex-wrap items-center justify-between gap-3 app-header-glass px-4 py-3 md:flex md:px-6">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-lg font-semibold">{aiName}</h1>
						{voiceHeaderSlot}
						<ChatConversationActions
							conversation={conversation}
							isGenerating={isGenerating}
							onClear={handleClearChat}
							onImport={handleImportChat}
						/>
					</div>
					<p className="text-xs text-muted-foreground">Local Ollama · {activeModelId}</p>
				</div>
				<OllamaChatModelSelector
					value={activeModelId}
					onChange={(modelId) => {
						void handleSelectModel(modelId)
					}}
				/>
			</header>

			{!chatReady ? (
				<div className="shrink-0 border-b border-border bg-secondary/40 px-4 py-2 text-sm md:px-6">
					<span className="text-muted-foreground">PersonalAI server offline. </span>
					<Link
						to="/settings"
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						Check connection settings
					</Link>
				</div>
			) : null}

			{error ? (
				<div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive md:px-6">
					{error}
				</div>
			) : null}

			{speechError ? (
				<div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-100 md:px-6">
					<div className="flex items-start justify-between gap-3">
						<p>{speechError}</p>
						<button
							type="button"
							className="shrink-0 text-xs underline-offset-4 hover:underline"
							onClick={clearSpeechError}
						>
							Dismiss
						</button>
					</div>
				</div>
			) : null}

			<ChatMessages
				messages={conversation?.messages ?? []}
				streamingAssistant={streamingAssistant}
				isGenerating={isGenerating}
				generationActivity={generationActivity}
				aiName={aiName}
				editingMessageId={editingMessage?.id ?? null}
				onEditUserMessage={handleEditUserMessage}
				onConfirmDelete={handleConfirmDelete}
				onCancelDelete={handleCancelDelete}
				activeSpeechMessageId={activeSpeechMessageId}
				speechStatus={speechStatus}
				onSpeakMessage={handleSpeakMessage}
				onStopSpeech={stopSpeech}
				speechDisabled={!chatReady || isGenerating}
			/>

			<ChatInput
				disabled={!chatReady}
				isGenerating={isGenerating}
				selectedChatModelId={activeModelId}
				enableThinking={chatSettings.enableThinking}
				onEnableThinkingChange={(enabled) => {
					void updateChatSettings({ enableThinking: enabled })
				}}
				onChatModelChange={(modelId) => {
					void handleSelectModel(modelId)
				}}
				editingMessage={editingMessage}
				onCancelEdit={() => setEditingMessage(null)}
				onSubmit={(payload) => {
					void handleSubmit(payload)
				}}
				onStop={stopGeneration}
			/>
		</div>
	)
}
