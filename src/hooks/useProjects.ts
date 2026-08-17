import { useCallback, useEffect, useState } from 'react'
import {
	createProject,
	createTask,
	deleteProject,
	deleteTask,
	listProjects,
	moveTask,
	subscribeProjectsChanged,
	updateProject,
	updateTask,
} from '@/services/projects/projectService'
import type {
	ProjectChecklistItem,
	ProjectRecord,
	ProjectTaskStatus,
} from '@/storage/types'

export function useProjects() {
	const [projects, setProjects] = useState<ProjectRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const refreshProjects = useCallback(async (query?: string) => {
		const next = await listProjects(query)
		setProjects(next)
		setIsLoading(false)
		return next
	}, [])

	useEffect(() => {
		void refreshProjects()
		return subscribeProjectsChanged(() => {
			void refreshProjects()
		})
	}, [refreshProjects])

	const addProject = useCallback(
		async (input: { title: string; description?: string; documentIds?: string[] }) => {
			return createProject({ ...input, source: 'user' })
		},
		[],
	)

	const saveProject = useCallback(
		async (
			id: string,
			updates: Partial<Pick<ProjectRecord, 'title' | 'description' | 'documentIds'>>,
		) => {
			return updateProject(id, updates)
		},
		[],
	)

	const removeProject = useCallback(async (id: string) => {
		await deleteProject(id)
	}, [])

	const addTask = useCallback(
		async (
			projectId: string,
			input: {
				title: string
				note?: string
				status?: ProjectTaskStatus
				checklist?: Array<Pick<ProjectChecklistItem, 'label' | 'checked'>>
				documentIds?: string[]
				reminderId?: string
			},
		) => {
			return createTask(projectId, input)
		},
		[],
	)

	const saveTask = useCallback(
		async (
			projectId: string,
			taskId: string,
			updates: Partial<{
				title: string
				note?: string
				status: ProjectTaskStatus
				position: number
				checklist: ProjectChecklistItem[]
				documentIds: string[]
				reminderId?: string
			}>,
		) => {
			return updateTask(projectId, taskId, updates)
		},
		[],
	)

	const changeTaskStatus = useCallback(
		async (projectId: string, taskId: string, status: ProjectTaskStatus) => {
			return moveTask(projectId, taskId, status)
		},
		[],
	)

	const removeTask = useCallback(async (projectId: string, taskId: string) => {
		await deleteTask(projectId, taskId)
	}, [])

	return {
		projects,
		isLoading,
		refreshProjects,
		addProject,
		saveProject,
		removeProject,
		addTask,
		saveTask,
		changeTaskStatus,
		removeTask,
	}
}
