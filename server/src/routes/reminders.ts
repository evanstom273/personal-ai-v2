import { Hono } from 'hono'
import type { ServerConfig } from '../config.js'
import { getDb } from '../db/connection.js'
import * as reminderRepo from '../repositories/reminderRepository.js'

export function createReminderRoutes(config: ServerConfig): Hono {
	const app = new Hono()

	function db() {
		return getDb(config)
	}

	app.get('/', (c) => {
		const query = c.req.query('query')
		const reminders = reminderRepo.listReminders(db(), query)
		return c.json({ reminders: reminders.map(reminderRepo.mapReminderToApi) })
	})

	app.get('/due', (c) => {
		const now = Number.parseInt(c.req.query('now') ?? String(Date.now()), 10)
		const reminders = reminderRepo.listDueReminders(db(), now)
		return c.json({ reminders: reminders.map(reminderRepo.mapReminderToApi) })
	})

	app.get('/:id', (c) => {
		const reminder = reminderRepo.getReminder(db(), c.req.param('id'))
		if (!reminder) return c.json({ error: 'Reminder not found' }, 404)
		return c.json({ reminder: reminderRepo.mapReminderToApi(reminder) })
	})

	app.post('/', async (c) => {
		const body = await c.req.json<{
			id?: string
			title?: string
			scheduledAt?: number
			recurrence?: reminderRepo.ReminderRecurrence
			note?: string
			deliveryMessage?: string
			source?: reminderRepo.ReminderSource
			enabled?: boolean
		}>()

		if (!body.title?.trim()) return c.json({ error: 'title is required' }, 400)
		if (!Number.isFinite(body.scheduledAt)) {
			return c.json({ error: 'scheduledAt is required' }, 400)
		}

		const reminder = reminderRepo.createReminder(db(), {
			id: body.id,
			title: body.title,
			scheduledAt: body.scheduledAt!,
			recurrence: body.recurrence,
			note: body.note,
			deliveryMessage: body.deliveryMessage,
			source: body.source,
			enabled: body.enabled,
		})

		return c.json({ reminder: reminderRepo.mapReminderToApi(reminder) })
	})

	app.patch('/:id', async (c) => {
		const body = await c.req.json<Partial<reminderRepo.ReminderRecord>>()
		const reminder = reminderRepo.updateReminder(db(), c.req.param('id'), body)
		if (!reminder) return c.json({ error: 'Reminder not found' }, 404)
		return c.json({ reminder: reminderRepo.mapReminderToApi(reminder) })
	})

	app.delete('/:id', (c) => {
		const deleted = reminderRepo.deleteReminder(db(), c.req.param('id'))
		if (!deleted) return c.json({ error: 'Reminder not found' }, 404)
		return c.json({ ok: true })
	})

	app.post('/import-batch', async (c) => {
		const body = await c.req.json<{ reminders?: reminderRepo.ReminderRecord[] }>()
		const result = reminderRepo.importRemindersBatch(db(), body.reminders ?? [])
		return c.json(result)
	})

	return app
}
