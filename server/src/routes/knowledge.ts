import { Hono } from 'hono'
import type { ServerConfig } from '../config.js'
import { getDb } from '../db/connection.js'
import * as knowledgeRepo from '../repositories/knowledgeRepository.js'

export function createKnowledgeRoutes(config: ServerConfig): Hono {
	const app = new Hono()

	function db() {
		const database = getDb(config)
		knowledgeRepo.seedSystemCollections(database)
		return database
	}

	app.get('/collections', (c) => {
		const collections = knowledgeRepo.listCollections(db())
		return c.json({
			collections: collections.map(knowledgeRepo.mapCollectionToApi),
		})
	})

	app.post('/collections', async (c) => {
		const body = await c.req.json<{ name?: string; parentId?: string }>()
		if (!body.name?.trim()) {
			return c.json({ error: 'name is required' }, 400)
		}

		const collection = knowledgeRepo.createCollection(db(), {
			name: body.name,
			parentId: body.parentId,
		})
		return c.json({ collection: knowledgeRepo.mapCollectionToApi(collection) })
	})

	app.get('/notes', (c) => {
		const query = c.req.query('query')
		const collectionId = c.req.query('collectionId')
		const tag = c.req.query('tag')
		const includeArchived = c.req.query('includeArchived') === 'true'
		const pinnedOnly = c.req.query('pinnedOnly') === 'true'

		const notes = knowledgeRepo.listNotes(db(), {
			query,
			collectionId,
			tag,
			includeArchived,
			pinnedOnly,
		})

		return c.json({ notes: notes.map(knowledgeRepo.mapNoteToApi) })
	})

	app.get('/notes/:id', (c) => {
		const note = knowledgeRepo.getNote(db(), c.req.param('id'))
		if (!note) return c.json({ error: 'Note not found' }, 404)
		return c.json({ note: knowledgeRepo.mapNoteToApi(note) })
	})

	app.post('/notes', async (c) => {
		const body = await c.req.json<{
			id?: string
			title?: string
			content?: string
			collectionId?: string
			source?: knowledgeRepo.KnowledgeSource
			contentFormat?: knowledgeRepo.KnowledgeContentFormat
			readOnly?: boolean
			pinned?: boolean
			archived?: boolean
			dailyNoteDate?: string
			tags?: string[]
			editor?: knowledgeRepo.KnowledgeEditor
		}>()

		const note = knowledgeRepo.createNote(db(), config, {
			id: body.id,
			title: body.title ?? 'Untitled note',
			content: body.content,
			collectionId: body.collectionId,
			source: body.source,
			contentFormat: body.contentFormat,
			readOnly: body.readOnly,
			pinned: body.pinned,
			archived: body.archived,
			dailyNoteDate: body.dailyNoteDate,
			tags: body.tags,
			editor: body.editor,
		})

		return c.json({ note: knowledgeRepo.mapNoteToApi(note) })
	})

	app.patch('/notes/:id', async (c) => {
		const id = c.req.param('id')
		const body = await c.req.json<{
			title?: string
			content?: string
			collectionId?: string | null
			pinned?: boolean
			archived?: boolean
			tags?: string[]
			editor?: knowledgeRepo.KnowledgeEditor
			saveRevision?: boolean
			livingNoteMode?: 'off' | 'suggest' | 'automatic'
			livingNotePendingContent?: string | null
			livingNotePendingSummary?: string | null
			livingNoteLastConsolidatedAt?: number | null
		}>()

		try {
			const note = knowledgeRepo.updateNote(db(), config, id, {
				title: body.title,
				content: body.content,
				collectionId: body.collectionId,
				pinned: body.pinned,
				archived: body.archived,
				tags: body.tags,
				editor: body.editor,
				saveRevision: body.saveRevision,
				livingNoteMode: body.livingNoteMode,
				livingNotePendingContent: body.livingNotePendingContent,
				livingNotePendingSummary: body.livingNotePendingSummary,
				livingNoteLastConsolidatedAt: body.livingNoteLastConsolidatedAt,
			})

			if (!note) return c.json({ error: 'Note not found' }, 404)
			return c.json({ note: knowledgeRepo.mapNoteToApi(note) })
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			return c.json({ error: message }, 400)
		}
	})

	app.delete('/notes/:id', (c) => {
		const deleted = knowledgeRepo.deleteNote(db(), c.req.param('id'))
		if (!deleted) return c.json({ error: 'Note not found' }, 404)
		return c.json({ ok: true })
	})

	app.post('/search', async (c) => {
		const body = await c.req.json<{ query?: string; limit?: number }>()
		const notes = knowledgeRepo.searchKnowledge(db(), body.query ?? '', body.limit ?? 30)
		return c.json({ notes: notes.map(knowledgeRepo.mapNoteToApi) })
	})

	app.get('/notes/:id/backlinks', (c) => {
		const note = knowledgeRepo.getNote(db(), c.req.param('id'))
		if (!note) return c.json({ error: 'Note not found' }, 404)

		const backlinks = knowledgeRepo.getBacklinks(db(), c.req.param('id'))
		return c.json({ notes: backlinks.map(knowledgeRepo.mapNoteToApi) })
	})

	app.get('/notes/:id/related', (c) => {
		const note = knowledgeRepo.getNote(db(), c.req.param('id'))
		if (!note) return c.json({ error: 'Note not found' }, 404)

		const related = knowledgeRepo.getRelatedNotes(db(), c.req.param('id'))
		return c.json({ notes: related.map(knowledgeRepo.mapNoteToApi) })
	})

	app.get('/notes/:id/revisions', (c) => {
		const note = knowledgeRepo.getNote(db(), c.req.param('id'))
		if (!note) return c.json({ error: 'Note not found' }, 404)

		const revisions = knowledgeRepo.listRevisions(db(), c.req.param('id'))
		return c.json({ revisions })
	})

	app.post('/notes/daily', async (c) => {
		const body = await c.req.json<{ date?: string }>()
		const date =
			body.date ??
			new Date().toISOString().slice(0, 10)

		const note = knowledgeRepo.getOrCreateDailyNote(db(), config, date)
		return c.json({ note: knowledgeRepo.mapNoteToApi(note) })
	})

	app.post('/import-batch', async (c) => {
		const body = await c.req.json<{
			notes?: Array<{
				id?: string
				title: string
				content: string
				source?: knowledgeRepo.KnowledgeSource
				contentFormat?: knowledgeRepo.KnowledgeContentFormat
				readOnly?: boolean
				createdAt?: number
				updatedAt?: number
			}>
		}>()

		const result = knowledgeRepo.importNotesBatch(db(), config, body.notes ?? [])
		return c.json(result)
	})

	app.get('/notes/:id/export', (c) => {
		const note = knowledgeRepo.getNote(db(), c.req.param('id'))
		if (!note) return c.json({ error: 'Note not found' }, 404)

		const markdown = knowledgeRepo.exportNoteMarkdown(note)
		return c.text(markdown, 200, {
			'Content-Type': 'text/markdown; charset=utf-8',
		})
	})

	app.get('/export/vault', (c) => {
		const zip = knowledgeRepo.exportKnowledgeVaultZip(db())
		return new Response(zip.buffer as ArrayBuffer, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': 'attachment; filename="PersonalAI-Knowledge.zip"',
			},
		})
	})

	app.get('/export/collection/:collectionId', (c) => {
		const zip = knowledgeRepo.exportKnowledgeVaultZip(db(), c.req.param('collectionId'))
		return new Response(zip.buffer as ArrayBuffer, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="PersonalAI-Knowledge-${c.req.param('collectionId')}.zip"`,
			},
		})
	})

	return app
}
