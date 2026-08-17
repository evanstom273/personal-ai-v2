import { Hono } from 'hono'
import type { ServerConfig } from '../config.js'
import { getDb } from '../db/connection.js'
import * as projectRepo from '../repositories/projectRepository.js'

export function createProjectRoutes(config: ServerConfig): Hono {
	const app = new Hono()

	function db() {
		return getDb(config)
	}

	app.get('/', (c) => {
		const query = c.req.query('query')
		const projects = projectRepo.listProjects(db(), query)
		return c.json({ projects: projects.map(projectRepo.mapProjectToApi) })
	})

	app.get('/:id', (c) => {
		const project = projectRepo.getProject(db(), c.req.param('id'))
		if (!project) return c.json({ error: 'Project not found' }, 404)
		return c.json({ project: projectRepo.mapProjectToApi(project) })
	})

	app.post('/', async (c) => {
		const body = await c.req.json<{
			id?: string
			title?: string
			description?: string
			documentIds?: string[]
			source?: projectRepo.ProjectSource
		}>()

		if (!body.title?.trim()) return c.json({ error: 'title is required' }, 400)

		const project = projectRepo.createProject(db(), {
			id: body.id,
			title: body.title,
			description: body.description,
			documentIds: body.documentIds,
			source: body.source,
		})

		return c.json({ project: projectRepo.mapProjectToApi(project) })
	})

	app.patch('/:id', async (c) => {
		const body = await c.req.json<{
			title?: string
			description?: string
			documentIds?: string[]
			tasks?: projectRepo.ProjectTaskRecord[]
		}>()

		let project = projectRepo.updateProject(db(), c.req.param('id'), body)
		if (!project) return c.json({ error: 'Project not found' }, 404)

		if (body.tasks) {
			project = projectRepo.syncProjectTasks(db(), c.req.param('id'), body.tasks)
		}

		if (!project) return c.json({ error: 'Project not found' }, 404)
		return c.json({ project: projectRepo.mapProjectToApi(project) })
	})

	app.delete('/:id', (c) => {
		const deleted = projectRepo.deleteProject(db(), c.req.param('id'))
		if (!deleted) return c.json({ error: 'Project not found' }, 404)
		return c.json({ ok: true })
	})

	app.post('/:id/tasks', async (c) => {
		const body = await c.req.json<{
			id?: string
			title?: string
			note?: string
			status?: projectRepo.ProjectTaskStatus
			position?: number
			checklist?: projectRepo.ProjectChecklistItem[]
			documentIds?: string[]
			reminderId?: string
		}>()

		if (!body.title?.trim()) return c.json({ error: 'title is required' }, 400)

		const task = projectRepo.createTask(db(), c.req.param('id'), {
			...body,
			title: body.title!.trim(),
		})
		if (!task) return c.json({ error: 'Project not found' }, 404)
		return c.json({ task })
	})

	app.patch('/:projectId/tasks/:taskId', async (c) => {
		const body = await c.req.json<Partial<projectRepo.ProjectTaskRecord>>()
		const task = projectRepo.updateTask(
			db(),
			c.req.param('projectId'),
			c.req.param('taskId'),
			body,
		)
		if (!task) return c.json({ error: 'Task not found' }, 404)
		return c.json({ task })
	})

	app.delete('/:projectId/tasks/:taskId', (c) => {
		const deleted = projectRepo.deleteTask(
			db(),
			c.req.param('projectId'),
			c.req.param('taskId'),
		)
		if (!deleted) return c.json({ error: 'Task not found' }, 404)
		return c.json({ ok: true })
	})

	app.post('/import-batch', async (c) => {
		const body = await c.req.json<{ projects?: projectRepo.ProjectRecord[] }>()
		const result = projectRepo.importProjectsBatch(db(), body.projects ?? [])
		return c.json(result)
	})

	return app
}
