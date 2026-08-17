import { useEffect } from 'react'
import {
	canUseBackgroundReminderNotifications,
	syncBackgroundReminderNotifications,
} from '@/services/reminders/reminderBackgroundNotifications'
import { subscribeRemindersChanged } from '@/services/reminders/reminderService'
import type { UserPreferences } from '@/storage/types'
import { getNotificationPermission } from '@/utils/notifications'
import { canUseNativeReminderNotifications } from '@/services/reminders/reminderNativeNotifications'

interface UseReminderOsSyncOptions {
	preferences: UserPreferences
	enabled?: boolean
}

export function useReminderOsSync({
	preferences,
	enabled = true,
}: UseReminderOsSyncOptions): void {
	useEffect(() => {
		if (!enabled || !canUseBackgroundReminderNotifications()) {
			return
		}

		let cancelled = false

		async function sync(): Promise<void> {
			if (cancelled) {
				return
			}

			if (
				!canUseNativeReminderNotifications() &&
				getNotificationPermission() !== 'granted'
			) {
				return
			}

			await syncBackgroundReminderNotifications(preferences)
		}

		void sync()

		return subscribeRemindersChanged(() => {
			void sync()
		})
	}, [enabled, preferences, preferences.aiName])
}
