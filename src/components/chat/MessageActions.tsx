import { Check, Copy, Loader2, Pencil, Square, TextSelect, Volume2 } from 'lucide-react'
import { useCallback, useState, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface MessageActionsProps {
	contentRef: RefObject<HTMLElement | null>
	text: string
	className?: string
	onEdit?: () => void
	editDisabled?: boolean
	onSpeak?: () => void
	onStopSpeak?: () => void
	speakStatus?: 'idle' | 'loading' | 'playing'
	speakDisabled?: boolean
}

export function MessageActions({
	contentRef,
	text,
	className,
	onEdit,
	editDisabled = false,
	onSpeak,
	onStopSpeak,
	speakStatus = 'idle',
	speakDisabled = false,
}: MessageActionsProps) {
	const [copied, setCopied] = useState(false)

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(text)
			setCopied(true)
			window.setTimeout(() => setCopied(false), 2000)
		} catch {
			// Clipboard access can fail in insecure contexts.
		}
	}, [text])

	const handleSelectAll = useCallback(() => {
		const element = contentRef.current
		if (!element) {
			return
		}

		const range = document.createRange()
		range.selectNodeContents(element)
		const selection = window.getSelection()
		selection?.removeAllRanges()
		selection?.addRange(range)
		element.focus({ preventScroll: true })
	}, [contentRef])

	const isSpeaking = speakStatus === 'playing'
	const isLoadingSpeech = speakStatus === 'loading'

	return (
		<div className={cn('flex items-center gap-1', className)}>
			{onEdit ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
					disabled={editDisabled}
					onClick={onEdit}
					aria-label="Edit message"
				>
					<Pencil className="h-3.5 w-3.5" />
					Edit
				</Button>
			) : null}
			{onSpeak ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
					disabled={speakDisabled || isLoadingSpeech}
					onClick={() => {
						if (isSpeaking) {
							onStopSpeak?.()
							return
						}
						onSpeak()
					}}
					aria-label={
						isLoadingSpeech
							? 'Generating speech'
							: isSpeaking
								? 'Stop speech'
								: 'Read message aloud'
					}
				>
					{isLoadingSpeech ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : isSpeaking ? (
						<Square className="h-3.5 w-3.5" />
					) : (
						<Volume2 className="h-3.5 w-3.5" />
					)}
					{isLoadingSpeech ? 'Loading' : isSpeaking ? 'Stop' : 'Listen'}
				</Button>
			) : null}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
				onClick={() => {
					void handleCopy()
				}}
				aria-label={copied ? 'Copied message' : 'Copy message'}
			>
				{copied ? (
					<Check className="h-3.5 w-3.5" />
				) : (
					<Copy className="h-3.5 w-3.5" />
				)}
				{copied ? 'Copied' : 'Copy'}
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
				onClick={handleSelectAll}
				aria-label="Select message"
			>
				<TextSelect className="h-3.5 w-3.5" />
				Select
			</Button>
		</div>
	)
}
