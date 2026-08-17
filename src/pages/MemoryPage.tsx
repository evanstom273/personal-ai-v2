import { Brain, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMemory } from '@/hooks/useMemory'
import type { MemoryCategory, MemoryEntry } from '@/storage/types'
import { formatTimestamp } from '@/utils/documentContent'
import { cn } from '@/utils/cn'

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
	preference: 'Preference',
	fact: 'Fact',
	project: 'Project',
	decision: 'Decision',
	other: 'Other',
}

const CATEGORY_STYLES: Record<MemoryCategory, string> = {
	preference: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
	fact: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
	project: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
	decision: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
	other: 'border-border bg-muted/40 text-muted-foreground',
}

function groupEntriesByDate(entries: MemoryEntry[]): Array<{
	label: string
	entries: MemoryEntry[]
}> {
	const groups = new Map<string, MemoryEntry[]>()

	for (const entry of entries) {
		const label = new Date(entry.createdAt).toLocaleDateString(undefined, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		})
		const existing = groups.get(label) ?? []
		existing.push(entry)
		groups.set(label, existing)
	}

	return [...groups.entries()].map(([label, groupedEntries]) => ({
		label,
		entries: groupedEntries,
	}))
}

export function MemoryPage() {
	const { entries, isLoading } = useMemory()
	const [query, setQuery] = useState('')

	const filteredEntries = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		if (!normalized) {
			return entries
		}

		return entries.filter((entry) => {
			return (
				entry.content.toLowerCase().includes(normalized) ||
				CATEGORY_LABELS[entry.category].toLowerCase().includes(normalized)
			)
		})
	}, [entries, query])

	const groupedEntries = useMemo(
		() => groupEntriesByDate(filteredEntries),
		[filteredEntries],
	)

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="shrink-0 border-b border-border px-4 py-4 md:px-6">
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
						<Brain className="h-5 w-5" />
					</div>
					<div>
						<h1 className="text-xl font-semibold md:text-2xl">Memory</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Facts the assistant has archived from your conversations. This index
							is read-only and is included in every chat automatically.
						</p>
					</div>
				</div>

				<div className="relative mt-4 max-w-md">
					<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search memory…"
						className="w-full rounded-lg surface-input py-2 pr-3 pl-9 text-sm outline-none ring-ring focus:ring-2"
					/>
				</div>
			</header>

			<ScrollArea className="min-h-0 flex-1">
				<div className="px-4 py-4 md:px-6">
					{isLoading ? (
						<p className="text-sm text-muted-foreground">Loading memory…</p>
					) : filteredEntries.length === 0 ? (
						<div className="surface-panel rounded-xl border border-dashed border-border/80 px-5 py-10 text-center">
							<p className="text-sm font-medium">No memory yet</p>
							<p className="mt-2 text-sm text-muted-foreground">
								After enough chat messages, the assistant archives durable facts
								here automatically. Adjust the interval in Settings.
							</p>
						</div>
					) : (
						<div className="space-y-8">
							{groupedEntries.map((group) => (
								<section key={group.label} className="space-y-3">
									<h2 className="text-sm font-medium text-muted-foreground">
										{group.label}
									</h2>
									<ul className="space-y-3">
										{group.entries.map((entry) => (
											<li
												key={entry.id}
												className="surface-panel rounded-xl p-4"
											>
												<div className="flex flex-wrap items-center gap-2">
													<span
														className={cn(
															'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
															CATEGORY_STYLES[entry.category],
														)}
													>
														{CATEGORY_LABELS[entry.category]}
													</span>
													<span className="text-xs text-muted-foreground">
														{formatTimestamp(entry.createdAt)}
													</span>
												</div>
												<p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
													{entry.content}
												</p>
											</li>
										))}
									</ul>
								</section>
							))}
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	)
}
