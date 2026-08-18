import { listMemoryEntries } from '@/services/memory/memoryService'
import { updateDocument } from '@/services/documents/documentService'
import type { DocumentRecord } from '@/storage/types'

export async function proposeLivingNoteUpdate(
	note: DocumentRecord,
	proposedContent: string,
	summary: string,
): Promise<DocumentRecord> {
	if (!note.livingNoteMode || note.livingNoteMode === 'off') {
		return note
	}

	if (note.livingNoteMode === 'suggest') {
		return updateDocument(note.id, {
			livingNotePendingContent: proposedContent,
			livingNotePendingSummary: summary,
		})
	}

	return updateDocument(note.id, {
		content: proposedContent,
		lastEditedBy: 'assistant',
		saveRevision: true,
		livingNoteLastConsolidatedAt: Date.now(),
		livingNotePendingContent: null,
		livingNotePendingSummary: null,
	})
}

export async function applyLivingNoteSuggestion(noteId: string): Promise<DocumentRecord> {
	const { getDocument } = await import('@/services/documents/documentService')
	const note = await getDocument(noteId)
	if (!note?.livingNotePendingContent) {
		throw new Error('No pending living note update.')
	}

	return updateDocument(noteId, {
		content: note.livingNotePendingContent,
		lastEditedBy: 'assistant',
		saveRevision: true,
		livingNoteLastConsolidatedAt: Date.now(),
		livingNotePendingContent: null,
		livingNotePendingSummary: null,
	})
}

export async function dismissLivingNoteSuggestion(noteId: string): Promise<DocumentRecord> {
	return updateDocument(noteId, {
		livingNotePendingContent: null,
		livingNotePendingSummary: null,
	})
}

export async function maybeConsolidateLivingNoteFromMemories(
	note: DocumentRecord,
): Promise<DocumentRecord | null> {
	if (note.livingNoteMode !== 'automatic') {
		return null
	}

	const memories = await listMemoryEntries()
	const related = memories.filter((memory) => {
		const haystack = `${memory.content} ${memory.category}`.toLowerCase()
		const title = note.title.toLowerCase()
		return haystack.includes(title) || title.split(/\s+/).some((word) => word.length > 3 && haystack.includes(word))
	})

	if (related.length === 0) {
		return null
	}

	const lastMemoryAt = Math.max(...related.map((memory) => memory.createdAt))
	if (
		note.livingNoteLastConsolidatedAt &&
		lastMemoryAt <= note.livingNoteLastConsolidatedAt
	) {
		return null
	}

	const bulletFacts = related
		.slice(0, 8)
		.map((memory) => `- ${memory.content}`)
		.join('\n')

	const header = note.content.trim()
		? `${note.content.trim()}\n\n## Related memories\n`
		: `## ${note.title}\n\n## Related memories\n`

	const proposed = `${header}${bulletFacts}`
	const summary = `Added ${related.length} related memory fact(s) without removing existing content.`

	return proposeLivingNoteUpdate(note, proposed, summary)
}

export async function consolidateAutomaticLivingNotes(): Promise<void> {
	const { listDocuments } = await import('@/services/documents/documentService')
	const notes = await listDocuments()
	const livingNotes = notes.filter((note) => note.livingNoteMode === 'automatic')

	for (const note of livingNotes) {
		try {
			await maybeConsolidateLivingNoteFromMemories(note)
		} catch {
			// Consolidation is best-effort and must not block other work.
		}
	}
}
