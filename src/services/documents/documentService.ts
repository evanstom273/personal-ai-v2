import { getAllValues } from '@/storage/storageService'
import {
	createKnowledgeCollection,
	createKnowledgeNote,
	deleteKnowledgeNote,
	exportKnowledgeNoteMarkdown,
	fetchKnowledgeBacklinks,
	fetchKnowledgeCollections,
	fetchKnowledgeNote,
	fetchKnowledgeNotes,
	fetchKnowledgeRelated,
	fetchOrCreateDailyNote,
	importKnowledgeNotesBatch,
	searchKnowledgeNotes,
	updateKnowledgeNote,
} from '@/services/knowledge/knowledgeApi'
import {
	isMigrationComplete,
	markMigrationComplete,
	MIGRATION_FLAGS,
	requirePersonalAiServer,
} from '@/services/personalaiServer'
import type { DocumentRecord, KnowledgeCollection } from '@/storage/types'
import {
	normalizeDocumentRecord,
	resolveCreateDocumentDefaults,
	type CreateDocumentDefaults,
} from '@/utils/documentContent'

const listeners = new Set<() => void>()

export function subscribeDocumentsChanged(listener: () => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

export function notifyDocumentsChanged(): void {
	for (const listener of listeners) {
		listener()
	}
}

function sortDocuments(documents: DocumentRecord[]): DocumentRecord[] {
	return [...documents].sort((a, b) => b.updatedAt - a.updatedAt)
}

async function migrateIndexedDbToServerIfNeeded(): Promise<void> {
	if (isMigrationComplete(MIGRATION_FLAGS.knowledge)) return

	const localDocs = (await getAllValues<DocumentRecord>('documents')).map(
		normalizeDocumentRecord,
	)
	if (localDocs.length === 0) {
		markMigrationComplete(MIGRATION_FLAGS.knowledge)
		return
	}

	await importKnowledgeNotesBatch(
		localDocs.map((doc) => ({
			id: doc.id,
			title: doc.title,
			content: doc.content,
			source: doc.source,
			contentFormat: doc.contentFormat,
			readOnly: doc.readOnly,
		})),
	)

	markMigrationComplete(MIGRATION_FLAGS.knowledge)
}

async function ensureKnowledgeReady(): Promise<void> {
	requirePersonalAiServer()
	await migrateIndexedDbToServerIfNeeded()
}

export async function listCollections(): Promise<KnowledgeCollection[]> {
	await ensureKnowledgeReady()
	return fetchKnowledgeCollections()
}

export async function createCollection(
	name: string,
	parentId?: string,
): Promise<KnowledgeCollection> {
	await ensureKnowledgeReady()
	return createKnowledgeCollection({ name, parentId })
}

export async function listDocuments(query?: string): Promise<DocumentRecord[]> {
	await ensureKnowledgeReady()
	const notes = await fetchKnowledgeNotes({ query })
	return sortDocuments(notes.map(normalizeDocumentRecord))
}

export async function getDocument(id: string): Promise<DocumentRecord | undefined> {
	await ensureKnowledgeReady()
	const note = await fetchKnowledgeNote(id)
	return note ? normalizeDocumentRecord(note) : undefined
}

export async function findDocumentByTitle(title: string): Promise<DocumentRecord | undefined> {
	const normalized = title.trim().toLowerCase()
	const documents = await listDocuments()
	return documents.find((document) => document.title.trim().toLowerCase() === normalized)
}

export async function resolveDocumentRef(
	ref: { documentId?: string; title?: string },
): Promise<DocumentRecord | undefined> {
	if (ref.documentId) {
		const byId = await getDocument(ref.documentId)
		if (byId) return byId
	}

	if (ref.title) {
		return findDocumentByTitle(ref.title)
	}

	return undefined
}

export async function createDocument(
	title: string,
	content = '',
	options: CreateDocumentDefaults = {},
): Promise<DocumentRecord> {
	const defaults = resolveCreateDocumentDefaults(options)

	await ensureKnowledgeReady()
	const note = await createKnowledgeNote({
		title,
		content,
		source: defaults.source,
		contentFormat: defaults.contentFormat,
		readOnly: defaults.readOnly,
		collectionId: options.collectionId,
		tags: options.tags,
		lastEditedBy: options.lastEditedBy,
	})
	notifyDocumentsChanged()
	return normalizeDocumentRecord(note)
}

export async function updateDocument(
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
	await ensureKnowledgeReady()
	const note = await updateKnowledgeNote(id, updates)
	notifyDocumentsChanged()
	return normalizeDocumentRecord(note)
}

export async function renameDocument(id: string, title: string): Promise<DocumentRecord> {
	return updateDocument(id, { title })
}

export async function deleteDocument(id: string): Promise<void> {
	await ensureKnowledgeReady()
	await deleteKnowledgeNote(id)
	notifyDocumentsChanged()
}

export async function duplicateDocument(id: string): Promise<DocumentRecord> {
	const existing = await getDocument(id)
	if (!existing) throw new Error(`Document not found: ${id}`)

	return createDocument(`${existing.title} (copy)`, existing.content, {
		source: 'user',
		contentFormat: existing.contentFormat,
		readOnly: false,
		collectionId: existing.collectionId,
		tags: existing.tags,
	})
}

export async function searchDocuments(query: string, limit = 30): Promise<DocumentRecord[]> {
	await ensureKnowledgeReady()
	const notes = await searchKnowledgeNotes(query, limit)
	return sortDocuments(notes.map(normalizeDocumentRecord))
}

export async function getDocumentBacklinks(id: string): Promise<DocumentRecord[]> {
	await ensureKnowledgeReady()
	const notes = await fetchKnowledgeBacklinks(id)
	return notes.map(normalizeDocumentRecord)
}

export async function getRelatedDocuments(id: string): Promise<DocumentRecord[]> {
	await ensureKnowledgeReady()
	const notes = await fetchKnowledgeRelated(id)
	return notes.map(normalizeDocumentRecord)
}

export async function openDailyNote(date?: string): Promise<DocumentRecord> {
	await ensureKnowledgeReady()
	const note = await fetchOrCreateDailyNote(date)
	notifyDocumentsChanged()
	return normalizeDocumentRecord(note)
}

export async function exportDocumentMarkdown(id: string): Promise<string> {
	await ensureKnowledgeReady()
	return exportKnowledgeNoteMarkdown(id)
}

export async function archiveDocument(id: string): Promise<DocumentRecord> {
	return updateDocument(id, { archived: true })
}
