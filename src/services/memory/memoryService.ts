import {
	deleteValue,
	getAllValues,
	getValue,
	setValue,
} from '@/storage/storageService'
import type { MemoryCategory, MemoryEntry } from '@/storage/types'

const listeners = new Set<() => void>()

export function subscribeMemoryChanged(listener: () => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

export function notifyMemoryChanged(): void {
	for (const listener of listeners) {
		listener()
	}
}

function sortMemoryEntries(entries: MemoryEntry[]): MemoryEntry[] {
	return [...entries].sort((a, b) => b.createdAt - a.createdAt)
}

export async function listMemoryEntries(): Promise<MemoryEntry[]> {
	const entries = await getAllValues<MemoryEntry>('memories')
	return sortMemoryEntries(entries)
}

export async function getMemoryEntry(
	id: string,
): Promise<MemoryEntry | undefined> {
	return getValue<MemoryEntry>('memories', id)
}

export async function addMemoryEntries(
	entries: Array<Pick<MemoryEntry, 'content' | 'category' | 'archivedFromMessageCount'>>,
): Promise<MemoryEntry[]> {
	const now = Date.now()
	const created = entries.map((entry) => {
		const record: MemoryEntry = {
			id: crypto.randomUUID(),
			content: entry.content.trim(),
			category: entry.category,
			archivedFromMessageCount: entry.archivedFromMessageCount,
			createdAt: now,
		}
		return record
	})

	for (const entry of created) {
		if (entry.content) {
			await setValue('memories', entry.id, entry)
		}
	}

	if (created.some((entry) => entry.content)) {
		notifyMemoryChanged()
	}

	return created.filter((entry) => entry.content)
}

export async function clearAllMemory(): Promise<void> {
	const entries = await listMemoryEntries()
	await Promise.all(entries.map((entry) => deleteValue('memories', entry.id)))
	notifyMemoryChanged()
}

export function isMemoryCategory(value: string): value is MemoryCategory {
	return (
		value === 'preference' ||
		value === 'fact' ||
		value === 'project' ||
		value === 'decision' ||
		value === 'other'
	)
}
