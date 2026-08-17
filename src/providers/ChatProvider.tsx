import { useChatGeneration } from '@/hooks/useChatGeneration'
import { useReminderFireHandler } from '@/hooks/useReminderFireHandler'
import { useNativeReminderNotificationHandler } from '@/hooks/useNativeReminderNotificationHandler'
import { useReminderOsSync } from '@/hooks/useReminderOsSync'
import { useReminderScheduler } from '@/hooks/useReminderScheduler'
import { usePreferences } from '@/hooks/useChatStorage'
import { useServerMainConversation } from '@/hooks/useServerMainConversation'
import {
	shouldAutoPlayAssistantSpeech,
	useTextToSpeech,
} from '@/hooks/useTextToSpeech'
import {
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'

type PreferencesContextValue = ReturnType<typeof usePreferences>
type MainConversationContextValue = ReturnType<typeof useServerMainConversation>
type ChatGenerationContextValue = ReturnType<typeof useChatGeneration> & {
	memoryArchiveError: string | null
	clearMemoryArchiveError: () => void
}
type TextToSpeechContextValue = ReturnType<typeof useTextToSpeech>

const PreferencesContext = createContext<PreferencesContextValue | null>(null)
const MainConversationContext =
	createContext<MainConversationContextValue | null>(null)
const ChatGenerationContext = createContext<ChatGenerationContextValue | null>(
	null,
)
const TextToSpeechContext = createContext<TextToSpeechContextValue | null>(null)

interface VoiceSessionContextValue {
	conversationModeActiveRef: React.MutableRefObject<boolean>
}

const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null)

interface ChatHeaderSlotContextValue {
	slot: ReactNode | null
	setSlot: (slot: ReactNode | null) => void
}

const ChatHeaderSlotContext = createContext<ChatHeaderSlotContextValue | null>(
	null,
)

export function ChatProvider({ children }: { children: ReactNode }) {
	const preferencesState = usePreferences()
	const conversationState = useServerMainConversation(
		preferencesState.preferences.defaultModelId,
	)
	const location = useLocation()
	const textToSpeechState = useTextToSpeech({
		preferences: preferencesState.preferences,
	})
	const conversationModeActiveRef = useRef(false)
	const [chatHeaderSlot, setChatHeaderSlot] = useState<ReactNode | null>(null)

	const setChatHeaderSlotStable = useCallback((slot: ReactNode | null) => {
		setChatHeaderSlot(slot)
	}, [])

	const handleAssistantReply = useCallback<
		NonNullable<Parameters<typeof useChatGeneration>[0]['onAssistantReply']>
	>(
		({ message, inputMethod }) => {
			if (conversationModeActiveRef.current) {
				return
			}

			if (
				!shouldAutoPlayAssistantSpeech(
					preferencesState.preferences.ttsReadAloudMode,
					inputMethod,
				)
			) {
				return
			}

			void textToSpeechState.speakAssistantMessage({
				messageId: message.id,
				text: message.content,
			})
		},
		[
			preferencesState.preferences.ttsReadAloudMode,
			textToSpeechState.speakAssistantMessage,
		],
	)

	const isChatRoute = location.pathname === '/chat'

	const generationState = useChatGeneration({
		preferences: preferencesState.preferences,
		conversation: conversationState.conversation,
		appendMessages: conversationState.appendMessages,
		truncateMessagesFrom: conversationState.truncateMessagesFrom,
		ensureConversation: conversationState.ensureConversation,
		saveConversation: conversationState.saveConversation,
		isChatRoute,
		serverOnline: conversationState.serverOnline,
		onAssistantReply: handleAssistantReply,
	})

	useReminderScheduler({
		preferences: preferencesState.preferences,
		appendMessages: conversationState.appendMessages,
		isChatRoute,
	})

	useReminderOsSync({
		preferences: preferencesState.preferences,
	})

	useReminderFireHandler({
		preferences: preferencesState.preferences,
		appendMessages: conversationState.appendMessages,
		isChatRoute,
	})

	useNativeReminderNotificationHandler()

	return (
		<PreferencesContext.Provider value={preferencesState}>
			<MainConversationContext.Provider value={conversationState}>
				<TextToSpeechContext.Provider value={textToSpeechState}>
					<VoiceSessionContext.Provider value={{ conversationModeActiveRef }}>
						<ChatHeaderSlotContext.Provider
							value={{ slot: chatHeaderSlot, setSlot: setChatHeaderSlotStable }}
						>
							<ChatGenerationContext.Provider
								value={{
									...generationState,
									memoryArchiveError: null,
									clearMemoryArchiveError: () => undefined,
								}}
							>
								{children}
							</ChatGenerationContext.Provider>
						</ChatHeaderSlotContext.Provider>
					</VoiceSessionContext.Provider>
				</TextToSpeechContext.Provider>
			</MainConversationContext.Provider>
		</PreferencesContext.Provider>
	)
}

export function usePreferencesContext(): PreferencesContextValue {
	const context = useContext(PreferencesContext)
	if (!context) {
		throw new Error('usePreferencesContext must be used within ChatProvider')
	}
	return context
}

export function useMainConversationContext(): MainConversationContextValue {
	const context = useContext(MainConversationContext)
	if (!context) {
		throw new Error(
			'useMainConversationContext must be used within ChatProvider',
		)
	}
	return context
}

export function useChatGenerationContext(): ChatGenerationContextValue {
	const context = useContext(ChatGenerationContext)
	if (!context) {
		throw new Error(
			'useChatGenerationContext must be used within ChatProvider',
		)
	}
	return context
}

export function useTextToSpeechContext(): TextToSpeechContextValue {
	const context = useContext(TextToSpeechContext)
	if (!context) {
		throw new Error(
			'useTextToSpeechContext must be used within ChatProvider',
		)
	}
	return context
}

export function useVoiceSessionContext(): VoiceSessionContextValue {
	const context = useContext(VoiceSessionContext)
	if (!context) {
		return {
			conversationModeActiveRef: { current: false },
		}
	}
	return context
}

export function useChatHeaderSlot(): ChatHeaderSlotContextValue {
	const context = useContext(ChatHeaderSlotContext)
	if (!context) {
		throw new Error('useChatHeaderSlot must be used within ChatProvider')
	}
	return context
}

/** @deprecated Use useChatGenerationContext().isGenerating */
export function useChatUiContext(): {
	isChatGenerating: boolean
	setIsChatGenerating: never
} {
	const { isGenerating } = useChatGenerationContext()
	return {
		isChatGenerating: isGenerating,
		setIsChatGenerating: (() => {
			throw new Error('setIsChatGenerating is no longer supported')
		}) as never,
	}
}
