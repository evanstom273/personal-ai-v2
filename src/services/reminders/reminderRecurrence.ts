import type { ReminderRecurrence } from '@/storage/types'

export function computeNextScheduledAt(
	fromMs: number,
	recurrence: ReminderRecurrence,
): number | null {
	if (recurrence === 'none') {
		return null
	}

	const next = new Date(fromMs)

	switch (recurrence) {
		case 'daily':
			next.setDate(next.getDate() + 1)
			break
		case 'weekly':
			next.setDate(next.getDate() + 7)
			break
		case 'monthly':
			next.setMonth(next.getMonth() + 1)
			break
		case 'yearly':
			next.setFullYear(next.getFullYear() + 1)
			break
		default:
			return null
	}

	return next.getTime()
}

export function advanceReminderSchedule(
	scheduledAt: number,
	recurrence: ReminderRecurrence,
	now = Date.now(),
): { scheduledAt: number; enabled: boolean } {
	if (recurrence === 'none') {
		return { scheduledAt, enabled: false }
	}

	let next = scheduledAt
	while (next <= now) {
		const computed = computeNextScheduledAt(next, recurrence)
		if (computed === null || computed === next) {
			break
		}
		next = computed
	}

	return { scheduledAt: next, enabled: true }
}

export function parseReminderRecurrence(
	value: unknown,
): ReminderRecurrence | null {
	if (typeof value !== 'string') {
		return null
	}

	const normalized = value.trim().toLowerCase()
	if (
		normalized === 'none' ||
		normalized === 'daily' ||
		normalized === 'weekly' ||
		normalized === 'monthly' ||
		normalized === 'yearly'
	) {
		return normalized
	}

	return null
}

export function parseScheduledAtIso(value: unknown): number | null {
	if (typeof value !== 'string' || !value.trim()) {
		return null
	}

	const parsed = Date.parse(value.trim())
	if (Number.isNaN(parsed)) {
		return null
	}

	return parsed
}

export function combineLocalDateAndTime(date: string, time: string): number | null {
	if (!date || !time) {
		return null
	}

	const parsed = Date.parse(`${date}T${time}`)
	if (Number.isNaN(parsed)) {
		return null
	}

	return parsed
}

export function formatRecurrenceLabel(recurrence: ReminderRecurrence): string {
	switch (recurrence) {
		case 'none':
			return 'Once'
		case 'daily':
			return 'Daily'
		case 'weekly':
			return 'Weekly'
		case 'monthly':
			return 'Monthly'
		case 'yearly':
			return 'Yearly'
		default:
			return recurrence
	}
}
