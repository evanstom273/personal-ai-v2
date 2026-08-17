import {
	deleteValue,
	getAllValues,
	getValue,
	setValue,
} from '@/storage/storageService'
import type { LibraryMediaKind, LibraryMediaRecord, MessageMedia } from '@/storage/types'

const listeners = new Set<() => void>()

export function subscribeLibraryMediaChanged(listener: () => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

function notifyLibraryMediaChanged(): void {
	for (const listener of listeners) {
		listener()
	}
}

function sortMedia(items: LibraryMediaRecord[]): LibraryMediaRecord[] {
	return [...items].sort((a, b) => b.createdAt - a.createdAt)
}

function messageTypeToKind(type: MessageMedia['type']): LibraryMediaKind {
	return type
}

function buildMediaTitle(
	kind: LibraryMediaKind,
	prompt: string | undefined,
	fallbackName: string | undefined,
): string {
	const fromPrompt = prompt?.trim().slice(0, 80)
	if (fromPrompt) {
		return fromPrompt
	}

	if (fallbackName?.trim()) {
		return fallbackName.trim()
	}

	const label = kind === 'image' ? 'Image' : 'Music'
	return `${label} ${new Date().toLocaleString()}`
}

export async function listLibraryMedia(
	kind?: LibraryMediaKind,
	query?: string,
): Promise<LibraryMediaRecord[]> {
	let items = sortMedia(await getAllValues<LibraryMediaRecord>('libraryMedia'))

	if (kind) {
		items = items.filter((item) => item.kind === kind)
	}

	if (query?.trim()) {
		const normalized = query.trim().toLowerCase()
		items = items.filter((item) => item.title.toLowerCase().includes(normalized))
	}

	return items
}

export async function getLibraryMediaItem(
	id: string,
): Promise<LibraryMediaRecord | undefined> {
	return getValue<LibraryMediaRecord>('libraryMedia', id)
}

export async function saveMediaToLibrary(params: {
	title?: string
	kind: LibraryMediaKind
	mimeType: string
	dataUrl: string
	source: LibraryMediaRecord['source']
	prompt?: string
}): Promise<LibraryMediaRecord> {
	const now = Date.now()
	const item: LibraryMediaRecord = {
		id: crypto.randomUUID(),
		title: buildMediaTitle(params.kind, params.prompt, params.title),
		kind: params.kind,
		mimeType: params.mimeType,
		dataUrl: params.dataUrl,
		source: params.source,
		prompt: params.prompt?.trim() || undefined,
		createdAt: now,
		updatedAt: now,
	}

	await setValue('libraryMedia', item.id, item)
	notifyLibraryMediaChanged()
	return item
}

export async function saveMessageMediaToLibrary(
	media: MessageMedia[],
	options: {
		source: LibraryMediaRecord['source']
		prompt?: string
		titlePrefix?: string
	},
): Promise<LibraryMediaRecord[]> {
	const saved: LibraryMediaRecord[] = []

	for (const [index, item] of media.entries()) {
		const savedItem = await saveMediaToLibrary({
			title:
				media.length > 1 && options.titlePrefix
					? `${options.titlePrefix} ${index + 1}`
					: options.titlePrefix,
			kind: messageTypeToKind(item.type),
			mimeType: item.mimeType,
			dataUrl: item.dataUrl,
			source: options.source,
			prompt: options.prompt,
		})
		saved.push(savedItem)
	}

	return saved
}

export async function renameLibraryMediaItem(
	id: string,
	title: string,
): Promise<LibraryMediaRecord> {
	const existing = await getLibraryMediaItem(id)
	if (!existing) {
		throw new Error(`Library item not found: ${id}`)
	}

	const updated: LibraryMediaRecord = {
		...existing,
		title: title.trim() || existing.title,
		updatedAt: Date.now(),
	}

	await setValue('libraryMedia', id, updated)
	notifyLibraryMediaChanged()
	return updated
}

export async function deleteLibraryMediaItem(id: string): Promise<void> {
	await deleteValue('libraryMedia', id)
	notifyLibraryMediaChanged()
}
