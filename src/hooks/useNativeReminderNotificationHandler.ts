import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { canUseNativeReminderNotifications } from '@/services/reminders/reminderNativeNotifications'

export function useNativeReminderNotificationHandler(enabled = true): void {
	const navigate = useNavigate()

	useEffect(() => {
		if (!enabled || !canUseNativeReminderNotifications()) {
			return
		}

		const actionListener = LocalNotifications.addListener(
			'localNotificationActionPerformed',
			(event) => {
				const reminderId =
					typeof event.notification.extra?.reminderId === 'string'
						? event.notification.extra.reminderId
						: null
				const url =
					typeof event.notification.extra?.url === 'string'
						? event.notification.extra.url
						: reminderId
							? `/chat?reminderFire=${encodeURIComponent(reminderId)}`
							: '/chat'

				navigate(url)
			},
		)

		return () => {
			void actionListener.then((listener) => listener.remove())
		}
	}, [enabled, navigate])
}
