import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { ChatMarkdown } from '@/components/chat/ChatMarkdown'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

export function DocumentAiPreviewDialog({
	open,
	title,
	previewText,
	isGenerating,
	error,
	onOpenChange,
	onAccept,
	onReject,
	onRegenerate,
}: {
	open: boolean
	title: string
	previewText: string
	isGenerating: boolean
	error: string | null
	onOpenChange: (open: boolean) => void
	onAccept: () => void
	onReject: () => void
	onRegenerate: () => void
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-primary" />
						{title}
					</DialogTitle>
				</DialogHeader>

				{isGenerating ? (
					<div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						Generating suggestion…
					</div>
				) : error ? (
					<p className="text-sm text-destructive">{error}</p>
				) : (
					<ScrollArea className="max-h-[45vh] rounded-lg border border-border/70 bg-card/40 p-4">
						<ChatMarkdown content={previewText} className="text-sm leading-relaxed" />
					</ScrollArea>
				)}

				<div className="flex flex-wrap justify-end gap-2">
					<Button type="button" variant="outline" onClick={onReject}>
						Reject
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={onRegenerate}
						disabled={isGenerating}
					>
						<RefreshCw className="h-4 w-4" />
						Try again
					</Button>
					<Button type="button" onClick={onAccept} disabled={isGenerating || !previewText}>
						Accept
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
