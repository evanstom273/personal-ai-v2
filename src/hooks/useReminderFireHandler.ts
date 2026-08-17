import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { processReminderById } from '@/services/reminders/reminderScheduler'
import type { StoredMessage, UserPreferences } from '@/storage/types'

interface UseReminderFireHandlerOptions {
	preferences: UserPreferences
	appendMessages: (messages: StoredMessage[]) => Promise<unknown>
	isChatRoute: boolean
	enabled?: boolean
}

export function useReminderFireHandler({
	preferences,
	appendMessages,
	isChatRoute,
	enabled = true,
}: UseReminderFireHandlerOptions): void {
	const location = useLocation()
	const navigate = useNavigate()
	const appendMessagesRef = useRef(appendMessages)
	appendMessagesRef.current = appendMessages

	useEffect(() => {
		if (!enabled) {
			return
		}

		const params = new URLSearchParams(location.search)
		const reminderId = params.get('reminderFire')?.trim()
		if (!reminderId) {
			return
		}

		let cancelled = false

		async function handleReminderFire(): Promise<void> {
			await processReminderById(reminderId!, {
				preferences,
				appendMessages: (messages) => appendMessagesRef.current(messages),
				isChatRoute,
				force: true,
			})

			if (cancelled) {
				return
			}

			params.delete('reminderFire')
			const search = params.toString()
			navigate(
				{
					pathname: location.pathname,
					search: search ? `?${search}` : '',
				},
				{ replace: true },
			)
		}

		void handleReminderFire()

		return () => {
			cancelled = true
		}
	}, [
		enabled,
		isChatRoute,
		location.pathname,
		location.search,
		navigate,
		preferences,
	])
}
