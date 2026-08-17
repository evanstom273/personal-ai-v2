import { randomUUID } from 'node:crypto'
import type { PersonalAiDatabase } from '../db/types.js'

export type ProjectSource = 'user' | 'assistant'
export type ProjectTaskStatus = 'todo' | 'doing' | 'done'

export interface ProjectChecklistItem {
	id: string
	label: string
	checked: boolean
}

export interface ProjectTaskRow {
	id: string
	project_id: string
	title: string
	note: string | null
	status: ProjectTaskStatus
	position: number
	checklist: string
	document_ids: string
	reminder_id: string | null
	created_at: number
	updated_at: number
}

export interface ProjectRow {
	id: string
	title: string
	description: string | null
	document_ids: string
	source: ProjectSource
	created_at: number
	updated_at: number
}

export interface ProjectTaskRecord {
	id: string
	title: string
	note?: string
	status: ProjectTaskStatus
	position: number
	checklist: ProjectChecklistItem[]
	documentIds: string[]
	reminderId?: string
	createdAt: number
	updatedAt: number
}

export interface ProjectRecord {
	id: string
	title: string
	description?: string
	documentIds: string[]
	tasks: ProjectTaskRecord[]
	source: ProjectSource
	createdAt: number
	updatedAt: number
}

function parseJsonArray(value: string): string[] {
	try {
		const parsed = JSON.parse(value) as unknown
		return Array.isArray(parsed)
			? parsed.filter((item): item is string => typeof item === 'string')
			: []
	} catch {
		return []
	}
}

function parseChecklist(value: string): ProjectChecklistItem[] {
	try {
		const parsed = JSON.parse(value) as unknown
		if (!Array.isArray(parsed)) return []
		return parsed
			.map((item) => {
				if (typeof item !== 'object' || item === null) return null
				const record = item as Record<string, unknown>
				const label = typeof record.label === 'string' ? record.label.trim() : ''
				if (!label) return null
				return {
					id: typeof record.id === 'string' ? record.id : randomUUID(),
					label,
					checked: record.checked === true,
				}
			})
			.filter((item): item is ProjectChecklistItem => item !== null)
	} catch {
		return []
	}
}

function mapTaskRow(row: ProjectTaskRow): ProjectTaskRecord {
	return {
		id: row.id,
		title: row.title,
		note: row.note ?? undefined,
		status: row.status,
		position: row.position,
		checklist: parseChecklist(row.checklist),
		documentIds: parseJsonArray(row.document_ids),
		reminderId: row.reminder_id ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function listTasksForProject(db: PersonalAiDatabase, projectId: string): ProjectTaskRecord[] {
	const rows = db
		.prepare(
			`SELECT id, project_id, title, note, status, position, checklist, document_ids,
			        reminder_id, created_at, updated_at
			 FROM project_tasks
			 WHERE project_id = ?
			 ORDER BY status, position, updated_at DESC`,
		)
		.all(projectId) as ProjectTaskRow[]

	return rows.map(mapTaskRow)
}

export function mapProjectRow(db: PersonalAiDatabase, row: ProjectRow): ProjectRecord {
	return {
		id: row.id,
		title: row.title,
		description: row.description ?? undefined,
		documentIds: parseJsonArray(row.document_ids),
		tasks: listTasksForProject(db, row.id),
		source: row.source,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

export function listProjects(db: PersonalAiDatabase, query?: string): ProjectRecord[] {
	const rows = db
		.prepare(
			`SELECT id, title, description, document_ids, source, created_at, updated_at
			 FROM projects
			 ORDER BY updated_at DESC`,
		)
		.all() as ProjectRow[]

	let projects = rows.map((row) => mapProjectRow(db, row))

	if (query?.trim()) {
		const q = query.trim().toLowerCase()
		projects = projects.filter(
			(project) =>
				project.title.toLowerCase().includes(q) ||
				(project.description?.toLowerCase().includes(q) ?? false),
		)
	}

	return projects
}

export function getProject(db: PersonalAiDatabase, id: string): ProjectRecord | undefined {
	const row = db
		.prepare(
			`SELECT id, title, description, document_ids, source, created_at, updated_at
			 FROM projects WHERE id = ?`,
		)
		.get(id) as ProjectRow | undefined

	return row ? mapProjectRow(db, row) : undefined
}

export function createProject(
	db: PersonalAiDatabase,
	input: {
		id?: string
		title: string
		description?: string
		documentIds?: string[]
		source?: ProjectSource
	},
): ProjectRecord {
	const now = Date.now()
	const id = input.id ?? randomUUID()
	const title = input.title.trim()
	if (!title) throw new Error('Project title is required.')

	db.prepare(
		`INSERT INTO projects (id, title, description, document_ids, source, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
	).run(
		id,
		title,
		input.description?.trim() || null,
		JSON.stringify(input.documentIds ?? []),
		input.source ?? 'user',
		now,
		now,
	)

	return getProject(db, id)!
}

export function updateProject(
	db: PersonalAiDatabase,
	id: string,
	updates: Partial<Pick<ProjectRecord, 'title' | 'description' | 'documentIds'>>,
): ProjectRecord | undefined {
	const existing = getProject(db, id)
	if (!existing) return undefined

	const now = Date.now()
	const title = updates.title?.trim() ? updates.title.trim() : existing.title
	if (!title) throw new Error('Project title is required.')

	db.prepare(
		`UPDATE projects SET title = ?, description = ?, document_ids = ?, updated_at = ? WHERE id = ?`,
	).run(
		title,
		updates.description !== undefined
			? updates.description.trim() || null
			: existing.description ?? null,
		JSON.stringify(updates.documentIds ?? existing.documentIds),
		now,
		id,
	)

	return getProject(db, id)
}

export function deleteProject(db: PersonalAiDatabase, id: string): boolean {
	const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id)
	return result.changes > 0
}

function nextTaskPosition(
	db: PersonalAiDatabase,
	projectId: string,
	status: ProjectTaskStatus,
): number {
	const row = db
		.prepare(
			`SELECT MAX(position) as max_pos FROM project_tasks WHERE project_id = ? AND status = ?`,
		)
		.get(projectId, status) as { max_pos: number | null } | undefined

	return (row?.max_pos ?? -1) + 1
}

export function createTask(
	db: PersonalAiDatabase,
	projectId: string,
	input: {
		id?: string
		title: string
		note?: string
		status?: ProjectTaskStatus
		position?: number
		checklist?: ProjectChecklistItem[]
		documentIds?: string[]
		reminderId?: string
	},
): ProjectTaskRecord | undefined {
	const project = getProject(db, projectId)
	if (!project) return undefined

	const title = input.title.trim()
	if (!title) throw new Error('Task title is required.')

	const now = Date.now()
	const status = input.status ?? 'todo'
	const id = input.id ?? randomUUID()
	const position =
		input.position ?? nextTaskPosition(db, projectId, status)

	db.prepare(
		`INSERT INTO project_tasks (
			id, project_id, title, note, status, position, checklist, document_ids,
			reminder_id, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
		id,
		projectId,
		title,
		input.note?.trim() || null,
		status,
		position,
		JSON.stringify(input.checklist ?? []),
		JSON.stringify(input.documentIds ?? []),
		input.reminderId ?? null,
		now,
		now,
	)

	db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId)

	const row = db
		.prepare('SELECT * FROM project_tasks WHERE id = ?')
		.get(id) as ProjectTaskRow

	return mapTaskRow(row)
}

export function updateTask(
	db: PersonalAiDatabase,
	projectId: string,
	taskId: string,
	updates: Partial<
		Pick<
			ProjectTaskRecord,
			'title' | 'note' | 'status' | 'position' | 'checklist' | 'documentIds' | 'reminderId'
		>
	>,
): ProjectTaskRecord | undefined {
	const row = db
		.prepare('SELECT * FROM project_tasks WHERE id = ? AND project_id = ?')
		.get(taskId, projectId) as ProjectTaskRow | undefined

	if (!row) return undefined

	const now = Date.now()
	const status = updates.status ?? row.status
	const position = updates.position ?? row.position
	const title = updates.title?.trim() ? updates.title.trim() : row.title
	if (!title) throw new Error('Task title is required.')

	db.prepare(
		`UPDATE project_tasks SET
			title = ?, note = ?, status = ?, position = ?, checklist = ?,
			document_ids = ?, reminder_id = ?, updated_at = ?
		 WHERE id = ?`,
	).run(
		title,
		updates.note !== undefined ? updates.note.trim() || null : row.note,
		status,
		position,
		JSON.stringify(updates.checklist ?? parseChecklist(row.checklist)),
		JSON.stringify(updates.documentIds ?? parseJsonArray(row.document_ids)),
		updates.reminderId !== undefined ? updates.reminderId ?? null : row.reminder_id,
		now,
		taskId,
	)

	db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId)

	const updated = db
		.prepare('SELECT * FROM project_tasks WHERE id = ?')
		.get(taskId) as ProjectTaskRow

	return mapTaskRow(updated)
}

export function deleteTask(
	db: PersonalAiDatabase,
	projectId: string,
	taskId: string,
): boolean {
	const now = Date.now()
	const result = db
		.prepare('DELETE FROM project_tasks WHERE id = ? AND project_id = ?')
		.run(taskId, projectId)

	if (result.changes > 0) {
		db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId)
	}

	return result.changes > 0
}

export function syncProjectTasks(
	db: PersonalAiDatabase,
	projectId: string,
	tasks: ProjectTaskRecord[],
): ProjectRecord | undefined {
	const project = getProject(db, projectId)
	if (!project) return undefined

	const now = Date.now()
	const existingIds = new Set(project.tasks.map((task) => task.id))
	const incomingIds = new Set(tasks.map((task) => task.id))

	for (const taskId of existingIds) {
		if (!incomingIds.has(taskId)) {
			deleteTask(db, projectId, taskId)
		}
	}

	for (const task of tasks) {
		if (existingIds.has(task.id)) {
			updateTask(db, projectId, task.id, task)
		} else {
			createTask(db, projectId, {
				id: task.id,
				title: task.title,
				note: task.note,
				status: task.status,
				position: task.position,
				checklist: task.checklist,
				documentIds: task.documentIds,
				reminderId: task.reminderId,
			})
		}
	}

	db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId)
	return getProject(db, projectId)
}

export function importProjectsBatch(
	db: PersonalAiDatabase,
	projects: ProjectRecord[],
): { imported: number; skipped: number } {
	let imported = 0
	let skipped = 0

	for (const project of projects) {
		if (getProject(db, project.id)) {
			skipped += 1
			continue
		}

		const existingByTitle = listProjects(db).find(
			(item) => item.title.toLowerCase() === project.title.toLowerCase(),
		)
		if (existingByTitle) {
			skipped += 1
			continue
		}

		createProject(db, {
			id: project.id,
			title: project.title,
			description: project.description,
			documentIds: project.documentIds,
			source: project.source,
		})

		for (const task of project.tasks) {
			createTask(db, project.id, {
				id: task.id,
				title: task.title,
				note: task.note,
				status: task.status,
				position: task.position,
				checklist: task.checklist,
				documentIds: task.documentIds,
				reminderId: task.reminderId,
			})
		}

		imported += 1
	}

	return { imported, skipped }
}

export function mapProjectToApi(project: ProjectRecord) {
	return {
		id: project.id,
		title: project.title,
		description: project.description,
		documentIds: project.documentIds,
		tasks: project.tasks.map((task) => ({
			id: task.id,
			title: task.title,
			note: task.note,
			status: task.status,
			position: task.position,
			checklist: task.checklist,
			documentIds: task.documentIds,
			reminderId: task.reminderId,
			createdAt: task.createdAt,
			updatedAt: task.updatedAt,
		})),
		source: project.source,
		createdAt: project.createdAt,
		updatedAt: project.updatedAt,
	}
}
