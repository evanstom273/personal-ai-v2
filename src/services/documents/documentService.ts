import {
	deleteValue,
	getAllValues,
	getValue,
	setValue,
} from '@/storage/storageService'
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
	isKnowledgeServerConfigured,
	searchKnowledgeNotes,
	updateKnowledgeNote,
} from '@/services/knowledge/knowledgeApi'
import type { DocumentRecord, KnowledgeCollection } from '@/storage/types'
import {
	normalizeDocumentRecord,
	resolveCreateDocumentDefaults,
	type CreateDocumentDefaults,
} from '@/utils/documentContent'

const MIGRATION_FLAG_KEY = 'knowledge_idb_migrated_v1'

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
	if (!isKnowledgeServerConfigured()) return
	if (localStorage.getItem(MIGRATION_FLAG_KEY) === '1') return

	const localDocs = (await getAllValues<DocumentRecord>('documents')).map(
		normalizeDocumentRecord,
	)
	if (localDocs.length === 0) {
		localStorage.setItem(MIGRATION_FLAG_KEY, '1')
		return
	}

	const result = await importKnowledgeNotesBatch(
		localDocs.map((doc) => ({
			id: doc.id,
			title: doc.title,
			content: doc.content,
			source: doc.source,
			contentFormat: doc.contentFormat,
			readOnly: doc.readOnly,
		})),
	)

	if (result.imported > 0) {
		notifyDocumentsChanged()
	}

	localStorage.setItem(MIGRATION_FLAG_KEY, '1')
}

async function ensureKnowledgeReady(): Promise<void> {
	if (!isKnowledgeServerConfigured()) {
		throw new Error('PersonalAI server is not configured. Set your local connection in Settings.')
	}
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
	if (!isKnowledgeServerConfigured()) {
		const documents = sortDocuments(
			(await getAllValues<DocumentRecord>('documents')).map(normalizeDocumentRecord),
		)
		if (!query?.trim()) return documents
		const normalized = query.trim().toLowerCase()
		return documents.filter((document) =>
			document.title.toLowerCase().includes(normalized),
		)
	}

	await ensureKnowledgeReady()
	const notes = await fetchKnowledgeNotes({ query })
	return sortDocuments(notes.map(normalizeDocumentRecord))
}

export async function getDocument(id: string): Promise<DocumentRecord | undefined> {
	if (!isKnowledgeServerConfigured()) {
		const document = await getValue<DocumentRecord>('documents', id)
		return document ? normalizeDocumentRecord(document) : undefined
	}

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

	if (!isKnowledgeServerConfigured()) {
		const now = Date.now()
		const document: DocumentRecord = {
			id: crypto.randomUUID(),
			title: title.trim() || 'Untitled document',
			content,
			source: defaults.source,
			contentFormat: defaults.contentFormat,
			readOnly: defaults.readOnly,
			createdAt: now,
			updatedAt: now,
		}
		await setValue('documents', document.id, document)
		notifyDocumentsChanged()
		return document
	}

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
			'title' | 'content' | 'collectionId' | 'pinned' | 'archived' | 'tags' | 'lastEditedBy'
		>
	> & { saveRevision?: boolean },
): Promise<DocumentRecord> {
	if (!isKnowledgeServerConfigured()) {
		const existing = await getDocument(id)
		if (!existing) throw new Error(`Document not found: ${id}`)
		if (existing.readOnly && updates.content !== undefined) {
			throw new Error('This document is read-only.')
		}

		const updated: DocumentRecord = {
			...existing,
			...updates,
			title: updates.title?.trim() ? updates.title.trim() : existing.title,
			updatedAt: Date.now(),
		}
		await setValue('documents', id, updated)
		notifyDocumentsChanged()
		return updated
	}

	await ensureKnowledgeReady()
	const note = await updateKnowledgeNote(id, updates)
	notifyDocumentsChanged()
	return normalizeDocumentRecord(note)
}

export async function renameDocument(id: string, title: string): Promise<DocumentRecord> {
	return updateDocument(id, { title })
}

export async function deleteDocument(id: string): Promise<void> {
	if (!isKnowledgeServerConfigured()) {
		await deleteValue('documents', id)
		notifyDocumentsChanged()
		return
	}

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
	if (!isKnowledgeServerConfigured()) {
		return listDocuments(query)
	}

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
