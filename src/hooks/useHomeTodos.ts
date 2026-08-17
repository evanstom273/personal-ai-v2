import { useCallback, useEffect, useState } from 'react'
import {
	addHomeTodo,
	disableDailyTodoReview,
	enableDailyTodoReview,
	getHomeTodoList,
	removeHomeTodo,
	subscribeHomeTodosChanged,
	updateHomeTodo,
} from '@/services/home/homeTodoService'
import type { HomeTodoListState } from '@/storage/types'

export function useHomeTodos() {
	const [state, setState] = useState<HomeTodoListState>({ items: [], updatedAt: 0 })
	const [isLoading, setIsLoading] = useState(true)

	const refresh = useCallback(async () => {
		const next = await getHomeTodoList()
		setState(next)
		setIsLoading(false)
		return next
	}, [])

	useEffect(() => {
		void refresh()
		return subscribeHomeTodosChanged(() => {
			void refresh()
		})
	}, [refresh])

	const addTodo = useCallback(async (text: string) => {
		return addHomeTodo(text)
	}, [])

	const toggleTodo = useCallback(async (id: string, checked: boolean) => {
		return updateHomeTodo(id, { checked })
	}, [])

	const editTodo = useCallback(async (id: string, text: string) => {
		return updateHomeTodo(id, { text })
	}, [])

	const deleteTodo = useCallback(async (id: string) => {
		return removeHomeTodo(id)
	}, [])

	const enableDailyReview = useCallback(async () => {
		return enableDailyTodoReview()
	}, [])

	const disableDailyReview = useCallback(async () => {
		return disableDailyTodoReview()
	}, [])

	return {
		todos: state.items,
		dailyReviewReminderId: state.dailyReviewReminderId,
		isLoading,
		addTodo,
		toggleTodo,
		editTodo,
		deleteTodo,
		enableDailyReview,
		disableDailyReview,
		refresh,
	}
}
