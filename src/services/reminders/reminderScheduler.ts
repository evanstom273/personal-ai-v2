import { buildReminderAssistantMessage } from '@/services/reminders/reminderDelivery'
import {
	getReminder,
	listDueReminders,
	markReminderFired,
	notifyRemindersChanged,
} from '@/services/reminders/reminderService'
import type { ReminderRecord, StoredMessage, UserPreferences } from '@/storage/types'
import { notifyReminderDue } from '@/utils/notifications'

export interface ProcessDueRemindersOptions {
	preferences: UserPreferences
	appendMessages: (messages: StoredMessage[]) => Promise<unknown>
	isChatRoute: boolean
	force?: boolean
}

const firingReminderIds = new Set<string>()

async function fireReminderIfDue(
	reminder: ReminderRecord,
	options: ProcessDueRemindersOptions,
): Promise<boolean> {
	if (firingReminderIds.has(reminder.id)) {
		return false
	}

	const now = Date.now()
	if (!options.force && reminder.scheduledAt > now) {
		return false
	}

	firingReminderIds.add(reminder.id)

	try {
		const fresh = await getReminder(reminder.id)
		if (!fresh?.enabled) {
			return false
		}

		if (!options.force && fresh.scheduledAt > now) {
			return false
		}

		if (
			fresh.lastFiredAt !== undefined &&
			fresh.lastFiredAt >= fresh.scheduledAt
		) {
			return false
		}

		const aiName = options.preferences.aiName.trim() || 'Assistant'
		const content = buildReminderAssistantMessage(fresh, options.preferences)

		await options.appendMessages([
			{
				id: crypto.randomUUID(),
				role: 'assistant',
				content,
				createdAt: Date.now(),
			},
		])

		await markReminderFired(fresh)

		void notifyReminderDue(aiName, fresh.title, content, {
			isChatRoute: options.isChatRoute,
		})

		notifyRemindersChanged()
		return true
	} finally {
		firingReminderIds.delete(reminder.id)
	}
}

export async function processReminderById(
	id: string,
	options: ProcessDueRemindersOptions,
): Promise<boolean> {
	const reminder = await getReminder(id)
	if (!reminder) {
		return false
	}

	return fireReminderIfDue(reminder, options)
}

export async function processDueReminders(
	options: ProcessDueRemindersOptions,
): Promise<number> {
	const due = await listDueReminders()
	if (due.length === 0) {
		return 0
	}

	let firedCount = 0

	for (const reminder of due) {
		const fired = await fireReminderIfDue(reminder, options)
		if (fired) {
			firedCount += 1
		}
	}

	return firedCount
}
