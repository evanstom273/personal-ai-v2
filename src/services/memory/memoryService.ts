import { getAllValues } from '@/storage/storageService'
import {
	addMemoriesBatchApi,
	clearAllMemoriesApi,
	fetchMemories,
	importMemoriesBatch,
} from '@/services/memory/memoriesApi'
import {
	isMigrationComplete,
	markMigrationComplete,
	MIGRATION_FLAGS,
	requirePersonalAiServer,
} from '@/services/personalaiServer'
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

function normalizeMemory(entry: MemoryEntry): MemoryEntry {
	return {
		...entry,
		updatedAt: entry.updatedAt ?? entry.createdAt,
		archived: entry.archived ?? false,
	}
}

function sortMemoryEntries(entries: MemoryEntry[]): MemoryEntry[] {
	return [...entries].sort((a, b) => b.createdAt - a.createdAt)
}

async function migrateIndexedDbToServerIfNeeded(): Promise<void> {
	if (isMigrationComplete(MIGRATION_FLAGS.memories)) return

	const local = (await getAllValues<MemoryEntry>('memories')).map(normalizeMemory)
	if (local.length === 0) {
		markMigrationComplete(MIGRATION_FLAGS.memories)
		return
	}

	await importMemoriesBatch(local)
	markMigrationComplete(MIGRATION_FLAGS.memories)
}

async function ensureReady(): Promise<void> {
	requirePersonalAiServer()
	await migrateIndexedDbToServerIfNeeded()
}

export async function listMemoryEntries(): Promise<MemoryEntry[]> {
	await ensureReady()
	return sortMemoryEntries((await fetchMemories()).map(normalizeMemory))
}

export async function getMemoryEntry(id: string): Promise<MemoryEntry | undefined> {
	await ensureReady()
	const entries = await listMemoryEntries()
	return entries.find((entry) => entry.id === id)
}

export async function addMemoryEntries(
	entries: Array<Pick<MemoryEntry, 'content' | 'category' | 'archivedFromMessageCount'>>,
): Promise<MemoryEntry[]> {
	await ensureReady()
	const created = await addMemoriesBatchApi(entries)
	if (created.length > 0) {
		notifyMemoryChanged()
		const { consolidateAutomaticLivingNotes } = await import(
			'@/services/knowledge/livingNoteService'
		)
		void consolidateAutomaticLivingNotes()
	}
	return created.map(normalizeMemory)
}

export async function clearAllMemory(): Promise<void> {
	await ensureReady()
	await clearAllMemoriesApi()
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
