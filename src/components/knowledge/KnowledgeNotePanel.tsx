import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
	getDocumentBacklinks,
	getRelatedDocuments,
} from '@/services/documents/documentService'
import type { DocumentRecord } from '@/storage/types'
import { useDualPaneNavigation } from '@/hooks/useDualPaneNavigation'

export function KnowledgeNotePanel({ noteId }: { noteId: string }) {
	const { openDocument } = useDualPaneNavigation()
	const [backlinks, setBacklinks] = useState<DocumentRecord[]>([])
	const [related, setRelated] = useState<DocumentRecord[]>([])

	useEffect(() => {
		let cancelled = false
		void Promise.all([
			getDocumentBacklinks(noteId),
			getRelatedDocuments(noteId),
		]).then(([backlinkNotes, relatedNotes]) => {
			if (!cancelled) {
				setBacklinks(backlinkNotes)
				setRelated(relatedNotes)
			}
		})

		return () => {
			cancelled = true
		}
	}, [noteId])

	if (backlinks.length === 0 && related.length === 0) {
		return null
	}

	return (
		<aside className="shrink-0 border-t border-border/80 bg-muted/20 px-4 py-4 md:border-t-0 md:border-l md:px-4 md:py-0 md:w-56 lg:w-64">
			<div className="space-y-4 text-sm">
				{backlinks.length > 0 ? (
					<section>
						<h2 className="mb-2 font-semibold text-foreground">Backlinks</h2>
						<ul className="space-y-1">
							{backlinks.map((note) => (
								<li key={note.id}>
									<button
										type="button"
										onClick={() => openDocument(note.id)}
										className="text-left text-primary hover:underline"
									>
										{note.title}
									</button>
								</li>
							))}
						</ul>
					</section>
				) : null}

				{related.length > 0 ? (
					<section>
						<h2 className="mb-2 font-semibold text-foreground">Related</h2>
						<ul className="space-y-1">
							{related.map((note) => (
								<li key={note.id}>
									<button
										type="button"
										onClick={() => openDocument(note.id)}
										className="text-left text-primary hover:underline"
									>
										{note.title}
									</button>
								</li>
							))}
						</ul>
					</section>
				) : null}

				<p className="text-xs text-muted-foreground">
					Memory facts are separate from knowledge notes.{' '}
					<Link to="/memory" className="text-primary hover:underline">Open Memory</Link>
				</p>
			</div>
		</aside>
	)
}
