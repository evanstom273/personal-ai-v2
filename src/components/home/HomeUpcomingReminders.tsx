import { BellRing } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HomeEmptyState, HomeSection } from '@/components/home/HomeSection'
import { formatRecurrenceLabel } from '@/services/reminders/reminderRecurrence'
import type { ReminderRecord } from '@/storage/types'
import { formatMessageTime } from '@/utils/dateTime'

interface HomeUpcomingRemindersProps {
	reminders: ReminderRecord[]
	isLoading: boolean
}

export function HomeUpcomingReminders({
	reminders,
	isLoading,
}: HomeUpcomingRemindersProps) {
	const now = Date.now()
	const upcoming = reminders
		.filter((reminder) => reminder.enabled && reminder.scheduledAt > now)
		.sort((a, b) => a.scheduledAt - b.scheduledAt)
		.slice(0, 5)

	return (
		<HomeSection title="Upcoming reminders" icon={BellRing} href="/library?section=schedule">
			{isLoading ? (
				<HomeEmptyState>Loading reminders…</HomeEmptyState>
			) : upcoming.length === 0 ? (
				<HomeEmptyState>
					Nothing scheduled. Ask in chat or open Schedule to add one.
				</HomeEmptyState>
			) : (
				<ul className="space-y-2">
					{upcoming.map((reminder) => (
						<li
							key={reminder.id}
							className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5"
						>
							<div className="min-w-0">
								<p className="truncate text-sm">{reminder.title}</p>
								<p className="text-xs text-muted-foreground">
									{formatRecurrenceLabel(reminder.recurrence)}
								</p>
							</div>
							<span className="shrink-0 text-xs text-muted-foreground">
								{formatMessageTime(reminder.scheduledAt)}
							</span>
						</li>
					))}
				</ul>
			)}
			<p className="mt-3 text-xs text-muted-foreground">
				<Link to="/library?section=schedule" className="text-primary underline-offset-4 hover:underline">
					Open Schedule
				</Link>{' '}
				for the full list.
			</p>
		</HomeSection>
	)
}
