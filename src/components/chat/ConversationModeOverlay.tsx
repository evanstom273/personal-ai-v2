import { ArrowUp, Mic, MicOff, PhoneOff, Radio, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceSessionOverlay } from '@/components/chat/VoiceSessionOverlay'
import type { ConversationModeStatus } from '@/hooks/useConversationMode'
import { cn } from '@/utils/cn'

interface ConversationModeOverlayProps {
	aiName: string
	status: ConversationModeStatus
	liveTranscript: string
	isMuted: boolean
	error: string | null
	onEnd: () => void
	onToggleMute: () => void
	onFinishSpeaking: () => void
	onInterrupt: () => void
	isSpeaking: boolean
}

const STATUS_LABELS: Record<ConversationModeStatus, string> = {
	idle: 'Idle',
	listening: 'Listening',
	transcribing: 'Transcribing',
	thinking: 'Thinking',
	speaking: 'Speaking',
}

export function ConversationModeOverlay({
	aiName,
	status,
	liveTranscript,
	isMuted,
	error,
	onEnd,
	onToggleMute,
	onFinishSpeaking,
	onInterrupt,
	isSpeaking,
}: ConversationModeOverlayProps) {
	return (
		<VoiceSessionOverlay label="Conversation Mode" onDismiss={onEnd}>
			<div className="flex flex-col items-center gap-4">
				<div className="text-center">
					<p className="text-sm text-muted-foreground">{aiName}</p>
					<p
						className={cn(
							'mt-1 text-sm font-medium',
							status === 'listening' && 'text-primary',
							status === 'thinking' && 'text-amber-500',
							status === 'speaking' && 'text-emerald-500',
						)}
					>
						{isMuted ? 'Muted' : STATUS_LABELS[status]}
					</p>
				</div>

				<div
					className={cn(
						'flex h-16 w-16 items-center justify-center rounded-full border-2',
						status === 'listening' && !isMuted && 'border-primary bg-primary/10',
						status === 'speaking' && 'border-emerald-500 bg-emerald-500/10',
						status === 'thinking' && 'border-amber-500 bg-amber-500/10',
						isMuted && 'border-muted bg-muted/20',
					)}
				>
					<Radio
						className={cn(
							'h-8 w-8',
							status === 'listening' && !isMuted && 'text-primary animate-pulse',
							status === 'speaking' && 'text-emerald-500',
							status === 'thinking' && 'text-amber-500',
						)}
					/>
				</div>

				{liveTranscript ? (
					<p className="max-h-20 w-full overflow-y-auto text-center text-sm text-muted-foreground">
						{liveTranscript}
					</p>
				) : (
					<p className="text-center text-sm text-muted-foreground">
						Speak naturally — pauses up to a few seconds are fine, or tap Done
						speaking when you are ready.
					</p>
				)}

				{error ? (
					<p className="text-center text-sm text-destructive">{error}</p>
				) : null}

				<div className="flex flex-wrap items-center justify-center gap-2">
					{status === 'listening' && !isMuted ? (
						<Button
							type="button"
							variant="default"
							size="sm"
							onClick={onFinishSpeaking}
						>
							<ArrowUp className="h-4 w-4" />
							Done speaking
						</Button>
					) : null}
					<Button type="button" variant="outline" size="sm" onClick={onToggleMute}>
						{isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
						{isMuted ? 'Unmute' : 'Mute'}
					</Button>
					{isSpeaking ? (
						<Button type="button" variant="outline" size="sm" onClick={onInterrupt}>
							<Square className="h-4 w-4" />
							Interrupt
						</Button>
					) : null}
					<Button type="button" variant="destructive" size="sm" onClick={onEnd}>
						<PhoneOff className="h-4 w-4" />
						End
					</Button>
				</div>
			</div>
		</VoiceSessionOverlay>
	)
}
