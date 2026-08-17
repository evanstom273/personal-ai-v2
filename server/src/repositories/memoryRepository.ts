import { randomUUID } from 'node:crypto'
import type { PersonalAiDatabase } from '../db/types.js'

export type MemoryCategory = 'preference' | 'fact' | 'project' | 'decision' | 'other'

export interface MemoryRow {
	id: string
	content: string
	category: MemoryCategory
	archived_from_message_count: number
	archived: number
	created_at: number
	updated_at: number
}

export interface MemoryEntry {
	id: string
	content: string
	category: MemoryCategory
	archivedFromMessageCount: number
	archived: boolean
	createdAt: number
	updatedAt: number
}

function mapMemoryRow(row: MemoryRow): MemoryEntry {
	return {
		id: row.id,
		content: row.content,
		category: row.category,
		archivedFromMessageCount: row.archived_from_message_count,
		archived: row.archived === 1,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

export function listMemories(db: PersonalAiDatabase, query?: string): MemoryEntry[] {
	const rows = db
		.prepare(
			`SELECT id, content, category, archived_from_message_count, archived, created_at, updated_at
			 FROM memories
			 ORDER BY created_at DESC`,
		)
		.all() as MemoryRow[]

	let entries = rows.map(mapMemoryRow)

	if (query?.trim()) {
		const q = query.trim().toLowerCase()
		entries = entries.filter(
			(entry) =>
				entry.content.toLowerCase().includes(q) ||
				entry.category.toLowerCase().includes(q),
		)
	}

	return entries
}

export function getMemory(db: PersonalAiDatabase, id: string): MemoryEntry | undefined {
	const row = db
		.prepare(
			`SELECT id, content, category, archived_from_message_count, archived, created_at, updated_at
			 FROM memories WHERE id = ?`,
		)
		.get(id) as MemoryRow | undefined

	return row ? mapMemoryRow(row) : undefined
}

export function createMemory(
	db: PersonalAiDatabase,
	input: {
		id?: string
		content: string
		category: MemoryCategory
		archivedFromMessageCount?: number
		archived?: boolean
		createdAt?: number
	},
): MemoryEntry {
	const now = input.createdAt ?? Date.now()
	const id = input.id ?? randomUUID()
	const content = input.content.trim()
	if (!content) throw new Error('Memory content is required.')

	db.prepare(
		`INSERT INTO memories (
			id, content, category, archived_from_message_count, archived, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?)`,
	).run(
		id,
		content,
		input.category,
		input.archivedFromMessageCount ?? 0,
		input.archived ? 1 : 0,
		now,
		now,
	)

	return getMemory(db, id)!
}

export function addMemoriesBatch(
	db: PersonalAiDatabase,
	entries: Array<{
		id?: string
		content: string
		category: MemoryCategory
		archivedFromMessageCount?: number
		archived?: boolean
		createdAt?: number
	}>,
): MemoryEntry[] {
	const created: MemoryEntry[] = []
	for (const entry of entries) {
		if (!entry.content.trim()) continue
		if (entry.id && getMemory(db, entry.id)) continue
		created.push(createMemory(db, entry))
	}
	return created
}

export function deleteMemory(db: PersonalAiDatabase, id: string): boolean {
	const result = db.prepare('DELETE FROM memories WHERE id = ?').run(id)
	return result.changes > 0
}

export function clearAllMemories(db: PersonalAiDatabase): void {
	db.prepare('DELETE FROM memories').run()
}

export function importMemoriesBatch(
	db: PersonalAiDatabase,
	entries: MemoryEntry[],
): { imported: number; skipped: number } {
	let imported = 0
	let skipped = 0

	for (const entry of entries) {
		if (getMemory(db, entry.id)) {
			skipped += 1
			continue
		}

		const duplicate = listMemories(db).find(
			(item) => item.content.toLowerCase() === entry.content.toLowerCase(),
		)
		if (duplicate) {
			skipped += 1
			continue
		}

		createMemory(db, {
			id: entry.id,
			content: entry.content,
			category: entry.category,
			archivedFromMessageCount: entry.archivedFromMessageCount,
			archived: entry.archived,
			createdAt: entry.createdAt,
		})
		imported += 1
	}

	return { imported, skipped }
}

export function mapMemoryToApi(entry: MemoryEntry) {
	return {
		id: entry.id,
		content: entry.content,
		category: entry.category,
		archivedFromMessageCount: entry.archivedFromMessageCount,
		archived: entry.archived,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
	}
}
