import {
	BookMarked,
	CalendarDays,
	FolderKanban,
	FolderOpen,
	MoreHorizontal,
	Pin,
	Star,
	Trash2,
	Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DocumentTemplatePicker } from '@/components/documents/DocumentTemplatePicker'
import type { DocumentTemplate } from '@/data/documentTemplates'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDualPaneNavigation } from '@/hooks/useDualPaneNavigation'
import { useDocuments } from '@/hooks/useDocuments'
import {
	listCollections,
	openDailyNote,
	searchDocuments,
	updateDocument,
} from '@/services/documents/documentService'
import {
	downloadKnowledgeCollectionZip,
	downloadKnowledgeVaultZip,
} from '@/services/knowledge/knowledgeApi'
import { uploadDocumentsFromFiles } from '@/services/documents/documentUploadService'
import type { DocumentRecord, KnowledgeCollection } from '@/storage/types'
import { cn } from '@/utils/cn'
import { formatTimestamp } from '@/utils/documentContent'

type KnowledgeNavKey =
	| 'all'
	| 'pinned'
	| 'recent'
	| 'notes'
	| 'projects'
	| 'people'
	| 'memory'
	| 'daily'
	| 'archive'
	| string

const SYSTEM_NAV: Array<{
	key: KnowledgeNavKey
	label: string
	systemKey?: string
	icon: typeof BookMarked
}> = [
	{ key: 'all', label: 'All notes', icon: BookMarked },
	{ key: 'pinned', label: 'Pinned', icon: Pin },
	{ key: 'recent', label: 'Recent', icon: Star },
	{ key: 'notes', label: 'Notes', systemKey: 'notes', icon: BookMarked },
	{ key: 'projects', label: 'Projects', systemKey: 'projects', icon: FolderKanban },
	{ key: 'people', label: 'People', systemKey: 'people', icon: BookMarked },
	{ key: 'memory', label: 'Memory', systemKey: 'memory', icon: BookMarked },
	{ key: 'daily', label: 'Daily Notes', systemKey: 'daily_notes', icon: CalendarDays },
	{ key: 'archive', label: 'Archive', systemKey: 'archive', icon: FolderOpen },
]

export function KnowledgeWorkspace({ query }: { query: string }) {
	const { openDocument } = useDualPaneNavigation()
	const {
		documents,
		isLoading,
		refreshDocuments,
		createDocumentFromTemplate,
		removeDocument,
	} = useDocuments()
	const [collections, setCollections] = useState<KnowledgeCollection[]>([])
	const [activeNav, setActiveNav] = useState<KnowledgeNavKey>('all')
	const [searchResults, setSearchResults] = useState<DocumentRecord[] | null>(null)
	const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
	const [uploadError, setUploadError] = useState<string | null>(null)
	const [isUploading, setIsUploading] = useState(false)
	const uploadInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		void listCollections().then(setCollections).catch(() => setCollections([]))
	}, [documents])

	const collectionBySystemKey = useMemo(() => {
		const map = new Map<string, KnowledgeCollection>()
		for (const collection of collections) {
			if (collection.systemKey) {
				map.set(collection.systemKey, collection)
			}
		}
		return map
	}, [collections])

	const activeCollectionId = useMemo(() => {
		const nav = SYSTEM_NAV.find((item) => item.key === activeNav)
		if (!nav?.systemKey) return undefined
		return collectionBySystemKey.get(nav.systemKey)?.id
	}, [activeNav, collectionBySystemKey])

	useEffect(() => {
		const trimmed = query.trim()
		if (!trimmed) {
			setSearchResults(null)
			return
		}

		let cancelled = false
		void searchDocuments(trimmed, 40).then((results) => {
			if (!cancelled) setSearchResults(results)
		})

		return () => {
			cancelled = true
		}
	}, [query])

	const visibleNotes = useMemo(() => {
		const base = searchResults ?? documents

		return base.filter((note) => {
			if (activeNav === 'pinned' && !note.pinned) return false
			if (activeNav === 'archive') return note.archived === true
			if (activeNav !== 'archive' && note.archived) return false
			if (activeCollectionId && note.collectionId !== activeCollectionId) return false
			if (
				activeNav === 'recent' &&
				note.updatedAt < Date.now() - 14 * 24 * 60 * 60 * 1000
			) {
				return false
			}
			return true
		})
	}, [documents, searchResults, activeNav, activeCollectionId])

	const handleTemplateSelect = useCallback(
		async (template: DocumentTemplate | null) => {
			setTemplatePickerOpen(false)
			const document = await createDocumentFromTemplate(template)
			openDocument(document.id)
		},
		[createDocumentFromTemplate, openDocument],
	)

	async function handleUpload(files: File[]): Promise<void> {
		if (files.length === 0) return
		setUploadError(null)
		setIsUploading(true)
		try {
			const { documents: uploaded, errors } = await uploadDocumentsFromFiles(files)
			await refreshDocuments()
			if (uploaded.length === 1) openDocument(uploaded[0].id)
			if (errors.length > 0) setUploadError(errors.join(' '))
		} finally {
			setIsUploading(false)
		}
	}

	async function handleExportVault(): Promise<void> {
		const blob = await downloadKnowledgeVaultZip()
		const url = URL.createObjectURL(blob)
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = 'PersonalAI-Knowledge.zip'
		anchor.click()
		URL.revokeObjectURL(url)
	}

	async function handleExportCollection(): Promise<void> {
		if (!activeCollectionId) return
		const blob = await downloadKnowledgeCollectionZip(activeCollectionId)
		const url = URL.createObjectURL(blob)
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = 'PersonalAI-Knowledge-collection.zip'
		anchor.click()
		URL.revokeObjectURL(url)
	}

	async function handleOpenToday(): Promise<void> {
		const note = await openDailyNote()
		openDocument(note.id)
	}

	async function handleDeleteNote(note: DocumentRecord): Promise<void> {
		if (!window.confirm(`Delete "${note.title}" permanently? This cannot be undone.`)) {
			return
		}
		await removeDocument(note.id)
		await refreshDocuments()
	}

	async function togglePin(note: DocumentRecord): Promise<void> {
		await updateDocument(note.id, { pinned: !note.pinned })
		await refreshDocuments()
	}

	return (
		<div className="flex min-h-0 flex-col gap-4 lg:flex-row">
			<nav className="flex shrink-0 flex-wrap gap-1 lg:w-44 lg:flex-col lg:flex-nowrap lg:gap-0.5">
				{SYSTEM_NAV.map(({ key, label, icon: Icon }) => (
					<button
						key={key}
						type="button"
						onClick={() => setActiveNav(key)}
						className={cn(
							'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
							activeNav === key
								? 'bg-primary/15 text-primary'
								: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
						)}
					>
						<Icon className="h-4 w-4 shrink-0" />
						<span className="truncate">{label}</span>
					</button>
				))}

				{collections
					.filter((c) => c.kind === 'folder')
					.map((collection) => (
						<button
							key={collection.id}
							type="button"
							onClick={() => setActiveNav(collection.id)}
							className={cn(
								'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
								activeNav === collection.id
									? 'bg-primary/15 text-primary'
									: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
							)}
						>
							<FolderOpen className="h-4 w-4 shrink-0" />
							<span className="truncate">{collection.name}</span>
						</button>
					))}
			</nav>

			<div className="min-w-0 flex-1 space-y-4">
				<input
					ref={uploadInputRef}
					type="file"
					multiple
					accept=".txt,.md,.markdown,.html,.htm,.json,.csv,.xml,.yml,.yaml,.pdf,.docx,text/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
					className="hidden"
					onChange={(event) => {
						const files = Array.from(event.target.files ?? [])
						if (files.length > 0) void handleUpload(files)
						event.target.value = ''
					}}
				/>

				<DocumentTemplatePicker
					open={templatePickerOpen}
					onOpenChange={setTemplatePickerOpen}
					onSelect={(template) => void handleTemplateSelect(template)}
				/>

				<div className="flex flex-wrap justify-end gap-2">
					<Button type="button" variant="outline" size="sm" onClick={() => void handleExportVault()}>
						Export vault
					</Button>
					{activeCollectionId ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => void handleExportCollection()}
						>
							Export folder
						</Button>
					) : null}
					<Button type="button" variant="outline" size="sm" onClick={() => void handleOpenToday()}>
						<CalendarDays className="h-4 w-4" />
						Today&apos;s note
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={isUploading}
						onClick={() => uploadInputRef.current?.click()}
					>
						<Upload className="h-4 w-4" />
						{isUploading ? 'Uploading…' : 'Upload'}
					</Button>
					<Button size="sm" onClick={() => setTemplatePickerOpen(true)}>
						New note
					</Button>
				</div>

				{uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}

				{activeNav === 'projects' ? (
					<p className="text-sm text-muted-foreground">
						Kanban boards live in{' '}
						<Link to="/library?section=projects" className="text-primary hover:underline">
							Projects
						</Link>
						. Link project tasks to knowledge notes from the task editor.
					</p>
				) : null}

				{activeNav === 'memory' ? (
					<p className="text-sm text-muted-foreground">
						Compact durable facts from chat are in{' '}
						<Link to="/memory" className="text-primary hover:underline">
							Memory
						</Link>
						. Knowledge notes are longer structured reference material.
					</p>
				) : null}

				{isLoading ? (
					<p className="text-sm text-muted-foreground">Loading knowledge…</p>
				) : visibleNotes.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{query.trim() ? 'No notes match your search.' : 'No notes here yet.'}
					</p>
				) : (
					<div className="space-y-2">
						{visibleNotes.map((note) => (
							<NoteListRow
								key={note.id}
								note={note}
								onOpen={() => openDocument(note.id)}
								onTogglePin={() => void togglePin(note)}
								onDelete={() => void handleDeleteNote(note)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

function NoteListRow({
	note,
	onOpen,
	onTogglePin,
	onDelete,
}: {
	note: DocumentRecord
	onOpen: () => void
	onTogglePin: () => void
	onDelete: () => void
}) {
	return (
		<div className="flex items-center gap-3 surface-panel rounded-xl px-4 py-3">
			<button
				type="button"
				onClick={onOpen}
				className="min-w-0 flex-1 text-left"
			>
				<div className="flex items-center gap-2">
					<span className="truncate font-medium">{note.title}</span>
					{note.pinned ? (
						<Pin className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Pinned" />
					) : null}
				</div>
				<p className="truncate text-xs text-muted-foreground">
					{formatTimestamp(note.updatedAt)}
					{note.tags?.length ? ` · ${note.tags.join(', ')}` : ''}
				</p>
			</button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={onTogglePin}
				title={note.pinned ? 'Unpin from Pinned list' : 'Pin to Pinned list'}
				aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
			>
				<Pin className={cn('h-4 w-4', note.pinned ? 'text-primary' : 'text-muted-foreground')} />
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					hideChevron
					className="h-9 w-9 justify-center px-0"
					aria-label="Note actions"
				>
					<MoreHorizontal className="h-4 w-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem className="text-destructive" onSelect={onDelete}>
						<Trash2 className="h-4 w-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
