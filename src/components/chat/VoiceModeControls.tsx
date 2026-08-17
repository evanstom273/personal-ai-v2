import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoiceModeControlsProps {
	hasApiKey: boolean
	isConversationActive: boolean
	isGenerating: boolean
	onStartConversation: () => void
}

export function VoiceModeControls({
	hasApiKey,
	isConversationActive,
	isGenerating,
	onStartConversation,
}: VoiceModeControlsProps) {
	const disabled = !hasApiKey || isGenerating || isConversationActive

	function handleConversationClick(): void {
		const confirmed = window.confirm(
			'Start Conversation Mode?\n\nHands-free voice chat using your normal assistant — speech recognition, full chat with memory and tools, then spoken replies. The mic resumes after each reply.',
		)
		if (confirmed) {
			onStartConversation()
		}
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className="h-8 w-8 shrink-0"
			disabled={disabled}
			onClick={handleConversationClick}
			title="Conversation Mode"
			aria-label="Conversation Mode"
		>
			<Phone className="h-4 w-4" />
		</Button>
	)
}
