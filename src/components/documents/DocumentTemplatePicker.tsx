import { FilePlus2, LayoutTemplate, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { DocumentTemplate } from '@/data/documentTemplates'
import {
	deleteCustomDocumentTemplate,
	listDocumentTemplates,
	subscribeDocumentTemplatesChanged,
} from '@/services/documents/documentTemplateService'
import { cn } from '@/utils/cn'

interface DocumentTemplatePickerProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSelect: (template: DocumentTemplate | null) => void
}

export function DocumentTemplatePicker({
	open,
	onOpenChange,
	onSelect,
}: DocumentTemplatePickerProps) {
	const [templates, setTemplates] = useState<DocumentTemplate[]>([])

	useEffect(() => {
		if (!open) {
			return
		}

		void listDocumentTemplates().then(setTemplates)
	}, [open])

	useEffect(() => {
		return subscribeDocumentTemplatesChanged(() => {
			void listDocumentTemplates().then(setTemplates)
		})
	}, [])

	const builtIn = templates.filter((template) => template.isBuiltIn)
	const custom = templates.filter((template) => !template.isBuiltIn)

	async function handleDeleteCustom(id: string): Promise<void> {
		await deleteCustomDocumentTemplate(id)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[min(32rem,calc(100vw-2rem))] max-h-[min(85svh,36rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>New document</DialogTitle>
					<DialogDescription>
						Start blank or pick a template to reduce blank-page friction.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<button
						type="button"
						onClick={() => onSelect(null)}
						className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-left transition-colors hover:bg-accent"
					>
						<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
							<FilePlus2 className="h-4 w-4" />
						</span>
						<span>
							<span className="block text-sm font-medium">Blank document</span>
							<span className="block text-xs text-muted-foreground">
								Empty page, no structure
							</span>
						</span>
					</button>

					{builtIn.length > 0 ? (
						<section className="space-y-2">
							<h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								Built-in templates
							</h3>
							<div className="space-y-2">
								{builtIn.map((template) => (
									<TemplateRow
										key={template.id}
										template={template}
										onSelect={() => onSelect(template)}
									/>
								))}
							</div>
						</section>
					) : null}

					{custom.length > 0 ? (
						<section className="space-y-2">
							<h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								Your templates
							</h3>
							<div className="space-y-2">
								{custom.map((template) => (
									<TemplateRow
										key={template.id}
										template={template}
										onSelect={() => onSelect(template)}
										onDelete={() => void handleDeleteCustom(template.id)}
									/>
								))}
							</div>
						</section>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	)
}

function TemplateRow({
	template,
	onSelect,
	onDelete,
}: {
	template: DocumentTemplate
	onSelect: () => void
	onDelete?: () => void
}) {
	return (
		<div
			className={cn(
				'flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3',
				'bg-background/40 transition-colors hover:bg-accent',
			)}
		>
			<button
				type="button"
				onClick={onSelect}
				className="flex min-w-0 flex-1 items-center gap-3 text-left"
			>
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<LayoutTemplate className="h-4 w-4" />
				</span>
				<span className="min-w-0">
					<span className="block truncate text-sm font-medium">{template.name}</span>
					<span className="block truncate text-xs text-muted-foreground">
						{template.description}
					</span>
				</span>
			</button>
			{onDelete ? (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="shrink-0 text-muted-foreground hover:text-destructive"
					onClick={onDelete}
					aria-label={`Delete template ${template.name}`}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			) : null}
		</div>
	)
}
