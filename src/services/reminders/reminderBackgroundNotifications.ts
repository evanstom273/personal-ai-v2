import {
	canUseNativeReminderNotifications,
	requestNativeReminderNotificationPermission,
	syncNativeReminderNotifications,
} from '@/services/reminders/reminderNativeNotifications'
import {
	canUseNotificationTriggers,
	syncReminderNotificationTriggers,
} from '@/services/reminders/reminderNotificationTriggers'
import type { UserPreferences } from '@/storage/types'
import { getNotificationPermission, requestNotificationPermission } from '@/utils/notifications'

export function canUseBackgroundReminderNotifications(): boolean {
	return canUseNativeReminderNotifications() || canUseNotificationTriggers()
}

export function hasBackgroundReminderNotificationPermission(): boolean {
	if (canUseNativeReminderNotifications()) {
		return true
	}

	return getNotificationPermission() === 'granted'
}

export async function requestBackgroundReminderNotificationPermission(): Promise<boolean> {
	if (canUseNativeReminderNotifications()) {
		return requestNativeReminderNotificationPermission()
	}

	return (await requestNotificationPermission()) === 'granted'
}

export async function syncBackgroundReminderNotifications(
	preferences: UserPreferences,
): Promise<void> {
	await Promise.all([
		syncNativeReminderNotifications(preferences),
		syncReminderNotificationTriggers(preferences),
	])
}
