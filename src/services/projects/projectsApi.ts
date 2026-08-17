import { buildPersonalaiApiUrl } from '@/utils/personalaiEndpoint'
import { loadCachedPersonalaiHost } from '@/services/personalaiApi'
import type {
	ProjectChecklistItem,
	ProjectRecord,
	ProjectSource,
	ProjectTaskRecord,
	ProjectTaskStatus,
} from '@/storage/types'

async function parseError(res: Response): Promise<string> {
	const text = await res.text().catch(() => '')
	try {
		const json = JSON.parse(text) as { error?: string }
		if (json.error) return json.error
	} catch {
		// not json
	}
	return text || `HTTP ${res.status}`
}

function url(path: string): string {
	return buildPersonalaiApiUrl(loadCachedPersonalaiHost(), `/projects${path}`)
}

export async function fetchProjects(query?: string): Promise<ProjectRecord[]> {
	const suffix = query ? `?query=${encodeURIComponent(query)}` : ''
	const res = await fetch(url(suffix))
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { projects: ProjectRecord[] }
	return data.projects ?? []
}

export async function fetchProject(id: string): Promise<ProjectRecord | undefined> {
	const res = await fetch(url(`/${id}`))
	if (res.status === 404) return undefined
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { project: ProjectRecord }
	return data.project
}

export async function createProjectApi(input: {
	id?: string
	title: string
	description?: string
	documentIds?: string[]
	source?: ProjectSource
}): Promise<ProjectRecord> {
	const res = await fetch(url(''), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { project: ProjectRecord }
	return data.project
}

export async function updateProjectApi(
	id: string,
	updates: Partial<Pick<ProjectRecord, 'title' | 'description' | 'documentIds' | 'tasks'>>,
): Promise<ProjectRecord> {
	const res = await fetch(url(`/${id}`), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(updates),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { project: ProjectRecord }
	return data.project
}

export async function deleteProjectApi(id: string): Promise<void> {
	const res = await fetch(url(`/${id}`), { method: 'DELETE' })
	if (!res.ok) throw new Error(await parseError(res))
}

export async function createTaskApi(
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
): Promise<ProjectTaskRecord> {
	const res = await fetch(url(`/${projectId}/tasks`), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { task: ProjectTaskRecord }
	return data.task
}

export async function updateTaskApi(
	projectId: string,
	taskId: string,
	updates: Partial<ProjectTaskRecord>,
): Promise<ProjectTaskRecord> {
	const res = await fetch(url(`/${projectId}/tasks/${taskId}`), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(updates),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { task: ProjectTaskRecord }
	return data.task
}

export async function deleteTaskApi(projectId: string, taskId: string): Promise<void> {
	const res = await fetch(url(`/${projectId}/tasks/${taskId}`), { method: 'DELETE' })
	if (!res.ok) throw new Error(await parseError(res))
}

export async function importProjectsBatch(
	projects: ProjectRecord[],
): Promise<{ imported: number; skipped: number }> {
	const res = await fetch(url('/import-batch'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ projects }),
	})
	if (!res.ok) throw new Error(await parseError(res))
	return (await res.json()) as { imported: number; skipped: number }
}
