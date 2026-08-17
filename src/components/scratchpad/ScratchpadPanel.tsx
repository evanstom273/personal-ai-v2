import { FileText, FolderKanban, Loader2, Save, Trash2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useScratchpad } from '@/providers/ScratchpadProvider'
import {
	ScratchpadProjectDialog,
	useScratchpadActions,
} from '@/components/scratchpad/ScratchpadActions'
import { cn } from '@/utils/cn'

interface ScratchpadPanelProps {
	embedMode?: boolean
}

export function ScratchpadPanel({ embedMode = false }: ScratchpadPanelProps) {
	const {
		isOpen,
		content,
		undoContent,
		isBusy,
		error,
		closeScratchpad,
		setContent,
		clearScratchpad,
		undoClear,
		dismissUndo,
	} = useScratchpad()
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const {
		handleOrganize,
		handleConvertToTasks,
		handleSaveDraft,
		projectDialogOpen,
		setProjectDialogOpen,
		pendingProjectTitle,
		handleConfirmProject,
	} = useScratchpadActions()

	useEffect(() => {
		if (!isOpen && !embedMode) {
			return
		}

		const frame = window.requestAnimationFrame(() => {
			textareaRef.current?.focus()
		})

		return () => window.cancelAnimationFrame(frame)
	}, [isOpen, embedMode])

	useEffect(() => {
		if (!isOpen && !embedMode) {
			return
		}

		function onKeyDown(event: KeyboardEvent): void {
			if (event.key === 'Escape' && !embedMode) {
				event.preventDefault()
				closeScratchpad()
				return
			}

			if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
				event.preventDefault()
				void handleOrganize()
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [closeScratchpad, handleOrganize, isOpen, embedMode])

	if (!isOpen && !embedMode) {
		return (
			<ScratchpadProjectDialog
				open={projectDialogOpen}
				onOpenChange={setProjectDialogOpen}
				defaultProjectTitle={pendingProjectTitle}
				onConfirm={handleConfirmProject}
			/>
		)
	}

	if (embedMode) {
		return (
			<div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-card">
				<header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
					<div>
						<h2 className="text-sm font-semibold">Scratchpad</h2>
						<p className="text-xs text-muted-foreground">
							Auto-saved · ⌘/Ctrl+Enter to organize
						</p>
					</div>
				</header>

				<div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
					<textarea
						ref={textareaRef}
						value={content}
						onChange={(event) => setContent(event.target.value)}
						disabled={isBusy}
						placeholder="Dump ideas, todos, half-formed thoughts…"
						className="h-full min-h-[12rem] w-full resize-none rounded-xl border border-border/60 bg-background/60 px-3 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
					/>
				</div>

				{error ? (
					<p className="shrink-0 px-4 pb-2 text-xs text-destructive">{error}</p>
				) : null}

				{undoContent ? (
					<div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs">
						<span>Scratchpad cleared</span>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={undoClear}
								className="font-medium text-primary underline-offset-4 hover:underline"
							>
								Undo
							</button>
							<button
								type="button"
								onClick={dismissUndo}
								className="text-muted-foreground hover:text-foreground"
							>
								Dismiss
							</button>
						</div>
					</div>
				) : null}

				<footer className="shrink-0 space-y-2 border-t border-border px-4 py-3">
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<Button
							size="sm"
							variant="secondary"
							disabled={isBusy || !content.trim()}
							onClick={() => void handleOrganize()}
						>
							{isBusy ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<FileText className="h-3.5 w-3.5" />
							)}
							Organise
						</Button>
						<Button
							size="sm"
							variant="secondary"
							disabled={isBusy || !content.trim()}
							onClick={() => void handleConvertToTasks()}
						>
							<FolderKanban className="h-3.5 w-3.5" />
							To tasks
						</Button>
						<Button
							size="sm"
							variant="secondary"
							disabled={isBusy || !content.trim()}
							onClick={() => void handleSaveDraft()}
						>
							<Save className="h-3.5 w-3.5" />
							Save draft
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={isBusy || !content.trim()}
							onClick={clearScratchpad}
						>
							<Trash2 className="h-3.5 w-3.5" />
							Clear
						</Button>
					</div>
				</footer>

				<ScratchpadProjectDialog
					open={projectDialogOpen}
					onOpenChange={setProjectDialogOpen}
					defaultProjectTitle={pendingProjectTitle}
					onConfirm={handleConfirmProject}
				/>
			</div>
		)
	}

	return (
		<>
			<div
				className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]"
				onClick={closeScratchpad}
				aria-hidden
			/>

			<div
				className={cn(
					'fixed inset-x-0 z-[61] flex max-h-[min(85svh,40rem)] flex-col',
					'rounded-t-2xl border border-border/60 bg-card shadow-2xl',
				)}
				style={{
					bottom: 'calc(var(--bottom-nav-height) - 0.25rem)',
				}}
				role="dialog"
				aria-label="Quick capture scratchpad"
			>
				<header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
					<div>
						<h2 className="text-sm font-semibold">Scratchpad</h2>
						<p className="text-xs text-muted-foreground">
							Auto-saved · Esc to close · ⌘/Ctrl+Enter to organize
						</p>
					</div>
					<button
						type="button"
						onClick={closeScratchpad}
						className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
						aria-label="Close scratchpad"
					>
						<X className="h-4 w-4" />
					</button>
				</header>

				<div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
					<textarea
						ref={textareaRef}
						value={content}
						onChange={(event) => setContent(event.target.value)}
						disabled={isBusy}
						placeholder="Dump ideas, todos, half-formed thoughts…"
						className="h-full min-h-[12rem] w-full resize-none rounded-xl border border-border/60 bg-background/60 px-3 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
					/>
				</div>

				{error ? (
					<p className="shrink-0 px-4 pb-2 text-xs text-destructive">{error}</p>
				) : null}

				{undoContent ? (
					<div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs">
						<span>Scratchpad cleared</span>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={undoClear}
								className="font-medium text-primary underline-offset-4 hover:underline"
							>
								Undo
							</button>
							<button
								type="button"
								onClick={dismissUndo}
								className="text-muted-foreground hover:text-foreground"
							>
								Dismiss
							</button>
						</div>
					</div>
				) : null}

				<footer className="shrink-0 space-y-2 border-t border-border px-4 py-3">
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						<Button
							size="sm"
							variant="secondary"
							disabled={isBusy || !content.trim()}
							onClick={() => void handleOrganize()}
						>
							{isBusy ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<FileText className="h-3.5 w-3.5" />
							)}
							Organise
						</Button>
						<Button
							size="sm"
							variant="secondary"
							disabled={isBusy || !content.trim()}
							onClick={() => void handleConvertToTasks()}
						>
							<FolderKanban className="h-3.5 w-3.5" />
							To tasks
						</Button>
						<Button
							size="sm"
							variant="secondary"
							disabled={isBusy || !content.trim()}
							onClick={() => void handleSaveDraft()}
						>
							<Save className="h-3.5 w-3.5" />
							Save draft
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={isBusy || !content.trim()}
							onClick={clearScratchpad}
						>
							<Trash2 className="h-3.5 w-3.5" />
							Clear
						</Button>
					</div>
				</footer>
			</div>

			<ScratchpadProjectDialog
				open={projectDialogOpen}
				onOpenChange={setProjectDialogOpen}
				defaultProjectTitle={pendingProjectTitle}
				onConfirm={handleConfirmProject}
			/>
		</>
	)
}
