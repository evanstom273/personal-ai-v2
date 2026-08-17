import { LocalNotifications } from '@capacitor/local-notifications'
import { listReminders } from '@/services/reminders/reminderService'
import type { ReminderRecord, UserPreferences } from '@/storage/types'
import { isCapacitorNativePlatform } from '@/utils/capacitor'
import { getNotificationIcon } from '@/utils/notifications'

const REMINDER_CHANNEL_ID = 'reminders'

export function canUseNativeReminderNotifications(): boolean {
	return isCapacitorNativePlatform()
}

export function reminderIdToNotificationId(reminderId: string): number {
	let hash = 0
	for (let index = 0; index < reminderId.length; index += 1) {
		hash = (hash << 5) - hash + reminderId.charCodeAt(index)
		hash |= 0
	}

	return Math.abs(hash) || 1
}

function buildReminderNotificationTitle(preferences: UserPreferences): string {
	const aiName = preferences.aiName.trim() || 'Assistant'
	return `${aiName} reminder`
}

function buildReminderNotificationBody(reminder: ReminderRecord): string {
	const preview = reminder.note?.trim() || reminder.title.trim()
	return preview.slice(0, 160) || reminder.title
}

async function ensureReminderChannel(): Promise<void> {
	await LocalNotifications.createChannel({
		id: REMINDER_CHANNEL_ID,
		name: 'Reminders',
		description: 'Scheduled reminder alerts',
		importance: 4,
		visibility: 1,
		vibration: true,
	})
}

export async function requestNativeReminderNotificationPermission(): Promise<boolean> {
	if (!canUseNativeReminderNotifications()) {
		return false
	}

	const result = await LocalNotifications.requestPermissions()
	return result.display === 'granted'
}

export async function cancelNativeReminderNotification(
	reminderId: string,
): Promise<void> {
	if (!canUseNativeReminderNotifications()) {
		return
	}

	await LocalNotifications.cancel({
		notifications: [{ id: reminderIdToNotificationId(reminderId) }],
	})
}

export async function syncNativeReminderNotifications(
	preferences: UserPreferences,
	reminders = listReminders(),
): Promise<void> {
	if (!canUseNativeReminderNotifications()) {
		return
	}

	const permission = await LocalNotifications.checkPermissions()
	if (permission.display !== 'granted') {
		return
	}

	await ensureReminderChannel()

	const resolvedReminders = await reminders
	const now = Date.now()
	const desiredIds = new Set<number>()

	for (const reminder of resolvedReminders) {
		if (!reminder.enabled || reminder.scheduledAt <= now) {
			continue
		}

		desiredIds.add(reminderIdToNotificationId(reminder.id))
	}

	const pending = await LocalNotifications.getPending()
	const staleIds = pending.notifications
		.map((notification) => notification.id)
		.filter((id) => !desiredIds.has(id))

	if (staleIds.length > 0) {
		await LocalNotifications.cancel({
			notifications: staleIds.map((id) => ({ id })),
		})
	}

	for (const reminder of resolvedReminders) {
		if (!reminder.enabled || reminder.scheduledAt <= now) {
			continue
		}

		const notificationId = reminderIdToNotificationId(reminder.id)
		await LocalNotifications.schedule({
			notifications: [
				{
					id: notificationId,
					title: buildReminderNotificationTitle(preferences),
					body: buildReminderNotificationBody(reminder),
					channelId: REMINDER_CHANNEL_ID,
					schedule: { at: new Date(reminder.scheduledAt) },
					sound: undefined,
					extra: {
						reminderId: reminder.id,
						url: `/chat?reminderFire=${encodeURIComponent(reminder.id)}`,
					},
					largeIcon: getNotificationIcon(),
				},
			],
		})
	}
}
