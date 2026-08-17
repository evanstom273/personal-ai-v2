import {
	CalendarClock,
	Download,
	FileText,
	FolderKanban,
	Image,
	MoreHorizontal,
	Music,
	Pencil,
	Search,
	Trash2,
} from 'lucide-react'
import { KnowledgeWorkspace } from '@/components/knowledge/KnowledgeWorkspace'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MediaLightbox } from '@/components/media/MediaLightbox'
import { ScheduleSection } from '@/components/schedule/ScheduleSection'
import { ProjectsSection } from '@/components/projects/ProjectsSection'
import { useLibraryMedia } from '@/hooks/useLibraryMedia'
import {
	deleteLibraryMediaItem,
	renameLibraryMediaItem,
} from '@/services/library/libraryMediaService'
import type { LibraryMediaKind, LibraryMediaRecord } from '@/storage/types'
import { formatTimestamp } from '@/utils/documentContent'
import {
	downloadLibraryMediaItem,
} from '@/utils/downloads'
import { cn } from '@/utils/cn'
import {
	resolveLibraryStateFromParams,
	type LibraryDocumentTab,
	type LibrarySection,
} from '@/navigation/swipeNav'

const LIBRARY_SECTIONS = [
	{ id: 'schedule', label: 'Schedule', icon: CalendarClock },
	{ id: 'projects', label: 'Projects', icon: FolderKanban },
	{ id: 'documents', label: 'Knowledge', icon: FileText },
] as const

const DOCUMENT_TABS = [
	{ id: 'documents', label: 'Docs', icon: FileText },
	{ id: 'images', label: 'Images', icon: Image },
	{ id: 'music', label: 'Music', icon: Music },
] as const

type DocumentTab = LibraryDocumentTab

function resolveLibraryState(searchParams: URLSearchParams): {
	section: LibrarySection
	documentTab: DocumentTab
} {
	return resolveLibraryStateFromParams(searchParams)
}

export function LibraryPage() {
	const [searchParams, setSearchParams] = useSearchParams()
	const { section: activeSection, documentTab: activeDocumentTab } =
		resolveLibraryState(searchParams)
	const [query, setQuery] = useState('')

	function setActiveSection(section: LibrarySection): void {
		if (section === 'documents') {
			setSearchParams(activeDocumentTab === 'documents' ? {} : { tab: activeDocumentTab })
			return
		}

		setSearchParams({ section })
	}

	function setActiveDocumentTab(tab: DocumentTab): void {
		setSearchParams(tab === 'documents' ? {} : { tab })
	}

	const searchPlaceholder =
		activeSection === 'documents'
			? `Search ${activeDocumentTab}…`
			: `Search ${activeSection}…`

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="shrink-0 border-b border-border/80 px-4 py-3 md:px-6">
				<div className="library-section-tabs flex gap-1 rounded-xl p-1">
					{LIBRARY_SECTIONS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => setActiveSection(id)}
							className={cn(
								'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:text-sm',
								activeSection === id
									? 'surface-tab-active text-foreground'
									: 'text-muted-foreground hover:text-foreground',
							)}
						>
							<Icon className="h-4 w-4 shrink-0" />
							<span className="truncate">{label}</span>
						</button>
					))}
				</div>

				{activeSection === 'documents' ? (
					<div className="mt-3 flex flex-wrap gap-2">
						{DOCUMENT_TABS.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								type="button"
								onClick={() => setActiveDocumentTab(id)}
								className={cn(
									'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors sm:text-sm',
									activeDocumentTab === id
										? 'border-primary/40 bg-primary/15 text-primary'
										: 'border-border bg-card text-muted-foreground hover:text-foreground',
								)}
							>
								<Icon className="h-3.5 w-3.5" />
								{label}
							</button>
						))}
					</div>
				) : null}

				{activeSection === 'documents' ? (
					<div className="relative mt-3 max-w-md">
						<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={searchPlaceholder}
							className="w-full rounded-lg surface-input py-2 pr-3 pl-9 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>
				) : null}
			</header>

			<ScrollArea className="min-h-0 flex-1">
				<div className="min-w-0 px-4 py-4 md:px-6">
					{activeSection === 'schedule' ? (
						<ScheduleSection />
					) : activeSection === 'projects' ? (
						<ProjectsSection />
					) : activeDocumentTab === 'documents' ? (
						<KnowledgeWorkspace query={query} />
					) : (
						<MediaSection
							kind={activeDocumentTab === 'images' ? 'image' : 'audio'}
							query={query}
							emptyLabel={
								activeDocumentTab === 'images'
									? 'No images yet. Upload one with + in chat or generate an image.'
									: 'No music yet. Generate music in chat to save it here.'
							}
						/>
					)}
				</div>
			</ScrollArea>
		</div>
	)
}


function MediaSection({
	kind,
	query,
	emptyLabel,
}: {
	kind: LibraryMediaKind
	query: string
	emptyLabel: string
}) {
	const { items, isLoading, refresh } = useLibraryMedia(kind)
	const [renamingId, setRenamingId] = useState<string | null>(null)
	const [renameValue, setRenameValue] = useState('')

	const filteredItems = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		if (!normalized) {
			return items
		}
		return items.filter((item) => item.title.toLowerCase().includes(normalized))
	}, [items, query])

	async function handleRename(itemId: string): Promise<void> {
		const trimmed = renameValue.trim()
		if (!trimmed) {
			return
		}

		await renameLibraryMediaItem(itemId, trimmed)
		setRenamingId(null)
		setRenameValue('')
		await refresh()
	}

	return (
		<div className="space-y-3">
			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : filteredItems.length === 0 ? (
				<EmptyState message={query.trim() ? 'No items match your search.' : emptyLabel} />
			) : (
				filteredItems.map((item) => (
					<MediaCard
						key={item.id}
						item={item}
						isRenaming={renamingId === item.id}
						renameValue={renameValue}
						onRenameValueChange={setRenameValue}
						onStartRename={() => {
							setRenamingId(item.id)
							setRenameValue(item.title)
						}}
						onCancelRename={() => setRenamingId(null)}
						onConfirmRename={() => {
							void handleRename(item.id)
						}}
						onDelete={() => {
							if (window.confirm(`Delete "${item.title}" permanently?`)) {
								void deleteLibraryMediaItem(item.id)
							}
						}}
					/>
				))
			)}
		</div>
	)
}

function MediaCard({
	item,
	isRenaming,
	renameValue,
	onRenameValueChange,
	onStartRename,
	onCancelRename,
	onConfirmRename,
	onDelete,
}: {
	item: LibraryMediaRecord
	isRenaming: boolean
	renameValue: string
	onRenameValueChange: (value: string) => void
	onStartRename: () => void
	onCancelRename: () => void
	onConfirmRename: () => void
	onDelete: () => void
}) {
	return (
		<div className="min-w-0 surface-panel rounded-xl p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					{isRenaming ? (
						<input
							autoFocus
							value={renameValue}
							onChange={(event) => onRenameValueChange(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									onConfirmRename()
								}
								if (event.key === 'Escape') {
									onCancelRename()
								}
							}}
							className="w-full rounded-md surface-input px-2 py-1 text-sm outline-none"
						/>
					) : (
						<h3 className="truncate font-medium">{item.title}</h3>
					)}
					<p className="mt-1 text-xs text-muted-foreground">
						{item.source === 'upload' ? 'Uploaded' : 'Generated'} ·{' '}
						{formatTimestamp(item.createdAt)}
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() =>
							downloadLibraryMediaItem(
								item.title,
								item.mimeType,
								item.dataUrl,
								item.createdAt,
							)
						}
					>
						<Download className="h-4 w-4" />
						Download
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger
							hideChevron
							className="h-9 w-9 justify-center px-0"
							aria-label="Media actions"
						>
							<MoreHorizontal className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onSelect={onStartRename}>
								<Pencil className="h-4 w-4" />
								Rename
							</DropdownMenuItem>
							<DropdownMenuItem className="text-destructive" onSelect={onDelete}>
								<Trash2 className="h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<div className="mt-4 min-w-0 overflow-hidden">
				{item.kind === 'image' ? (
					<MediaLightbox
						src={item.dataUrl}
						alt={item.title}
						title={item.title}
					/>
				) : null}
				{item.kind === 'audio' ? (
					<audio controls src={item.dataUrl} className="w-full max-w-full" />
				) : null}
			</div>
		</div>
	)
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="rounded-xl border border-dashed border-border/80 px-4 py-10 text-center">
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	)
}
