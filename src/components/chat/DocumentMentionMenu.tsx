import { FileText } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { DocumentRecord } from '@/storage/types'
import { formatTimestamp } from '@/utils/documentContent'
import { cn } from '@/utils/cn'

interface DocumentMentionMenuProps {
	documents: DocumentRecord[]
	selectedIndex: number
	onSelect: (document: DocumentRecord) => void
	className?: string
	style?: CSSProperties
}

export function DocumentMentionMenu({
	documents,
	selectedIndex,
	onSelect,
	className,
	style,
}: DocumentMentionMenuProps) {
	if (documents.length === 0) {
		return (
			<div
				style={style}
				className={cn(
					'surface-popover z-[60] rounded-xl p-3 text-sm text-muted-foreground shadow-lg',
					className,
				)}
			>
				No documents match your search.
			</div>
		)
	}

	return (
		<div
			style={style}
			className={cn(
				'surface-popover z-[60] overflow-y-auto rounded-xl shadow-lg',
				className,
			)}
		>
			<div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
				Reference a document
			</div>
			<ul className="py-1">
				{documents.map((document, index) => (
					<li key={document.id}>
						<button
							type="button"
							className={cn(
								'flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors',
								index === selectedIndex
									? 'bg-accent text-accent-foreground'
									: 'hover:bg-accent/70',
							)}
							onMouseDown={(event) => {
								event.preventDefault()
								onSelect(document)
							}}
						>
							<FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
							<span className="min-w-0 flex-1">
								<span className="block truncate font-medium">
									{document.title}
								</span>
								<span className="block text-xs text-muted-foreground">
									Modified {formatTimestamp(document.updatedAt)}
								</span>
							</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	)
}
