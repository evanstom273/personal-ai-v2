import type { CSSProperties } from 'react'
import type { AutocompleteCreateOption, AutocompleteItem } from '@/autocomplete/types'
import { cn } from '@/utils/cn'

interface AutocompleteMenuProps {
	items: AutocompleteItem[]
	selectedIndex: number
	createOption?: AutocompleteCreateOption | null
	onSelect: (item: AutocompleteItem) => void
	onSelectCreate?: (option: AutocompleteCreateOption) => void
	className?: string
	style?: CSSProperties
	heading?: string
}

export function AutocompleteMenu({
	items,
	selectedIndex,
	createOption,
	onSelect,
	onSelectCreate,
	className,
	style,
	heading = 'Suggestions',
}: AutocompleteMenuProps) {
	const hasCreate = Boolean(createOption)
	const total = items.length + (hasCreate ? 1 : 0)

	if (total === 0) {
		return (
			<div
				style={style}
				className={cn(
					'surface-popover z-[70] rounded-xl p-3 text-sm text-muted-foreground shadow-lg',
					className,
				)}
			>
				No matches.
			</div>
		)
	}

	return (
		<div
			style={style}
			className={cn(
				'surface-popover z-[70] max-h-[min(16rem,40vh)] overflow-y-auto rounded-xl shadow-lg',
				className,
			)}
		>
			<div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
				{heading}
			</div>
			<ul className="py-1">
				{items.map((item, index) => (
					<li key={`${item.entityType}:${item.id}`}>
						<button
							type="button"
							className={cn(
								'flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors',
								index === selectedIndex
									? 'bg-accent text-accent-foreground'
									: 'hover:bg-accent/70',
							)}
							onMouseDown={(event) => {
								event.preventDefault()
								onSelect(item)
							}}
						>
							<span className="min-w-0 flex-1">
								<span className="block truncate font-medium">{item.title}</span>
								{item.subtitle ? (
									<span className="block truncate text-xs text-muted-foreground">
										{item.subtitle}
									</span>
								) : null}
							</span>
							<span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
								{item.entityLabel}
							</span>
						</button>
					</li>
				))}

				{createOption ? (
					<li>
						<button
							type="button"
							className={cn(
								'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors',
								selectedIndex === items.length
									? 'bg-accent text-accent-foreground'
									: 'hover:bg-accent/70',
							)}
							onMouseDown={(event) => {
								event.preventDefault()
								onSelectCreate?.(createOption)
							}}
						>
							<span className="font-medium">{createOption.label}</span>
						</button>
					</li>
				) : null}
			</ul>
		</div>
	)
}
