import {
	advanceReminderSchedule,
	parseReminderRecurrence,
	parseScheduledAtIso,
} from '@/services/reminders/reminderRecurrence'
import {
	deleteValue,
	getAllValues,
	getValue,
	setValue,
} from '@/storage/storageService'
import type {
	ReminderRecord,
	ReminderRecurrence,
	ReminderSource,
} from '@/storage/types'

const listeners = new Set<() => void>()

export function subscribeRemindersChanged(listener: () => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

export function notifyRemindersChanged(): void {
	for (const listener of listeners) {
		listener()
	}
}

function sortReminders(reminders: ReminderRecord[]): ReminderRecord[] {
	return [...reminders].sort((a, b) => {
		if (a.enabled !== b.enabled) {
			return a.enabled ? -1 : 1
		}
		return a.scheduledAt - b.scheduledAt
	})
}

export async function listReminders(query?: string): Promise<ReminderRecord[]> {
	const reminders = sortReminders(await getAllValues<ReminderRecord>('reminders'))

	if (!query?.trim()) {
		return reminders
	}

	const normalized = query.trim().toLowerCase()
	return reminders.filter(
		(reminder) =>
			reminder.title.toLowerCase().includes(normalized) ||
			(reminder.note?.toLowerCase().includes(normalized) ?? false),
	)
}

export async function getReminder(id: string): Promise<ReminderRecord | undefined> {
	return getValue<ReminderRecord>('reminders', id)
}

export async function createReminder(input: {
	title: string
	scheduledAt: number
	recurrence?: ReminderRecurrence
	note?: string
	deliveryMessage?: string
	source?: ReminderSource
	enabled?: boolean
}): Promise<ReminderRecord> {
	const now = Date.now()
	const title = input.title.trim()
	if (!title) {
		throw new Error('Reminder title is required.')
	}

	if (!Number.isFinite(input.scheduledAt)) {
		throw new Error('Reminder scheduled time is invalid.')
	}

	const reminder: ReminderRecord = {
		id: crypto.randomUUID(),
		title,
		note: input.note?.trim() || undefined,
		deliveryMessage: input.deliveryMessage?.trim() || undefined,
		scheduledAt: input.scheduledAt,
		recurrence: input.recurrence ?? 'none',
		enabled: input.enabled ?? true,
		source: input.source ?? 'user',
		createdAt: now,
		updatedAt: now,
	}

	await setValue('reminders', reminder.id, reminder)
	notifyRemindersChanged()
	return reminder
}

export async function updateReminder(
	id: string,
	updates: Partial<
		Pick<
			ReminderRecord,
			| 'title'
			| 'note'
			| 'deliveryMessage'
			| 'scheduledAt'
			| 'recurrence'
			| 'enabled'
			| 'lastFiredAt'
		>
	>,
): Promise<ReminderRecord | undefined> {
	const existing = await getReminder(id)
	if (!existing) {
		return undefined
	}

	const next: ReminderRecord = {
		...existing,
		...updates,
		title: updates.title !== undefined ? updates.title.trim() : existing.title,
		note:
			updates.note !== undefined
				? updates.note.trim() || undefined
				: existing.note,
		deliveryMessage:
			updates.deliveryMessage !== undefined
				? updates.deliveryMessage.trim() || undefined
				: existing.deliveryMessage,
		updatedAt: Date.now(),
	}

	if (!next.title) {
		throw new Error('Reminder title is required.')
	}

	await setValue('reminders', id, next)
	notifyRemindersChanged()
	return next
}

export async function deleteReminder(id: string): Promise<boolean> {
	const existing = await getReminder(id)
	if (!existing) {
		return false
	}

	await deleteValue('reminders', id)
	notifyRemindersChanged()
	return true
}

export async function listDueReminders(now = Date.now()): Promise<ReminderRecord[]> {
	const reminders = await listReminders()
	return reminders.filter(
		(reminder) => reminder.enabled && reminder.scheduledAt <= now,
	)
}

export async function markReminderFired(
	reminder: ReminderRecord,
	now = Date.now(),
): Promise<ReminderRecord | undefined> {
	if (reminder.recurrence === 'none') {
		await deleteReminder(reminder.id)
		return undefined
	}

	const advanced = advanceReminderSchedule(
		reminder.scheduledAt,
		reminder.recurrence,
		now,
	)

	return (
		(await updateReminder(reminder.id, {
			scheduledAt: advanced.scheduledAt,
			enabled: advanced.enabled,
			lastFiredAt: now,
		})) ?? reminder
	)
}

export async function resolveReminderRef(input: {
	reminderId?: string
	title?: string
}): Promise<ReminderRecord | undefined> {
	if (input.reminderId) {
		return getReminder(input.reminderId)
	}

	if (!input.title?.trim()) {
		return undefined
	}

	const normalized = input.title.trim().toLowerCase()
	const matches = (await listReminders()).filter((reminder) =>
		reminder.title.toLowerCase().includes(normalized),
	)

	if (matches.length === 1) {
		return matches[0]
	}

	return matches.find(
		(reminder) => reminder.title.toLowerCase() === normalized,
	)
}

export function buildReminderCreateInputFromToolArgs(
	args: Record<string, unknown>,
): {
	title: string
	scheduledAt: number
	recurrence: ReminderRecurrence
	note?: string
	deliveryMessage?: string
} | { error: string } {
	const title = typeof args.title === 'string' ? args.title.trim() : ''
	if (!title) {
		return { error: 'title is required.' }
	}

	const scheduledAt = parseScheduledAtIso(args.scheduled_at_iso)
	if (scheduledAt === null) {
		return {
			error:
				'scheduled_at_iso is required and must be a valid ISO 8601 datetime in the user local timezone or with offset.',
		}
	}

	const recurrence =
		parseReminderRecurrence(args.recurrence) ?? ('none' as ReminderRecurrence)

	return {
		title,
		scheduledAt,
		recurrence,
		note: typeof args.note === 'string' ? args.note : undefined,
		deliveryMessage:
			typeof args.delivery_message === 'string'
				? args.delivery_message
				: undefined,
	}
}
