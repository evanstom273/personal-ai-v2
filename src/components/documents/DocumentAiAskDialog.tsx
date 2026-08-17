import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'

export function DocumentAiAskDialog({
	open,
	isGenerating,
	onOpenChange,
	onSubmit,
}: {
	open: boolean
	isGenerating: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (instruction: string) => void
}) {
	const [instruction, setInstruction] = useState('')

	function handleSubmit(): void {
		const trimmed = instruction.trim()
		if (!trimmed || isGenerating) {
			return
		}
		onSubmit(trimmed)
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) {
					setInstruction('')
				}
				onOpenChange(nextOpen)
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-primary" />
						Ask AI…
					</DialogTitle>
				</DialogHeader>

				<textarea
					value={instruction}
					onChange={(event) => setInstruction(event.target.value)}
					placeholder='e.g. "Make this less formal" or "Turn this into bullet points"'
					rows={4}
					className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
					disabled={isGenerating}
				/>

				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isGenerating}
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={isGenerating || !instruction.trim()}
					>
						{isGenerating ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Generating…
							</>
						) : (
							'Generate'
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
