import { getAllValues } from '@/storage/storageService'
import {
	createProjectApi,
	createTaskApi,
	deleteProjectApi,
	deleteTaskApi,
	fetchProject,
	fetchProjects,
	importProjectsBatch,
	updateProjectApi,
	updateTaskApi,
} from '@/services/projects/projectsApi'
import {
	isMigrationComplete,
	markMigrationComplete,
	MIGRATION_FLAGS,
	requirePersonalAiServer,
} from '@/services/personalaiServer'
import type {
	ProjectChecklistItem,
	ProjectRecord,
	ProjectSource,
	ProjectTaskRecord,
	ProjectTaskStatus,
} from '@/storage/types'

const listeners = new Set<() => void>()

export function subscribeProjectsChanged(listener: () => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

export function notifyProjectsChanged(): void {
	for (const listener of listeners) {
		listener()
	}
}

function sortProjects(projects: ProjectRecord[]): ProjectRecord[] {
	return [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
}

function sortTasks(tasks: ProjectTaskRecord[]): ProjectTaskRecord[] {
	return [...tasks].sort((a, b) => {
		if (a.status !== b.status) {
			const order: Record<ProjectTaskStatus, number> = {
				todo: 0,
				doing: 1,
				done: 2,
			}
			return order[a.status] - order[b.status]
		}
		return a.position - b.position
	})
}

function normalizeChecklistItem(
	item: Partial<ProjectChecklistItem> & { label?: string },
): ProjectChecklistItem {
	return {
		id: item.id ?? crypto.randomUUID(),
		label: item.label?.trim() ?? '',
		checked: item.checked ?? false,
	}
}

function normalizeTask(task: ProjectTaskRecord): ProjectTaskRecord {
	return {
		...task,
		checklist: (task.checklist ?? []).map((item) => normalizeChecklistItem(item)),
		documentIds: task.documentIds ?? [],
	}
}

function normalizeProject(project: ProjectRecord): ProjectRecord {
	return {
		...project,
		documentIds: project.documentIds ?? [],
		tasks: sortTasks((project.tasks ?? []).map(normalizeTask)),
	}
}

async function migrateIndexedDbToServerIfNeeded(): Promise<void> {
	if (isMigrationComplete(MIGRATION_FLAGS.projects)) return

	const local = (await getAllValues<ProjectRecord>('projects')).map(normalizeProject)
	if (local.length === 0) {
		markMigrationComplete(MIGRATION_FLAGS.projects)
		return
	}

	await importProjectsBatch(local)
	markMigrationComplete(MIGRATION_FLAGS.projects)
}

async function ensureReady(): Promise<void> {
	requirePersonalAiServer()
	await migrateIndexedDbToServerIfNeeded()
}

export async function listProjects(query?: string): Promise<ProjectRecord[]> {
	await ensureReady()
	return sortProjects((await fetchProjects(query)).map(normalizeProject))
}

export async function getProject(id: string): Promise<ProjectRecord | undefined> {
	await ensureReady()
	const project = await fetchProject(id)
	return project ? normalizeProject(project) : undefined
}

export async function createProject(input: {
	title: string
	description?: string
	documentIds?: string[]
	source?: ProjectSource
}): Promise<ProjectRecord> {
	await ensureReady()
	const project = await createProjectApi(input)
	notifyProjectsChanged()
	return normalizeProject(project)
}

export async function updateProject(
	id: string,
	updates: Partial<
		Pick<ProjectRecord, 'title' | 'description' | 'documentIds' | 'tasks'>
	>,
): Promise<ProjectRecord | undefined> {
	await ensureReady()
	const project = await updateProjectApi(id, updates)
	if (!project) return undefined
	notifyProjectsChanged()
	return normalizeProject(project)
}

export async function deleteProject(id: string): Promise<boolean> {
	await ensureReady()
	const existing = await getProject(id)
	if (!existing) return false
	await deleteProjectApi(id)
	notifyProjectsChanged()
	return true
}

export async function resolveProjectRef(input: {
	projectId?: string
	title?: string
}): Promise<ProjectRecord | undefined> {
	if (input.projectId) {
		return getProject(input.projectId)
	}

	if (!input.title?.trim()) return undefined

	const normalized = input.title.trim().toLowerCase()
	const matches = (await listProjects()).filter((project) =>
		project.title.toLowerCase().includes(normalized),
	)

	if (matches.length === 1) return matches[0]
	return matches.find((project) => project.title.toLowerCase() === normalized)
}

function nextTaskPosition(
	tasks: ProjectTaskRecord[],
	status: ProjectTaskStatus,
): number {
	const inColumn = tasks.filter((task) => task.status === status)
	if (inColumn.length === 0) return 0
	return Math.max(...inColumn.map((task) => task.position)) + 1
}

export async function createTask(
	projectId: string,
	input: {
		title: string
		note?: string
		status?: ProjectTaskStatus
		checklist?: Array<Pick<ProjectChecklistItem, 'label' | 'checked'>>
		documentIds?: string[]
		reminderId?: string
	},
): Promise<ProjectTaskRecord | undefined> {
	await ensureReady()
	const project = await getProject(projectId)
	if (!project) return undefined

	const title = input.title.trim()
	if (!title) throw new Error('Task title is required.')

	const status = input.status ?? 'todo'
	const task = await createTaskApi(projectId, {
		title,
		note: input.note,
		status,
		position: nextTaskPosition(project.tasks, status),
		checklist: (input.checklist ?? [])
			.map((item) => normalizeChecklistItem(item))
			.filter((item) => item.label),
		documentIds: input.documentIds,
		reminderId: input.reminderId,
	})

	notifyProjectsChanged()
	return task
}

export async function updateTask(
	projectId: string,
	taskId: string,
	updates: Partial<
		Pick<
			ProjectTaskRecord,
			'title' | 'note' | 'status' | 'position' | 'checklist' | 'documentIds' | 'reminderId'
		>
	>,
): Promise<ProjectTaskRecord | undefined> {
	await ensureReady()
	const project = await getProject(projectId)
	if (!project) return undefined

	const existing = project.tasks.find((task) => task.id === taskId)
	if (!existing) return undefined

	const nextStatus = updates.status ?? existing.status
	const task = await updateTaskApi(projectId, taskId, {
		...updates,
		title: updates.title !== undefined ? updates.title.trim() : undefined,
		note: updates.note !== undefined ? updates.note.trim() || undefined : undefined,
		status: nextStatus,
		position:
			updates.position ??
			(nextStatus !== existing.status
				? nextTaskPosition(project.tasks, nextStatus)
				: existing.position),
		checklist:
			updates.checklist !== undefined
				? updates.checklist
						.map((item) => normalizeChecklistItem(item))
						.filter((item) => item.label)
				: undefined,
	})

	notifyProjectsChanged()
	return task
}

export async function moveTask(
	projectId: string,
	taskId: string,
	status: ProjectTaskStatus,
	position?: number,
): Promise<ProjectTaskRecord | undefined> {
	return updateTask(projectId, taskId, {
		status,
		position: position ?? undefined,
	})
}

export async function deleteTask(projectId: string, taskId: string): Promise<boolean> {
	await ensureReady()
	const project = await getProject(projectId)
	if (!project) return false
	if (!project.tasks.some((task) => task.id === taskId)) return false
	await deleteTaskApi(projectId, taskId)
	notifyProjectsChanged()
	return true
}

export async function resolveTaskRef(input: {
	projectId?: string
	projectTitle?: string
	taskId?: string
	taskTitle?: string
}): Promise<{ project: ProjectRecord; task: ProjectTaskRecord } | undefined> {
	const project = await resolveProjectRef({
		projectId: input.projectId,
		title: input.projectTitle,
	})

	if (!project) return undefined

	if (input.taskId) {
		const task = project.tasks.find((item) => item.id === input.taskId)
		return task ? { project, task } : undefined
	}

	if (!input.taskTitle?.trim()) return undefined

	const normalized = input.taskTitle.trim().toLowerCase()
	const matches = project.tasks.filter((task) =>
		task.title.toLowerCase().includes(normalized),
	)

	if (matches.length === 1) return { project, task: matches[0] }
	const exact = matches.find((task) => task.title.toLowerCase() === normalized)
	return exact ? { project, task: exact } : undefined
}

export function parseProjectTaskStatus(value: unknown): ProjectTaskStatus | null {
	if (typeof value !== 'string') return null
	const normalized = value.trim().toLowerCase()
	if (normalized === 'todo' || normalized === 'doing' || normalized === 'done') {
		return normalized
	}
	return null
}

export function parseChecklistItems(
	value: unknown,
): Array<Pick<ProjectChecklistItem, 'label' | 'checked'>> {
	if (!Array.isArray(value)) return []

	return value
		.map((item) => {
			if (typeof item === 'string') {
				return { label: item.trim(), checked: false }
			}
			if (typeof item === 'object' && item !== null) {
				const record = item as Record<string, unknown>
				const label = typeof record.label === 'string' ? record.label : ''
				return {
					label: label.trim(),
					checked: record.checked === true,
				}
			}
			return { label: '', checked: false }
		})
		.filter((item) => item.label)
}
