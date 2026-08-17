import {
	deleteValue,
	getAllValues,
	getValue,
	setValue,
} from '@/storage/storageService'
import type { DocumentRecord } from '@/storage/types'
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

export async function listDocuments(query?: string): Promise<DocumentRecord[]> {
	const documents = sortDocuments(
		(await getAllValues<DocumentRecord>('documents')).map(normalizeDocumentRecord),
	)

	if (!query?.trim()) {
		return documents
	}

	const normalized = query.trim().toLowerCase()
	return documents.filter((document) =>
		document.title.toLowerCase().includes(normalized),
	)
}

export async function getDocument(
	id: string,
): Promise<DocumentRecord | undefined> {
	const document = await getValue<DocumentRecord>('documents', id)
	return document ? normalizeDocumentRecord(document) : undefined
}

export async function findDocumentByTitle(
	title: string,
): Promise<DocumentRecord | undefined> {
	const normalized = title.trim().toLowerCase()
	const documents = await getAllValues<DocumentRecord>('documents')
	return documents
		.map(normalizeDocumentRecord)
		.find((document) => document.title.trim().toLowerCase() === normalized)
}

export async function resolveDocumentRef(
	ref: { documentId?: string; title?: string },
): Promise<DocumentRecord | undefined> {
	if (ref.documentId) {
		const byId = await getDocument(ref.documentId)
		if (byId) {
			return byId
		}
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
	const now = Date.now()
	const defaults = resolveCreateDocumentDefaults(options)
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

export async function updateDocument(
	id: string,
	updates: Partial<Pick<DocumentRecord, 'title' | 'content'>>,
): Promise<DocumentRecord> {
	const existing = await getDocument(id)
	if (!existing) {
		throw new Error(`Document not found: ${id}`)
	}

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

export async function renameDocument(
	id: string,
	title: string,
): Promise<DocumentRecord> {
	return updateDocument(id, { title })
}

export async function deleteDocument(id: string): Promise<void> {
	await deleteValue('documents', id)
	notifyDocumentsChanged()
}

export async function duplicateDocument(id: string): Promise<DocumentRecord> {
	const existing = await getDocument(id)
	if (!existing) {
		throw new Error(`Document not found: ${id}`)
	}

	return createDocument(`${existing.title} (copy)`, existing.content, {
		source: 'user',
		contentFormat: existing.contentFormat,
		readOnly: false,
	})
}
