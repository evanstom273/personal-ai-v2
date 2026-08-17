import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { strToU8, zipSync } from 'fflate'
import type { ServerConfig } from '../config.js'
import type { PersonalAiDatabase } from '../db/types.js'

export type KnowledgeSource = 'upload' | 'user' | 'assistant'
export type KnowledgeContentFormat = 'markdown' | 'html'
export type KnowledgeEditor = 'user' | 'assistant'
export type CollectionKind = 'folder' | 'system'

export interface KnowledgeCollectionRow {
	id: string
	name: string
	parent_id: string | null
	kind: CollectionKind
	system_key: string | null
	created_at: number
	updated_at: number
}

export interface KnowledgeNoteRow {
	id: string
	title: string
	content: string
	collection_id: string | null
	source: KnowledgeSource
	content_format: KnowledgeContentFormat
	read_only: number
	pinned: number
	archived: number
	daily_note_date: string | null
	last_edited_by: KnowledgeEditor
	living_note_mode: 'off' | 'suggest' | 'automatic'
	living_note_last_consolidated_at: number | null
	living_note_pending_content: string | null
	living_note_pending_summary: string | null
	created_at: number
	updated_at: number
}

export interface KnowledgeNoteWithMeta extends KnowledgeNoteRow {
	tags: string[]
}

const SYSTEM_COLLECTIONS = [
	{ systemKey: 'notes', name: 'Notes' },
	{ systemKey: 'projects', name: 'Projects' },
	{ systemKey: 'people', name: 'People' },
	{ systemKey: 'memory', name: 'Memory' },
	{ systemKey: 'daily_notes', name: 'Daily Notes' },
	{ systemKey: 'archive', name: 'Archive' },
] as const

const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

const NOTE_COLUMNS =
	'id, title, content, collection_id, source, content_format, read_only, pinned, archived, daily_note_date, last_edited_by, living_note_mode, living_note_last_consolidated_at, living_note_pending_content, living_note_pending_summary, created_at, updated_at'

function noteSelectColumns(alias?: string): string {
	const columns = NOTE_COLUMNS.split(',').map((column) => column.trim())
	if (!alias) return columns.join(', ')
	return columns.map((column) => `${alias}.${column}`).join(', ')
}

function mapNoteRow(
	row: KnowledgeNoteRow,
	tags: string[] = [],
): KnowledgeNoteWithMeta {
	return { ...row, tags }
}

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80) || 'note'
}

function extractWikiLinks(content: string): Array<{ targetTitle: string; linkText?: string }> {
	const links: Array<{ targetTitle: string; linkText?: string }> = []
	const seen = new Set<string>()
	let match: RegExpExecArray | null

	WIKI_LINK_PATTERN.lastIndex = 0
	while ((match = WIKI_LINK_PATTERN.exec(content)) !== null) {
		const targetTitle = match[1].trim()
		if (!targetTitle) continue
		const key = targetTitle.toLowerCase()
		if (seen.has(key)) continue
		seen.add(key)
		links.push({
			targetTitle,
			linkText: match[2]?.trim() || undefined,
		})
	}

	return links
}

function syncNoteFts(
	db: PersonalAiDatabase,
	noteId: string,
	title: string,
	content: string,
	tags: string[],
): void {
	db.prepare('DELETE FROM knowledge_notes_fts WHERE note_id = ?').run(noteId)
	db.prepare(
		`INSERT INTO knowledge_notes_fts (note_id, title, content, tags)
		 VALUES (?, ?, ?, ?)`,
	).run(noteId, title, content, tags.join(' '))
}

function syncNoteLinks(
	db: PersonalAiDatabase,
	noteId: string,
	content: string,
	now: number,
): void {
	db.prepare('DELETE FROM knowledge_links WHERE source_note_id = ?').run(noteId)

	for (const link of extractWikiLinks(content)) {
		const target = findNoteByTitle(db, link.targetTitle)
		db.prepare(
			`INSERT INTO knowledge_links (id, source_note_id, target_note_id, target_title, link_text, created_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		).run(
			randomUUID(),
			noteId,
			target?.id ?? null,
			link.targetTitle,
			link.linkText ?? null,
			now,
		)
	}
}

function getNoteTags(db: PersonalAiDatabase, noteId: string): string[] {
	return (
		db
			.prepare(
				`SELECT t.name FROM knowledge_tags t
				 INNER JOIN knowledge_note_tags nt ON nt.tag_id = t.id
				 WHERE nt.note_id = ?
				 ORDER BY t.name COLLATE NOCASE`,
			)
			.all(noteId) as { name: string }[]
	).map((row) => row.name)
}

function setNoteTags(db: PersonalAiDatabase, noteId: string, tagNames: string[], now: number): string[] {
	db.prepare('DELETE FROM knowledge_note_tags WHERE note_id = ?').run(noteId)

	const normalized = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))]
	for (const name of normalized) {
		const existing = db
			.prepare('SELECT id FROM knowledge_tags WHERE name = ? COLLATE NOCASE')
			.get(name) as { id: string } | undefined

		const tagId = existing?.id ?? randomUUID()
		if (!existing) {
			db.prepare('INSERT INTO knowledge_tags (id, name, created_at) VALUES (?, ?, ?)').run(
				tagId,
				name,
				now,
			)
		}

		db.prepare(
			'INSERT OR IGNORE INTO knowledge_note_tags (note_id, tag_id) VALUES (?, ?)',
		).run(noteId, tagId)
	}

	return normalized
}

function getCollectionPathSegments(
	db: PersonalAiDatabase,
	collectionId: string,
): string[] {
	const segments: string[] = []
	let currentId: string | null = collectionId

	while (currentId) {
		const row = db
			.prepare(
				'SELECT id, name, parent_id, system_key FROM knowledge_collections WHERE id = ?',
			)
			.get(currentId) as
			| { id: string; name: string; parent_id: string | null; system_key: string | null }
			| undefined

		if (!row) break
		if (row.system_key !== 'archive') {
			segments.unshift(row.name)
		}
		currentId = row.parent_id
	}

	return segments.length > 0 ? segments : ['Notes']
}

function writeNoteMarkdownFile(
	db: PersonalAiDatabase,
	config: ServerConfig,
	note: KnowledgeNoteRow,
	tags: string[],
): void {
	if (note.content_format !== 'markdown') {
		return
	}

	const collectionPath = note.collection_id
		? getCollectionPathSegments(db, note.collection_id)
		: ['Notes']

	const dir = join(config.knowledgeDir, ...collectionPath)
	mkdirSync(dir, { recursive: true })

	const frontmatter = [
		'---',
		`id: ${note.id}`,
		`title: ${note.title}`,
		tags.length > 0 ? `tags: [${tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(', ')}]` : null,
		note.daily_note_date ? `daily: ${note.daily_note_date}` : null,
		`updated: ${note.updated_at}`,
		'---',
		'',
	]
		.filter(Boolean)
		.join('\n')

	const filename = `${slugify(note.title)}-${note.id.slice(0, 8)}.md`
	writeFileSync(join(dir, filename), `${frontmatter}${note.content}`, 'utf-8')
}

export function seedSystemCollections(db: PersonalAiDatabase): void {
	const now = Date.now()
	for (const item of SYSTEM_COLLECTIONS) {
		const existing = db
			.prepare('SELECT id FROM knowledge_collections WHERE system_key = ?')
			.get(item.systemKey) as { id: string } | undefined

		if (existing) continue

		db.prepare(
			`INSERT INTO knowledge_collections (id, name, parent_id, kind, system_key, created_at, updated_at)
			 VALUES (?, ?, NULL, 'system', ?, ?, ?)`,
		).run(randomUUID(), item.name, item.systemKey, now, now)
	}
}

export function listCollections(db: PersonalAiDatabase): KnowledgeCollectionRow[] {
	return db
		.prepare(
			`SELECT id, name, parent_id, kind, system_key, created_at, updated_at
			 FROM knowledge_collections
			 ORDER BY kind DESC, name COLLATE NOCASE`,
		)
		.all() as KnowledgeCollectionRow[]
}

export function getCollection(
	db: PersonalAiDatabase,
	id: string,
): KnowledgeCollectionRow | undefined {
	return db
		.prepare(
			`SELECT id, name, parent_id, kind, system_key, created_at, updated_at
			 FROM knowledge_collections WHERE id = ?`,
		)
		.get(id) as KnowledgeCollectionRow | undefined
}

export function getCollectionBySystemKey(
	db: PersonalAiDatabase,
	systemKey: string,
): KnowledgeCollectionRow | undefined {
	return db
		.prepare(
			`SELECT id, name, parent_id, kind, system_key, created_at, updated_at
			 FROM knowledge_collections WHERE system_key = ?`,
		)
		.get(systemKey) as KnowledgeCollectionRow | undefined
}

export function createCollection(
	db: PersonalAiDatabase,
	input: {
		id?: string
		name: string
		parentId?: string
	},
): KnowledgeCollectionRow {
	const now = Date.now()
	const id = input.id ?? randomUUID()
	db.prepare(
		`INSERT INTO knowledge_collections (id, name, parent_id, kind, system_key, created_at, updated_at)
		 VALUES (?, ?, ?, 'folder', NULL, ?, ?)`,
	).run(id, input.name.trim(), input.parentId ?? null, now, now)
	return getCollection(db, id)!
}

export function listNotes(
	db: PersonalAiDatabase,
	filter?: {
		query?: string
		collectionId?: string
		includeArchived?: boolean
		pinnedOnly?: boolean
		tag?: string
		limit?: number
	},
): KnowledgeNoteWithMeta[] {
	const conditions: string[] = []
	const params: unknown[] = []

	if (!filter?.includeArchived) {
		conditions.push('n.archived = 0')
	}

	if (filter?.collectionId) {
		conditions.push('n.collection_id = ?')
		params.push(filter.collectionId)
	}

	if (filter?.pinnedOnly) {
		conditions.push('n.pinned = 1')
	}

	if (filter?.tag) {
		conditions.push(
			`EXISTS (
				SELECT 1 FROM knowledge_note_tags nt
				INNER JOIN knowledge_tags t ON t.id = nt.tag_id
				WHERE nt.note_id = n.id AND t.name = ? COLLATE NOCASE
			)`,
		)
		params.push(filter.tag)
	}

	if (filter?.query?.trim()) {
		const q = `%${filter.query.trim().toLowerCase()}%`
		conditions.push('(LOWER(n.title) LIKE ? OR LOWER(n.content) LIKE ?)')
		params.push(q, q)
	}

	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
	const limit = filter?.limit ?? 500

	const rows = db
		.prepare(
			`SELECT ${noteSelectColumns('n')}
			 FROM knowledge_notes n
			 ${where}
			 ORDER BY n.pinned DESC, n.updated_at DESC
			 LIMIT ?`,
		)
		.all(...params, limit) as KnowledgeNoteRow[]

	return rows.map((row) => mapNoteRow(row, getNoteTags(db, row.id)))
}

export function getNote(db: PersonalAiDatabase, id: string): KnowledgeNoteWithMeta | undefined {
	const row = db
		.prepare(
			`SELECT ${noteSelectColumns()}
			 FROM knowledge_notes WHERE id = ?`,
		)
		.get(id) as KnowledgeNoteRow | undefined

	return row ? mapNoteRow(row, getNoteTags(db, row.id)) : undefined
}

export function findNoteByTitle(
	db: PersonalAiDatabase,
	title: string,
): KnowledgeNoteWithMeta | undefined {
	const normalized = title.trim().toLowerCase()
	const row = db
		.prepare(
			`SELECT ${noteSelectColumns()}
			 FROM knowledge_notes
			 WHERE LOWER(TRIM(title)) = ?
			 ORDER BY updated_at DESC
			 LIMIT 1`,
		)
		.get(normalized) as KnowledgeNoteRow | undefined

	return row ? mapNoteRow(row, getNoteTags(db, row.id)) : undefined
}

export function createNote(
	db: PersonalAiDatabase,
	config: ServerConfig,
	input: {
		id?: string
		title: string
		content?: string
		collectionId?: string
		source?: KnowledgeSource
		contentFormat?: KnowledgeContentFormat
		readOnly?: boolean
		pinned?: boolean
		archived?: boolean
		dailyNoteDate?: string
		tags?: string[]
		editor?: KnowledgeEditor
	},
): KnowledgeNoteWithMeta {
	const now = Date.now()
	const id = input.id ?? randomUUID()
	const title = input.title.trim() || 'Untitled note'
	const content = input.content ?? ''
	const tags = setNoteTags(db, id, input.tags ?? [], now)

	db.prepare(
		`INSERT INTO knowledge_notes (
			id, title, content, collection_id, source, content_format, read_only, pinned, archived,
			daily_note_date, last_edited_by, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
		id,
		title,
		content,
		input.collectionId ?? null,
		input.source ?? 'user',
		input.contentFormat ?? 'markdown',
		input.readOnly ? 1 : 0,
		input.pinned ? 1 : 0,
		input.archived ? 1 : 0,
		input.dailyNoteDate ?? null,
		input.editor ?? 'user',
		now,
		now,
	)

	syncNoteFts(db, id, title, content, tags)
	syncNoteLinks(db, id, content, now)

	const note = getNote(db, id)!
	writeNoteMarkdownFile(db, config, note, tags)
	return note
}

export function updateNote(
	db: PersonalAiDatabase,
	config: ServerConfig,
	id: string,
	updates: {
		title?: string
		content?: string
		collectionId?: string | null
		pinned?: boolean
		archived?: boolean
		tags?: string[]
		editor?: KnowledgeEditor
		saveRevision?: boolean
		livingNoteMode?: 'off' | 'suggest' | 'automatic'
		livingNotePendingContent?: string | null
		livingNotePendingSummary?: string | null
		livingNoteLastConsolidatedAt?: number | null
	},
): KnowledgeNoteWithMeta | undefined {
	const existing = getNote(db, id)
	if (!existing) return undefined

	if (existing.read_only === 1 && updates.content !== undefined) {
		throw new Error('This note is read-only.')
	}

	const now = Date.now()
	const title = updates.title?.trim() ? updates.title.trim() : existing.title
	const content = updates.content ?? existing.content
	const editor = updates.editor ?? 'user'

	if (updates.saveRevision && updates.content !== undefined && updates.content !== existing.content) {
		db.prepare(
			`INSERT INTO knowledge_revisions (id, note_id, title, content, editor, created_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		).run(randomUUID(), id, existing.title, existing.content, editor, now)
	}

	const tags =
		updates.tags !== undefined
			? setNoteTags(db, id, updates.tags, now)
			: existing.tags

	db.prepare(
		`UPDATE knowledge_notes SET
			title = ?,
			content = ?,
			collection_id = ?,
			pinned = ?,
			archived = ?,
			last_edited_by = ?,
			living_note_mode = ?,
			living_note_pending_content = ?,
			living_note_pending_summary = ?,
			living_note_last_consolidated_at = ?,
			updated_at = ?
		 WHERE id = ?`,
	).run(
		title,
		content,
		updates.collectionId !== undefined
			? updates.collectionId
			: existing.collection_id,
		updates.pinned !== undefined ? (updates.pinned ? 1 : 0) : existing.pinned,
		updates.archived !== undefined ? (updates.archived ? 1 : 0) : existing.archived,
		editor,
		updates.livingNoteMode ?? existing.living_note_mode,
		updates.livingNotePendingContent !== undefined
			? updates.livingNotePendingContent
			: existing.living_note_pending_content,
		updates.livingNotePendingSummary !== undefined
			? updates.livingNotePendingSummary
			: existing.living_note_pending_summary,
		updates.livingNoteLastConsolidatedAt !== undefined
			? updates.livingNoteLastConsolidatedAt
			: existing.living_note_last_consolidated_at,
		now,
		id,
	)

	syncNoteFts(db, id, title, content, tags)
	syncNoteLinks(db, id, content, now)

	const note = getNote(db, id)!
	writeNoteMarkdownFile(db, config, note, tags)
	return note
}

export function deleteNote(db: PersonalAiDatabase, id: string): boolean {
	db.prepare('DELETE FROM knowledge_notes_fts WHERE note_id = ?').run(id)
	const result = db.prepare('DELETE FROM knowledge_notes WHERE id = ?').run(id)
	return result.changes > 0
}

export function searchKnowledge(
	db: PersonalAiDatabase,
	query: string,
	limit = 30,
): KnowledgeNoteWithMeta[] {
	const trimmed = query.trim()
	if (!trimmed) {
		return listNotes(db, { limit })
	}

	const ftsQuery = trimmed
		.split(/\s+/)
		.filter(Boolean)
		.map((term) => `"${term.replace(/"/g, '')}"*`)
		.join(' ')

	try {
		const ids = (
			db
				.prepare(
					`SELECT note_id FROM knowledge_notes_fts
					 WHERE knowledge_notes_fts MATCH ?
					 ORDER BY rank
					 LIMIT ?`,
				)
				.all(ftsQuery, limit) as { note_id: string }[]
		).map((row) => row.note_id)

		if (ids.length === 0) {
			return listNotes(db, { query: trimmed, limit })
		}

		return ids
			.map((id) => getNote(db, id))
			.filter((note): note is KnowledgeNoteWithMeta => note !== undefined)
	} catch {
		return listNotes(db, { query: trimmed, limit })
	}
}

export function getBacklinks(db: PersonalAiDatabase, noteId: string): KnowledgeNoteWithMeta[] {
	const note = getNote(db, noteId)
	if (!note) return []

	const rows = db
		.prepare(
			`SELECT DISTINCT n.id, n.title, n.content, n.collection_id, n.source, n.content_format,
			        n.read_only, n.pinned, n.archived, n.daily_note_date, n.last_edited_by,
			        n.created_at, n.updated_at
			 FROM knowledge_links l
			 INNER JOIN knowledge_notes n ON n.id = l.source_note_id
			 WHERE l.target_note_id = ? OR (l.target_note_id IS NULL AND LOWER(l.target_title) = LOWER(?))
			 ORDER BY n.updated_at DESC`,
		)
		.all(noteId, note.title) as KnowledgeNoteRow[]

	return rows.map((row) => mapNoteRow(row, getNoteTags(db, row.id)))
}

export function getRelatedNotes(
	db: PersonalAiDatabase,
	noteId: string,
	limit = 8,
): KnowledgeNoteWithMeta[] {
	const note = getNote(db, noteId)
	if (!note) return []

	const relatedIds = new Set<string>()
	const results: KnowledgeNoteWithMeta[] = []

	// Direct outbound links
	const outbound = db
		.prepare(
			`SELECT target_note_id FROM knowledge_links
			 WHERE source_note_id = ? AND target_note_id IS NOT NULL`,
		)
		.all(noteId) as { target_note_id: string }[]

	for (const row of outbound) {
		if (row.target_note_id && row.target_note_id !== noteId) {
			relatedIds.add(row.target_note_id)
		}
	}

	// Backlinks
	for (const backlink of getBacklinks(db, noteId)) {
		if (backlink.id !== noteId) {
			relatedIds.add(backlink.id)
		}
	}

	// Shared tags
	if (note.tags.length > 0) {
		for (const tag of note.tags) {
			for (const tagged of listNotes(db, { tag, limit: 20 })) {
				if (tagged.id !== noteId) {
					relatedIds.add(tagged.id)
				}
			}
		}
	}

	// Same collection
	if (note.collection_id) {
		for (const sibling of listNotes(db, { collectionId: note.collection_id, limit: 20 })) {
			if (sibling.id !== noteId) {
				relatedIds.add(sibling.id)
			}
		}
	}

	for (const id of relatedIds) {
		if (results.length >= limit) break
		const related = getNote(db, id)
		if (related) {
			results.push(related)
		}
	}

	return results
}

export function getOrCreateDailyNote(
	db: PersonalAiDatabase,
	config: ServerConfig,
	date: string,
): KnowledgeNoteWithMeta {
	const existing = db
		.prepare(
			`SELECT ${noteSelectColumns()}
			 FROM knowledge_notes WHERE daily_note_date = ?`,
		)
		.get(date) as KnowledgeNoteRow | undefined

	if (existing) {
		return mapNoteRow(existing, getNoteTags(db, existing.id))
	}

	const dailyRoot = getCollectionBySystemKey(db, 'daily_notes')
	let yearCollectionId: string | undefined

	if (dailyRoot) {
		const year = date.slice(0, 4)
		const yearRow = db
			.prepare(
				`SELECT id FROM knowledge_collections
				 WHERE parent_id = ? AND name = ?`,
			)
			.get(dailyRoot.id, year) as { id: string } | undefined

		if (yearRow) {
			yearCollectionId = yearRow.id
		} else {
			const created = createCollection(db, {
				name: year,
				parentId: dailyRoot.id,
			})
			yearCollectionId = created.id
		}
	}

	return createNote(db, config, {
		title: date,
		content: '',
		collectionId: yearCollectionId,
		dailyNoteDate: date,
		tags: ['daily'],
	})
}

export function listRevisions(
	db: PersonalAiDatabase,
	noteId: string,
	limit = 20,
): Array<{ id: string; title: string; content: string; editor: KnowledgeEditor; createdAt: number }> {
	return (
		db
			.prepare(
				`SELECT id, title, content, editor, created_at
				 FROM knowledge_revisions
				 WHERE note_id = ?
				 ORDER BY created_at DESC
				 LIMIT ?`,
			)
			.all(noteId, limit) as Array<{
			id: string
			title: string
			content: string
			editor: KnowledgeEditor
			created_at: number
		}>
	).map((row) => ({
		id: row.id,
		title: row.title,
		content: row.content,
		editor: row.editor,
		createdAt: row.created_at,
	}))
}

export function importNotesBatch(
	db: PersonalAiDatabase,
	config: ServerConfig,
	notes: Array<{
		id?: string
		title: string
		content: string
		source?: KnowledgeSource
		contentFormat?: KnowledgeContentFormat
		readOnly?: boolean
		createdAt?: number
		updatedAt?: number
	}>,
): { imported: number; skipped: number } {
	let imported = 0
	let skipped = 0

	for (const item of notes) {
		if (item.id && getNote(db, item.id)) {
			skipped += 1
			continue
		}

		const byTitle = findNoteByTitle(db, item.title)
		if (byTitle) {
			skipped += 1
			continue
		}

		const notesCollection = getCollectionBySystemKey(db, 'notes')
		createNote(db, config, {
			id: item.id,
			title: item.title,
			content: item.content,
			collectionId: notesCollection?.id,
			source: item.source,
			contentFormat: item.contentFormat,
			readOnly: item.readOnly,
		})
		imported += 1
	}

	return { imported, skipped }
}

export function exportNoteMarkdown(note: KnowledgeNoteWithMeta): string {
	const tagsLine =
		note.tags.length > 0
			? `tags: [${note.tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(', ')}]\n`
			: ''

	return [
		'---',
		`id: ${note.id}`,
		`title: ${note.title}`,
		tagsLine.trimEnd(),
		note.daily_note_date ? `daily: ${note.daily_note_date}` : null,
		`updated: ${note.updated_at}`,
		'---',
		'',
		note.content,
	]
		.filter(Boolean)
		.join('\n')
}

export function buildKnowledgeExportEntries(
	db: PersonalAiDatabase,
	filter?: { collectionId?: string },
): Array<{ path: string; content: string }> {
	const notes = listNotes(db, {
		collectionId: filter?.collectionId,
		includeArchived: true,
		limit: 5000,
	})

	return notes.map((note) => {
		const segments = note.collection_id
			? getCollectionPathSegments(db, note.collection_id)
			: ['Notes']
		const filename = `${slugify(note.title)}-${note.id.slice(0, 8)}.md`
		const path = [...segments, filename].join('/')
		return { path, content: exportNoteMarkdown(note) }
	})
}

export function exportKnowledgeVaultZip(
	db: PersonalAiDatabase,
	collectionId?: string,
): Uint8Array {
	const entries = buildKnowledgeExportEntries(
		db,
		collectionId ? { collectionId } : undefined,
	)
	const zipData: Record<string, Uint8Array> = {}
	for (const entry of entries) {
		zipData[entry.path] = strToU8(entry.content)
	}
	return zipSync(zipData)
}

export function mapNoteToApi(note: KnowledgeNoteWithMeta) {
	return {
		id: note.id,
		title: note.title,
		content: note.content,
		collectionId: note.collection_id ?? undefined,
		source: note.source,
		contentFormat: note.content_format,
		readOnly: note.read_only === 1,
		pinned: note.pinned === 1,
		archived: note.archived === 1,
		dailyNoteDate: note.daily_note_date ?? undefined,
		lastEditedBy: note.last_edited_by,
		tags: note.tags,
		livingNoteMode: note.living_note_mode,
		livingNoteLastConsolidatedAt: note.living_note_last_consolidated_at ?? undefined,
		livingNotePendingContent: note.living_note_pending_content ?? undefined,
		livingNotePendingSummary: note.living_note_pending_summary ?? undefined,
		createdAt: note.created_at,
		updatedAt: note.updated_at,
	}
}

export function mapCollectionToApi(collection: KnowledgeCollectionRow) {
	return {
		id: collection.id,
		name: collection.name,
		parentId: collection.parent_id ?? undefined,
		kind: collection.kind,
		systemKey: collection.system_key ?? undefined,
		createdAt: collection.created_at,
		updatedAt: collection.updated_at,
	}
}
