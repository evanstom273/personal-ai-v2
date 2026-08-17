import { ArrowLeft, LayoutTemplate, Lock, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DocumentEditor } from '@/components/documents/DocumentEditor'
import { DocumentHtmlRunnerDialog } from '@/components/documents/DocumentHtmlRunnerDialog'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { useDualPaneNavigation } from '@/hooks/useDualPaneNavigation'
import { usePreferencesContext } from '@/providers/ChatProvider'
import {
	getDocument,
	createDocument,
	updateDocument,
	subscribeDocumentsChanged,
} from '@/services/documents/documentService'
import { saveDocumentAsTemplate } from '@/services/documents/documentTemplateService'
import type { DocumentContentFormat, DocumentRecord } from '@/storage/types'
import {
	documentContentToEditorHtml,
	editorHtmlToDocumentContent,
	isDocumentReadOnly,
} from '@/utils/documentContent'

const AUTOSAVE_MS = 800

export function DocumentEditorPage() {
	const { documentId } = useParams<{ documentId: string }>()
	const { navigateApp, goToLibrary, isDualPaneActive } = useDualPaneNavigation()
	const { preferences } = usePreferencesContext()
	const [document, setDocument] = useState<DocumentRecord | null>(null)
	const [title, setTitle] = useState('')
	const [content, setContent] = useState('<p></p>')
	const [isLoading, setIsLoading] = useState(true)
	const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
	const [runnerDialogOpen, setRunnerDialogOpen] = useState(false)
	const [templateName, setTemplateName] = useState('')
	const [templateSaved, setTemplateSaved] = useState(false)
	const [templateError, setTemplateError] = useState<string | null>(null)
	const saveTimerRef = useRef<number | null>(null)
	const latestRef = useRef({ title, content })
	const documentMetaRef = useRef<{
		id: string
		contentFormat: DocumentContentFormat
	} | null>(null)
	const lastPersistedRef = useRef({ title: '', content: '' })
	const lastKnownUpdatedAtRef = useRef(0)
	const readOnlyRef = useRef(false)

	useEffect(() => {
		latestRef.current = { title, content }
	}, [title, content])

	const readOnly = document ? isDocumentReadOnly(document) : false
	readOnlyRef.current = readOnly

	const handleSaveAsTemplate = useCallback(async () => {
		const trimmedName = templateName.trim()
		if (!trimmedName) {
			setTemplateError('Template name is required.')
			return
		}

		const meta = documentMetaRef.current
		if (!meta) {
			return
		}

		try {
			await saveDocumentAsTemplate({
				name: trimmedName,
				content: editorHtmlToDocumentContent(
					latestRef.current.content,
					meta.contentFormat,
				),
				description: `From "${latestRef.current.title.trim() || 'Untitled document'}"`,
			})
			setTemplateSaved(true)
			setTemplateError(null)
			window.setTimeout(() => {
				setTemplateDialogOpen(false)
				setTemplateSaved(false)
				setTemplateName('')
			}, 1200)
		} catch (caught) {
			setTemplateError(
				caught instanceof Error ? caught.message : 'Could not save template.',
			)
		}
	}, [templateName])

	const openTemplateDialog = useCallback(() => {
		setTemplateName(title.trim() || 'My template')
		setTemplateError(null)
		setTemplateSaved(false)
		setTemplateDialogOpen(true)
	}, [title])


	const persistDocument = useCallback(async () => {
		const meta = documentMetaRef.current
		if (!meta || readOnlyRef.current) {
			return
		}

		const snapshot = latestRef.current
		if (
			snapshot.title === lastPersistedRef.current.title &&
			snapshot.content === lastPersistedRef.current.content
		) {
			return
		}

		try {
			const updated = await updateDocument(meta.id, {
				title: snapshot.title,
				content: editorHtmlToDocumentContent(
					snapshot.content,
					meta.contentFormat,
				),
			})
			lastPersistedRef.current = { ...snapshot }
			lastKnownUpdatedAtRef.current = updated.updatedAt
		} catch {
			// Save failures must not disrupt editing.
		}
	}, [])

	useEffect(() => {
		let cancelled = false

		async function load(): Promise<void> {
			if (!documentId) {
				return
			}

			if (documentId === 'new') {
				const created = await createDocument('Untitled document', '', {
					source: 'user',
					contentFormat: 'markdown',
					readOnly: false,
				})
				if (!cancelled) {
					navigateApp(`/library/documents/${created.id}`)
				}
				return
			}

			const stored = await getDocument(documentId)
			if (!cancelled) {
				if (!stored) {
					goToLibrary()
					return
				}
				const editorHtml = documentContentToEditorHtml(stored)
				setDocument(stored)
				setTitle(stored.title)
				setContent(editorHtml)
				documentMetaRef.current = {
					id: stored.id,
					contentFormat: stored.contentFormat,
				}
				lastPersistedRef.current = {
					title: stored.title,
					content: editorHtml,
				}
				lastKnownUpdatedAtRef.current = stored.updatedAt
				setIsLoading(false)
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [documentId, goToLibrary, navigateApp])

	useEffect(() => {
		if (!documentId || documentId === 'new' || isLoading) {
			return
		}

		return subscribeDocumentsChanged(() => {
			void (async () => {
				const stored = await getDocument(documentId)
				if (!stored || stored.updatedAt <= lastKnownUpdatedAtRef.current) {
					return
				}

				const editorHtml = documentContentToEditorHtml(stored)
				lastKnownUpdatedAtRef.current = stored.updatedAt
				lastPersistedRef.current = {
					title: stored.title,
					content: editorHtml,
				}
				setDocument(stored)
				setTitle(stored.title)
				setContent(editorHtml)
			})()
		})
	}, [documentId, isLoading])

	useEffect(() => {
		if (!documentMetaRef.current || isLoading || readOnly) {
			return
		}

		if (saveTimerRef.current) {
			window.clearTimeout(saveTimerRef.current)
		}

		saveTimerRef.current = window.setTimeout(() => {
			void persistDocument()
		}, AUTOSAVE_MS)

		return () => {
			if (saveTimerRef.current) {
				window.clearTimeout(saveTimerRef.current)
			}
		}
	}, [title, content, isLoading, readOnly, persistDocument])

	useEffect(() => {
		return () => {
			void persistDocument()
		}
	}, [persistDocument])

	if (isLoading || !document) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				Loading document...
			</div>
		)
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="shrink-0 border-b border-border px-4 py-3 md:px-6">
				<div className="flex flex-wrap items-center gap-3">
					<Button asChild variant="ghost" size="sm">
						<Link
							to="/library"
							onClick={(event) => {
								if (isDualPaneActive) {
									event.preventDefault()
									goToLibrary()
								}
							}}
						>
							<ArrowLeft className="h-4 w-4" />
							Library
						</Link>
					</Button>
					<input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						readOnly={readOnly}
						className="min-w-[12rem] flex-1 bg-transparent text-lg font-semibold outline-none read-only:cursor-default read-only:opacity-80"
						placeholder="Document title"
					/>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setRunnerDialogOpen(true)}
							title="Run document HTML/CSS/JS in a sandboxed viewport"
						>
							<Play className="h-4 w-4 fill-current" />
							Run HTML
						</Button>

						{readOnly ? (
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Lock className="h-3.5 w-3.5" />
								Read-only
							</div>
						) : (
							<>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={openTemplateDialog}
								>
									<LayoutTemplate className="h-4 w-4" />
									Save as template
								</Button>
								{document.source === 'upload' ? (
									<span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
										Uploaded
									</span>
								) : null}
							</>
						)}
					</div>
				</div>
			</header>

			<Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
				<DialogContent className="w-[min(24rem,calc(100vw-2rem))]">
					<DialogHeader>
						<DialogTitle>Save as template</DialogTitle>
						<DialogDescription>
							Reuse this document structure when creating new documents in Library.
						</DialogDescription>
					</DialogHeader>
					<input
						value={templateName}
						onChange={(event) => setTemplateName(event.target.value)}
						className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
						placeholder="Template name"
					/>
					{templateError ? (
						<p className="text-xs text-destructive">{templateError}</p>
					) : templateSaved ? (
						<p className="text-xs text-primary">Template saved.</p>
					) : null}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setTemplateDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={() => void handleSaveAsTemplate()}>
							Save template
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<DocumentHtmlRunnerDialog
				open={runnerDialogOpen}
				onOpenChange={setRunnerDialogOpen}
				title={title}
				content={editorHtmlToDocumentContent(content, document.contentFormat)}
				contentFormat={document.contentFormat}
			/>

			<DocumentEditor
				content={content}
				onChange={setContent}
				editable={!readOnly}
				documentTitle={title}
				preferences={preferences}
			/>
		</div>
	)
}
