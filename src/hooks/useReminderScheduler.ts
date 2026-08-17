import { useEffect, useRef } from 'react'
import { processDueReminders } from '@/services/reminders/reminderScheduler'
import type { StoredMessage, UserPreferences } from '@/storage/types'

const CHECK_INTERVAL_MS = 30_000

interface UseReminderSchedulerOptions {
	preferences: UserPreferences
	appendMessages: (messages: StoredMessage[]) => Promise<unknown>
	isChatRoute: boolean
	enabled?: boolean
}

export function useReminderScheduler({
	preferences,
	appendMessages,
	isChatRoute,
	enabled = true,
}: UseReminderSchedulerOptions): void {
	const appendMessagesRef = useRef(appendMessages)
	appendMessagesRef.current = appendMessages

	useEffect(() => {
		if (!enabled) {
			return
		}

		let cancelled = false

		async function tick(): Promise<void> {
			if (cancelled) {
				return
			}

			await processDueReminders({
				preferences,
				appendMessages: (messages) => appendMessagesRef.current(messages),
				isChatRoute,
			})
		}

		void tick()
		const intervalId = window.setInterval(() => {
			void tick()
		}, CHECK_INTERVAL_MS)

		function handleVisibilityChange(): void {
			if (document.visibilityState === 'visible') {
				void tick()
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			cancelled = true
			window.clearInterval(intervalId)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [appendMessages, enabled, isChatRoute, preferences])
}
