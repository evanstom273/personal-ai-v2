import { randomUUID } from 'node:crypto'
import type { PersonalAiDatabase } from '../db/types.js'

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ReminderSource = 'user' | 'assistant'

export interface ReminderRow {
	id: string
	title: string
	note: string | null
	delivery_message: string | null
	scheduled_at: number
	recurrence: ReminderRecurrence
	enabled: number
	source: ReminderSource
	last_fired_at: number | null
	created_at: number
	updated_at: number
}

export interface ReminderRecord {
	id: string
	title: string
	note?: string
	deliveryMessage?: string
	scheduledAt: number
	recurrence: ReminderRecurrence
	enabled: boolean
	source: ReminderSource
	lastFiredAt?: number
	createdAt: number
	updatedAt: number
}

function mapReminderRow(row: ReminderRow): ReminderRecord {
	return {
		id: row.id,
		title: row.title,
		note: row.note ?? undefined,
		deliveryMessage: row.delivery_message ?? undefined,
		scheduledAt: row.scheduled_at,
		recurrence: row.recurrence,
		enabled: row.enabled === 1,
		source: row.source,
		lastFiredAt: row.last_fired_at ?? undefined,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

export function listReminders(db: PersonalAiDatabase, query?: string): ReminderRecord[] {
	const rows = db
		.prepare(
			`SELECT id, title, note, delivery_message, scheduled_at, recurrence, enabled,
			        source, last_fired_at, created_at, updated_at
			 FROM reminders
			 ORDER BY enabled DESC, scheduled_at ASC`,
		)
		.all() as ReminderRow[]

	let reminders = rows.map(mapReminderRow)

	if (query?.trim()) {
		const q = query.trim().toLowerCase()
		reminders = reminders.filter(
			(reminder) =>
				reminder.title.toLowerCase().includes(q) ||
				(reminder.note?.toLowerCase().includes(q) ?? false),
		)
	}

	return reminders
}

export function getReminder(db: PersonalAiDatabase, id: string): ReminderRecord | undefined {
	const row = db
		.prepare(
			`SELECT id, title, note, delivery_message, scheduled_at, recurrence, enabled,
			        source, last_fired_at, created_at, updated_at
			 FROM reminders WHERE id = ?`,
		)
		.get(id) as ReminderRow | undefined

	return row ? mapReminderRow(row) : undefined
}

export function createReminder(
	db: PersonalAiDatabase,
	input: {
		id?: string
		title: string
		scheduledAt: number
		recurrence?: ReminderRecurrence
		note?: string
		deliveryMessage?: string
		source?: ReminderSource
		enabled?: boolean
		lastFiredAt?: number
		createdAt?: number
	},
): ReminderRecord {
	const now = input.createdAt ?? Date.now()
	const id = input.id ?? randomUUID()
	const title = input.title.trim()
	if (!title) throw new Error('Reminder title is required.')

	db.prepare(
		`INSERT INTO reminders (
			id, title, note, delivery_message, scheduled_at, recurrence, enabled,
			source, last_fired_at, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	).run(
		id,
		title,
		input.note?.trim() || null,
		input.deliveryMessage?.trim() || null,
		input.scheduledAt,
		input.recurrence ?? 'none',
		input.enabled === false ? 0 : 1,
		input.source ?? 'user',
		input.lastFiredAt ?? null,
		now,
		now,
	)

	return getReminder(db, id)!
}

export function updateReminder(
	db: PersonalAiDatabase,
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
): ReminderRecord | undefined {
	const existing = getReminder(db, id)
	if (!existing) return undefined

	const now = Date.now()
	const title = updates.title?.trim() ? updates.title.trim() : existing.title
	if (!title) throw new Error('Reminder title is required.')

	db.prepare(
		`UPDATE reminders SET
			title = ?, note = ?, delivery_message = ?, scheduled_at = ?, recurrence = ?,
			enabled = ?, last_fired_at = ?, updated_at = ?
		 WHERE id = ?`,
	).run(
		title,
		updates.note !== undefined ? updates.note.trim() || null : existing.note ?? null,
		updates.deliveryMessage !== undefined
			? updates.deliveryMessage.trim() || null
			: existing.deliveryMessage ?? null,
		updates.scheduledAt ?? existing.scheduledAt,
		updates.recurrence ?? existing.recurrence,
		updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : existing.enabled ? 1 : 0,
		updates.lastFiredAt !== undefined ? updates.lastFiredAt ?? null : existing.lastFiredAt ?? null,
		now,
		id,
	)

	return getReminder(db, id)
}

export function deleteReminder(db: PersonalAiDatabase, id: string): boolean {
	const result = db.prepare('DELETE FROM reminders WHERE id = ?').run(id)
	return result.changes > 0
}

export function listDueReminders(db: PersonalAiDatabase, now = Date.now()): ReminderRecord[] {
	return listReminders(db).filter(
		(reminder) => reminder.enabled && reminder.scheduledAt <= now,
	)
}

export function importRemindersBatch(
	db: PersonalAiDatabase,
	reminders: ReminderRecord[],
): { imported: number; skipped: number } {
	let imported = 0
	let skipped = 0

	for (const reminder of reminders) {
		if (getReminder(db, reminder.id)) {
			skipped += 1
			continue
		}

		const duplicate = listReminders(db).find(
			(item) =>
				item.title.toLowerCase() === reminder.title.toLowerCase() &&
				item.scheduledAt === reminder.scheduledAt,
		)
		if (duplicate) {
			skipped += 1
			continue
		}

		createReminder(db, {
			id: reminder.id,
			title: reminder.title,
			note: reminder.note,
			deliveryMessage: reminder.deliveryMessage,
			scheduledAt: reminder.scheduledAt,
			recurrence: reminder.recurrence,
			enabled: reminder.enabled,
			source: reminder.source,
			lastFiredAt: reminder.lastFiredAt,
			createdAt: reminder.createdAt,
		})
		imported += 1
	}

	return { imported, skipped }
}

export function mapReminderToApi(reminder: ReminderRecord) {
	return {
		id: reminder.id,
		title: reminder.title,
		note: reminder.note,
		deliveryMessage: reminder.deliveryMessage,
		scheduledAt: reminder.scheduledAt,
		recurrence: reminder.recurrence,
		enabled: reminder.enabled,
		source: reminder.source,
		lastFiredAt: reminder.lastFiredAt,
		createdAt: reminder.createdAt,
		updatedAt: reminder.updatedAt,
	}
}
