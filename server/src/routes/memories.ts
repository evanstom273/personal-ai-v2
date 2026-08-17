import { Hono } from 'hono'
import type { ServerConfig } from '../config.js'
import { getDb } from '../db/connection.js'
import * as memoryRepo from '../repositories/memoryRepository.js'

export function createMemoryRoutes(config: ServerConfig): Hono {
	const app = new Hono()

	function db() {
		return getDb(config)
	}

	app.get('/', (c) => {
		const query = c.req.query('query')
		const memories = memoryRepo.listMemories(db(), query)
		return c.json({ memories: memories.map(memoryRepo.mapMemoryToApi) })
	})

	app.post('/batch', async (c) => {
		const body = await c.req.json<{
			entries?: Array<{
				id?: string
				content: string
				category: memoryRepo.MemoryCategory
				archivedFromMessageCount?: number
				archived?: boolean
			}>
		}>()

		const created = memoryRepo.addMemoriesBatch(db(), body.entries ?? [])
		return c.json({ memories: created.map(memoryRepo.mapMemoryToApi) })
	})

	app.delete('/:id', (c) => {
		const deleted = memoryRepo.deleteMemory(db(), c.req.param('id'))
		if (!deleted) return c.json({ error: 'Memory not found' }, 404)
		return c.json({ ok: true })
	})

	app.delete('/', (c) => {
		memoryRepo.clearAllMemories(db())
		return c.json({ ok: true })
	})

	app.post('/import-batch', async (c) => {
		const body = await c.req.json<{ memories?: memoryRepo.MemoryEntry[] }>()
		const result = memoryRepo.importMemoriesBatch(db(), body.memories ?? [])
		return c.json(result)
	})

	return app
}
