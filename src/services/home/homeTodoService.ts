import {
	createReminder,
	getReminder,
	updateReminder,
} from '@/services/reminders/reminderService'
import { getValue, setValue } from '@/storage/storageService'
import type { HomeTodoItem, HomeTodoListState } from '@/storage/types'

const CACHE_KEY = 'home-todo-list'

const listeners = new Set<() => void>()

function notifyHomeTodosChanged(): void {
	for (const listener of listeners) {
		listener()
	}
}

export function subscribeHomeTodosChanged(listener: () => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

function emptyState(): HomeTodoListState {
	return {
		items: [],
		updatedAt: Date.now(),
	}
}

function sortItems(items: HomeTodoItem[]): HomeTodoItem[] {
	return [...items].sort((a, b) => a.position - b.position || a.createdAt - b.createdAt)
}

function normalizeState(state: HomeTodoListState): HomeTodoListState {
	return {
		...state,
		items: sortItems(state.items ?? []),
		updatedAt: state.updatedAt ?? Date.now(),
	}
}

export async function getHomeTodoList(): Promise<HomeTodoListState> {
	const stored = await getValue<HomeTodoListState>('cache', CACHE_KEY)
	return normalizeState(stored ?? emptyState())
}

async function saveHomeTodoList(state: HomeTodoListState): Promise<HomeTodoListState> {
	const next = normalizeState({
		...state,
		updatedAt: Date.now(),
	})
	await setValue('cache', CACHE_KEY, next)
	await syncDailyReviewReminder(next)
	notifyHomeTodosChanged()
	return next
}

export function formatHomeTodosForReminder(items: HomeTodoItem[]): string {
	if (items.length === 0) {
		return 'Your home todo list is empty. Ask me to add items, or open Home to add them yourself.'
	}

	const lines = items.map((item) => {
		const marker = item.checked ? '[x]' : '[ ]'
		return `${marker} ${item.text}`
	})

	return [
		"Here is your home todo list. Tell me what to add, remove, or check off — or edit it on the Home tab.",
		'',
		...lines,
	].join('\n')
}

async function syncDailyReviewReminder(state: HomeTodoListState): Promise<void> {
	if (!state.dailyReviewReminderId) {
		return
	}

	const reminder = await getReminder(state.dailyReviewReminderId)
	if (!reminder) {
		return
	}

	await updateReminder(reminder.id, {
		deliveryMessage: formatHomeTodosForReminder(state.items),
		note: 'Linked to your Home todo list. Fires daily for review.',
	})
}

function nextDailyReviewTimestamp(hour = 8, minute = 0): number {
	const next = new Date()
	next.setSeconds(0, 0)
	next.setHours(hour, minute, 0, 0)
	if (next.getTime() <= Date.now()) {
		next.setDate(next.getDate() + 1)
	}
	return next.getTime()
}

export async function enableDailyTodoReview(
	hour = 8,
	minute = 0,
): Promise<HomeTodoListState> {
	const state = await getHomeTodoList()
	const deliveryMessage = formatHomeTodosForReminder(state.items)

	if (state.dailyReviewReminderId) {
		const existing = await getReminder(state.dailyReviewReminderId)
		if (existing) {
			await updateReminder(existing.id, {
				enabled: true,
				recurrence: 'daily',
				scheduledAt: nextDailyReviewTimestamp(hour, minute),
				deliveryMessage,
				note: 'Linked to your Home todo list. Fires daily for review.',
			})
			return saveHomeTodoList(state)
		}
	}

	const reminder = await createReminder({
		title: 'Review home todos',
		scheduledAt: nextDailyReviewTimestamp(hour, minute),
		recurrence: 'daily',
		deliveryMessage,
		note: 'Linked to your Home todo list. Fires daily for review.',
		source: 'user',
	})

	return saveHomeTodoList({
		...state,
		dailyReviewReminderId: reminder.id,
	})
}

export async function disableDailyTodoReview(): Promise<HomeTodoListState> {
	const state = await getHomeTodoList()
	if (!state.dailyReviewReminderId) {
		return state
	}

	const reminder = await getReminder(state.dailyReviewReminderId)
	if (reminder) {
		await updateReminder(reminder.id, { enabled: false })
	}

	return saveHomeTodoList({
		...state,
		dailyReviewReminderId: undefined,
	})
}

export async function addHomeTodo(text: string): Promise<HomeTodoListState> {
	const trimmed = text.trim()
	if (!trimmed) {
		throw new Error('Todo text is required.')
	}

	const state = await getHomeTodoList()
	const now = Date.now()
	const nextPosition =
		state.items.reduce((max, item) => Math.max(max, item.position), -1) + 1

	const item: HomeTodoItem = {
		id: crypto.randomUUID(),
		text: trimmed,
		checked: false,
		position: nextPosition,
		createdAt: now,
		updatedAt: now,
	}

	return saveHomeTodoList({
		...state,
		items: [...state.items, item],
	})
}

export async function updateHomeTodo(
	id: string,
	updates: Partial<Pick<HomeTodoItem, 'text' | 'checked' | 'position'>>,
): Promise<HomeTodoListState> {
	const state = await getHomeTodoList()
	const index = state.items.findIndex((item) => item.id === id)
	if (index === -1) {
		throw new Error('Todo not found.')
	}

	const current = state.items[index]!
	const nextText = updates.text?.trim()
	const item: HomeTodoItem = {
		...current,
		...(nextText !== undefined ? { text: nextText || current.text } : {}),
		...(updates.checked !== undefined ? { checked: updates.checked } : {}),
		...(updates.position !== undefined ? { position: updates.position } : {}),
		updatedAt: Date.now(),
	}

	const items = [...state.items]
	items[index] = item
	return saveHomeTodoList({ ...state, items })
}

export async function removeHomeTodo(id: string): Promise<HomeTodoListState> {
	const state = await getHomeTodoList()
	return saveHomeTodoList({
		...state,
		items: state.items.filter((item) => item.id !== id),
	})
}

export async function setHomeTodos(
	items: Array<{ text: string; checked?: boolean }>,
): Promise<HomeTodoListState> {
	const state = await getHomeTodoList()
	const now = Date.now()

	const normalized = items
		.map((item) => ({
			text: item.text.trim(),
			checked: item.checked ?? false,
		}))
		.filter((item) => item.text.length > 0)

	const nextItems = normalized.map((item, index) => ({
		id: crypto.randomUUID(),
		text: item.text,
		checked: item.checked,
		position: index,
		createdAt: now,
		updatedAt: now,
	}))

	return saveHomeTodoList({
		...state,
		items: nextItems,
	})
}

export async function clearCompletedHomeTodos(): Promise<HomeTodoListState> {
	const state = await getHomeTodoList()
	return saveHomeTodoList({
		...state,
		items: state.items.filter((item) => !item.checked),
	})
}
