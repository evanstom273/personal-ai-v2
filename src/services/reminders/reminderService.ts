import {
	advanceReminderSchedule,
	parseReminderRecurrence,
	parseScheduledAtIso,
} from '@/services/reminders/reminderRecurrence'
import {
	createReminderApi,
	deleteReminderApi,
	fetchDueReminders,
	fetchReminder,
	fetchReminders,
	importRemindersBatch,
	updateReminderApi,
} from '@/services/reminders/remindersApi'
import {
	isMigrationComplete,
	markMigrationComplete,
	MIGRATION_FLAGS,
	requirePersonalAiServer,
} from '@/services/personalaiServer'
import { getAllValues } from '@/storage/storageService'
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

async function migrateIndexedDbToServerIfNeeded(): Promise<void> {
	if (isMigrationComplete(MIGRATION_FLAGS.reminders)) return

	const local = await getAllValues<ReminderRecord>('reminders')
	if (local.length === 0) {
		markMigrationComplete(MIGRATION_FLAGS.reminders)
		return
	}

	await importRemindersBatch(local)
	markMigrationComplete(MIGRATION_FLAGS.reminders)
}

async function ensureReady(): Promise<void> {
	requirePersonalAiServer()
	await migrateIndexedDbToServerIfNeeded()
}

export async function listReminders(query?: string): Promise<ReminderRecord[]> {
	await ensureReady()
	return sortReminders(await fetchReminders(query))
}

export async function getReminder(id: string): Promise<ReminderRecord | undefined> {
	await ensureReady()
	return fetchReminder(id)
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
	await ensureReady()
	const reminder = await createReminderApi(input)
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
	await ensureReady()
	const reminder = await updateReminderApi(id, updates)
	if (!reminder) return undefined
	notifyRemindersChanged()
	return reminder
}

export async function deleteReminder(id: string): Promise<boolean> {
	await ensureReady()
	const existing = await getReminder(id)
	if (!existing) return false
	await deleteReminderApi(id)
	notifyRemindersChanged()
	return true
}

export async function listDueReminders(now = Date.now()): Promise<ReminderRecord[]> {
	await ensureReady()
	return await fetchDueReminders(now)
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

	if (!input.title?.trim()) return undefined

	const normalized = input.title.trim().toLowerCase()
	const matches = (await listReminders()).filter((reminder) =>
		reminder.title.toLowerCase().includes(normalized),
	)

	if (matches.length === 1) return matches[0]
	return matches.find((reminder) => reminder.title.toLowerCase() === normalized)
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
			typeof args.delivery_message === 'string' ? args.delivery_message : undefined,
	}
}
