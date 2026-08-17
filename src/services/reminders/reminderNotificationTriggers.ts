import { listReminders } from '@/services/reminders/reminderService'
import type { ReminderRecord, UserPreferences } from '@/storage/types'
import { getNotificationIcon } from '@/utils/notifications'

const REMINDER_TAG_PREFIX = 'reminder-'

export function canUseNotificationTriggers(): boolean {
	if (typeof window === 'undefined') {
		return false
	}

	return (
		typeof TimestampTrigger !== 'undefined' &&
		'serviceWorker' in navigator &&
		'Notification' in window
	)
}

export function getReminderNotificationTag(reminderId: string): string {
	return `${REMINDER_TAG_PREFIX}${reminderId}`
}

function isReminderNotificationTag(tag: string | undefined): tag is string {
	return typeof tag === 'string' && tag.startsWith(REMINDER_TAG_PREFIX)
}

function buildReminderNotificationUrl(reminderId: string): string {
	return `/chat?reminderFire=${encodeURIComponent(reminderId)}`
}

function buildReminderNotificationTitle(preferences: UserPreferences): string {
	const aiName = preferences.aiName.trim() || 'Assistant'
	return `${aiName} reminder`
}

function buildReminderNotificationBody(reminder: ReminderRecord): string {
	const preview = reminder.note?.trim() || reminder.title.trim()
	return preview.slice(0, 160) || reminder.title
}

export async function cancelReminderNotificationTrigger(
	reminderId: string,
): Promise<void> {
	if (!canUseNotificationTriggers()) {
		return
	}

	try {
		const registration = await navigator.serviceWorker.ready
		const tag = getReminderNotificationTag(reminderId)
		const notifications = await registration.getNotifications({ tag })
		for (const notification of notifications) {
			notification.close()
		}
	} catch {
		// ignore sync failures
	}
}

async function scheduleReminderNotificationTrigger(
	reminder: ReminderRecord,
	preferences: UserPreferences,
): Promise<void> {
	if (!canUseNotificationTriggers() || Notification.permission !== 'granted') {
		return
	}

	if (!reminder.enabled || reminder.scheduledAt <= Date.now()) {
		return
	}

	if (typeof TimestampTrigger === 'undefined') {
		return
	}

	const registration = await navigator.serviceWorker.ready
	const tag = getReminderNotificationTag(reminder.id)

	await registration.showNotification(buildReminderNotificationTitle(preferences), {
		body: buildReminderNotificationBody(reminder),
		icon: getNotificationIcon(),
		badge: getNotificationIcon(),
		tag,
		data: {
			url: buildReminderNotificationUrl(reminder.id),
			reminderId: reminder.id,
		},
		showTrigger: new TimestampTrigger(reminder.scheduledAt),
	})
}

export async function syncReminderNotificationTriggers(
	preferences: UserPreferences,
	reminders = listReminders(),
): Promise<void> {
	if (!canUseNotificationTriggers() || Notification.permission !== 'granted') {
		return
	}

	try {
		const registration = await navigator.serviceWorker.ready
		const existing = await registration.getNotifications()
		const resolvedReminders = await reminders
		const now = Date.now()

		const desiredTags = new Set<string>()
		for (const reminder of resolvedReminders) {
			if (!reminder.enabled || reminder.scheduledAt <= now) {
				continue
			}

			desiredTags.add(getReminderNotificationTag(reminder.id))
		}

		for (const notification of existing) {
			if (
				isReminderNotificationTag(notification.tag) &&
				!desiredTags.has(notification.tag)
			) {
				notification.close()
			}
		}

		for (const reminder of resolvedReminders) {
			if (!reminder.enabled || reminder.scheduledAt <= now) {
				continue
			}

			const tag = getReminderNotificationTag(reminder.id)
			for (const notification of existing) {
				if (notification.tag === tag) {
					notification.close()
				}
			}

			await scheduleReminderNotificationTrigger(reminder, preferences)
		}
	} catch {
		// ignore sync failures
	}
}
