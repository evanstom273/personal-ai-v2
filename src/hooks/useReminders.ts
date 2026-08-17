import { useCallback, useEffect, useState } from 'react'
import {
	createReminder,
	deleteReminder,
	listReminders,
	subscribeRemindersChanged,
	updateReminder,
} from '@/services/reminders/reminderService'
import type { ReminderRecord, ReminderRecurrence } from '@/storage/types'

export function useReminders() {
	const [reminders, setReminders] = useState<ReminderRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const refreshReminders = useCallback(async (query?: string) => {
		const next = await listReminders(query)
		setReminders(next)
		setIsLoading(false)
		return next
	}, [])

	useEffect(() => {
		void refreshReminders()
		return subscribeRemindersChanged(() => {
			void refreshReminders()
		})
	}, [refreshReminders])

	const addReminder = useCallback(
		async (input: {
			title: string
			scheduledAt: number
			recurrence?: ReminderRecurrence
			note?: string
			deliveryMessage?: string
		}) => {
			return createReminder({ ...input, source: 'user' })
		},
		[],
	)

	const saveReminder = useCallback(
		async (
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
				>
			>,
		) => {
			return updateReminder(id, updates)
		},
		[],
	)

	const removeReminder = useCallback(async (id: string) => {
		await deleteReminder(id)
	}, [])

	return {
		reminders,
		isLoading,
		refreshReminders,
		addReminder,
		saveReminder,
		removeReminder,
	}
}
