import { ConversationModeOverlay } from '@/components/chat/ConversationModeOverlay'
import { VoiceModeControls } from '@/components/chat/VoiceModeControls'
import { useConversationMode } from '@/hooks/useConversationMode'
import { getTranscriptionModelId } from '@/services/gemini/modelPreferences'
import { useChatHeaderSlot, useVoiceSessionContext } from '@/providers/ChatProvider'
import type { StoredMessage, UserPreferences } from '@/storage/types'
import { getActiveGeminiApiKey } from '@/storage/geminiApiKeys'
import type { ChatSubmitPayload } from '@/types/chat'
import { useCallback, useEffect, useRef } from 'react'

interface ChatVoiceSessionProps {
	preferences: UserPreferences
	conversationMessages: StoredMessage[]
	isGenerating: boolean
	hasApiKey: boolean
	aiName: string
	speechStatus: 'idle' | 'loading' | 'playing'
	onSubmit: (payload: ChatSubmitPayload) => Promise<void>
	onStopSpeech: () => void
	onSpeakAssistantMessage: (options: {
		messageId: string
		text: string
		suppressErrorState?: boolean
		onEnded?: () => void
		onError?: () => void
	}) => void
}

export function ChatVoiceSession({
	preferences,
	conversationMessages,
	isGenerating,
	hasApiKey,
	aiName,
	speechStatus,
	onSubmit,
	onStopSpeech,
	onSpeakAssistantMessage,
}: ChatVoiceSessionProps) {
	const { setSlot } = useChatHeaderSlot()
	const { conversationModeActiveRef } = useVoiceSessionContext()

	const awaitingConversationReplyRef = useRef(false)
	const lastSpokenMessageIdRef = useRef<string | null>(null)

	const handleConversationSubmit = useCallback(
		async (payload: Parameters<typeof onSubmit>[0]) => {
			awaitingConversationReplyRef.current = true
			await onSubmit(payload)
		},
		[onSubmit],
	)

	const conversationMode = useConversationMode({
		geminiApiKey: getActiveGeminiApiKey(preferences),
		transcriptionModelId: getTranscriptionModelId(preferences.defaultModelId),
		onSubmit: handleConversationSubmit,
		onStopSpeaking: onStopSpeech,
	})

	useEffect(() => {
		setSlot(
			<VoiceModeControls
				hasApiKey={hasApiKey}
				isConversationActive={conversationMode.isActive}
				isGenerating={isGenerating}
				onStartConversation={() => void conversationMode.startConversation()}
			/>,
		)
		return () => setSlot(null)
	}, [
		setSlot,
		hasApiKey,
		conversationMode.isActive,
		isGenerating,
		conversationMode.startConversation,
	])

	useEffect(() => {
		conversationModeActiveRef.current = conversationMode.isActive
	}, [conversationMode.isActive, conversationModeActiveRef])

	useEffect(() => {
		if (!conversationMode.isActive || isGenerating) {
			return
		}
		if (!awaitingConversationReplyRef.current) {
			return
		}

		const lastMessage = conversationMessages[conversationMessages.length - 1]
		if (!lastMessage || lastMessage.role !== 'assistant') {
			return
		}
		if (lastSpokenMessageIdRef.current === lastMessage.id) {
			return
		}

		awaitingConversationReplyRef.current = false
		lastSpokenMessageIdRef.current = lastMessage.id
		conversationMode.setStatus('speaking')

		onSpeakAssistantMessage({
			messageId: lastMessage.id,
			text: lastMessage.content,
			suppressErrorState: true,
			onEnded: () => {
				void conversationMode.resumeListening()
			},
			onError: () => {
				void conversationMode.resumeListening()
			},
		})
	}, [
		conversationMessages,
		conversationMode.isActive,
		conversationMode.setStatus,
		conversationMode.resumeListening,
		isGenerating,
		onSpeakAssistantMessage,
	])

	return conversationMode.isActive ? (
		<ConversationModeOverlay
			aiName={aiName}
			status={conversationMode.status}
			liveTranscript={conversationMode.liveTranscript}
			isMuted={conversationMode.isMuted}
			error={conversationMode.error}
			onEnd={() => void conversationMode.endConversation()}
			onToggleMute={conversationMode.toggleMute}
			onFinishSpeaking={() => void conversationMode.finishSpeaking()}
			onInterrupt={conversationMode.interruptSpeaking}
			isSpeaking={speechStatus === 'playing'}
		/>
	) : null
}
