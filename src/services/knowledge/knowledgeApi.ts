import {
	buildPersonalaiApiUrl,
} from '@/utils/personalaiEndpoint'
import { loadCachedPersonalaiHost } from '@/services/personalaiApi'
import type { DocumentRecord, KnowledgeCollection } from '@/storage/types'

async function parseError(res: Response): Promise<string> {
	const text = await res.text().catch(() => '')
	try {
		const json = JSON.parse(text) as { error?: string }
		if (json.error) return json.error
	} catch {
		// not json
	}
	return text || `HTTP ${res.status}`
}

function getHost(): string {
	return loadCachedPersonalaiHost()
}

function knowledgeUrl(path: string): string {
	return buildPersonalaiApiUrl(getHost(), `/knowledge${path}`)
}

export async function fetchKnowledgeCollections(): Promise<KnowledgeCollection[]> {
	const res = await fetch(knowledgeUrl('/collections'))
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { collections: KnowledgeCollection[] }
	return data.collections ?? []
}

export async function createKnowledgeCollection(input: {
	name: string
	parentId?: string
}): Promise<KnowledgeCollection> {
	const res = await fetch(knowledgeUrl('/collections'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { collection: KnowledgeCollection }
	return data.collection
}

export async function fetchKnowledgeNotes(filter?: {
	query?: string
	collectionId?: string
	includeArchived?: boolean
	pinnedOnly?: boolean
	tag?: string
}): Promise<DocumentRecord[]> {
	const params = new URLSearchParams()
	if (filter?.query) params.set('query', filter.query)
	if (filter?.collectionId) params.set('collectionId', filter.collectionId)
	if (filter?.includeArchived) params.set('includeArchived', 'true')
	if (filter?.pinnedOnly) params.set('pinnedOnly', 'true')
	if (filter?.tag) params.set('tag', filter.tag)

	const suffix = params.toString() ? `?${params.toString()}` : ''
	const res = await fetch(knowledgeUrl(`/notes${suffix}`))
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { notes: DocumentRecord[] }
	return data.notes ?? []
}

export async function fetchKnowledgeNote(id: string): Promise<DocumentRecord | undefined> {
	const res = await fetch(knowledgeUrl(`/notes/${id}`))
	if (res.status === 404) return undefined
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { note: DocumentRecord }
	return data.note
}

export async function createKnowledgeNote(
	input: Partial<DocumentRecord> & { title: string; content?: string },
): Promise<DocumentRecord> {
	const res = await fetch(knowledgeUrl('/notes'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			id: input.id,
			title: input.title,
			content: input.content,
			collectionId: input.collectionId,
			source: input.source,
			contentFormat: input.contentFormat,
			readOnly: input.readOnly,
			pinned: input.pinned,
			archived: input.archived,
			dailyNoteDate: input.dailyNoteDate,
			tags: input.tags,
			lastEditedBy: input.lastEditedBy,
		}),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { note: DocumentRecord }
	return data.note
}

export async function updateKnowledgeNote(
	id: string,
	updates: Partial<
		Pick<
			DocumentRecord,
			| 'title'
			| 'content'
			| 'collectionId'
			| 'pinned'
			| 'archived'
			| 'tags'
			| 'lastEditedBy'
			| 'livingNoteMode'
			| 'livingNotePendingContent'
			| 'livingNotePendingSummary'
			| 'livingNoteLastConsolidatedAt'
		>
	> & { saveRevision?: boolean },
): Promise<DocumentRecord> {
	const res = await fetch(knowledgeUrl(`/notes/${id}`), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			title: updates.title,
			content: updates.content,
			collectionId: updates.collectionId,
			pinned: updates.pinned,
			archived: updates.archived,
			tags: updates.tags,
			editor: updates.lastEditedBy,
			saveRevision: updates.saveRevision,
			livingNoteMode: updates.livingNoteMode,
			livingNotePendingContent: updates.livingNotePendingContent,
			livingNotePendingSummary: updates.livingNotePendingSummary,
			livingNoteLastConsolidatedAt: updates.livingNoteLastConsolidatedAt,
		}),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { note: DocumentRecord }
	return data.note
}

export async function deleteKnowledgeNote(id: string): Promise<void> {
	const res = await fetch(knowledgeUrl(`/notes/${id}`), { method: 'DELETE' })
	if (!res.ok) throw new Error(await parseError(res))
}

export async function searchKnowledgeNotes(
	query: string,
	limit = 30,
): Promise<DocumentRecord[]> {
	const res = await fetch(knowledgeUrl('/search'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ query, limit }),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { notes: DocumentRecord[] }
	return data.notes ?? []
}

export async function fetchKnowledgeBacklinks(noteId: string): Promise<DocumentRecord[]> {
	const res = await fetch(knowledgeUrl(`/notes/${noteId}/backlinks`))
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { notes: DocumentRecord[] }
	return data.notes ?? []
}

export async function fetchKnowledgeRelated(noteId: string): Promise<DocumentRecord[]> {
	const res = await fetch(knowledgeUrl(`/notes/${noteId}/related`))
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { notes: DocumentRecord[] }
	return data.notes ?? []
}

export async function fetchOrCreateDailyNote(date?: string): Promise<DocumentRecord> {
	const res = await fetch(knowledgeUrl('/notes/daily'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ date }),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { note: DocumentRecord }
	return data.note
}

export async function importKnowledgeNotesBatch(
	notes: Array<{
		id?: string
		title: string
		content: string
		source?: DocumentRecord['source']
		contentFormat?: DocumentRecord['contentFormat']
		readOnly?: boolean
	}>,
): Promise<{ imported: number; skipped: number }> {
	const res = await fetch(knowledgeUrl('/import-batch'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ notes }),
	})
	if (!res.ok) throw new Error(await parseError(res))
	return (await res.json()) as { imported: number; skipped: number }
}

export async function exportKnowledgeNoteMarkdown(noteId: string): Promise<string> {
	const res = await fetch(knowledgeUrl(`/notes/${noteId}/export`))
	if (!res.ok) throw new Error(await parseError(res))
	return await res.text()
}

export async function downloadKnowledgeVaultZip(): Promise<Blob> {
	const res = await fetch(knowledgeUrl('/export/vault'))
	if (!res.ok) throw new Error(await parseError(res))
	return await res.blob()
}

export async function downloadKnowledgeCollectionZip(collectionId: string): Promise<Blob> {
	const res = await fetch(knowledgeUrl(`/export/collection/${collectionId}`))
	if (!res.ok) throw new Error(await parseError(res))
	return await res.blob()
}
