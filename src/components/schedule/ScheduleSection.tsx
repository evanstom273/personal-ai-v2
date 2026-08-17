import {
	BellRing,
	CalendarClock,
	MoreHorizontal,
	Pencil,
	Plus,
	Trash2,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useReminders } from '@/hooks/useReminders'
import {
	combineLocalDateAndTime,
	formatRecurrenceLabel,
} from '@/services/reminders/reminderRecurrence'
import {
	REMINDER_RECURRENCE_OPTIONS,
	type ReminderRecord,
	type ReminderRecurrence,
} from '@/storage/types'
import { canUseBackgroundReminderNotifications } from '@/services/reminders/reminderBackgroundNotifications'
import { canUseNotificationTriggers } from '@/services/reminders/reminderNotificationTriggers'
import { formatMessageTime } from '@/utils/dateTime'
import { cn } from '@/utils/cn'
import {
	getNotificationPermission,
	isStandaloneDisplayMode,
} from '@/utils/notifications'
import { isCapacitorNativePlatform } from '@/utils/capacitor'

function padDatePart(value: number): string {
	return String(value).padStart(2, '0')
}

function defaultDateTimeFields(): { date: string; time: string } {
	const next = new Date()
	next.setMinutes(next.getMinutes() + 30)
	next.setSeconds(0, 0)

	const date = `${next.getFullYear()}-${padDatePart(next.getMonth() + 1)}-${padDatePart(next.getDate())}`
	const time = `${padDatePart(next.getHours())}:${padDatePart(next.getMinutes())}`
	return { date, time }
}

function toDateInputValue(timestamp: number): string {
	const value = new Date(timestamp)
	return `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`
}

function toTimeInputValue(timestamp: number): string {
	const value = new Date(timestamp)
	return `${padDatePart(value.getHours())}:${padDatePart(value.getMinutes())}`
}

export function ScheduleSection() {
	const { reminders, isLoading, addReminder, saveReminder, removeReminder } =
		useReminders()
	const [showForm, setShowForm] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [title, setTitle] = useState('')
	const [date, setDate] = useState(defaultDateTimeFields().date)
	const [time, setTime] = useState(defaultDateTimeFields().time)
	const [recurrence, setRecurrence] = useState<ReminderRecurrence>('none')
	const [note, setNote] = useState('')
	const [deliveryMessage, setDeliveryMessage] = useState('')
	const [formError, setFormError] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)

	const backgroundRemindersSupported =
		isCapacitorNativePlatform() ||
		(canUseNotificationTriggers() &&
			getNotificationPermission() === 'granted' &&
			isStandaloneDisplayMode())

	const grouped = useMemo(() => {
		const now = Date.now()
		const upcoming: ReminderRecord[] = []
		const overdue: ReminderRecord[] = []
		const inactive: ReminderRecord[] = []

		for (const reminder of reminders) {
			if (!reminder.enabled) {
				inactive.push(reminder)
				continue
			}

			if (reminder.scheduledAt <= now) {
				overdue.push(reminder)
			} else {
				upcoming.push(reminder)
			}
		}

		return { upcoming, overdue, inactive }
	}, [reminders])

	function resetForm(): void {
		const defaults = defaultDateTimeFields()
		setEditingId(null)
		setTitle('')
		setDate(defaults.date)
		setTime(defaults.time)
		setRecurrence('none')
		setNote('')
		setDeliveryMessage('')
		setFormError(null)
	}

	function startCreate(): void {
		resetForm()
		setShowForm(true)
	}

	function startEdit(reminder: ReminderRecord): void {
		setEditingId(reminder.id)
		setTitle(reminder.title)
		setDate(toDateInputValue(reminder.scheduledAt))
		setTime(toTimeInputValue(reminder.scheduledAt))
		setRecurrence(reminder.recurrence)
		setNote(reminder.note ?? '')
		setDeliveryMessage(reminder.deliveryMessage ?? '')
		setFormError(null)
		setShowForm(true)
	}

	async function handleSubmit(event: FormEvent): Promise<void> {
		event.preventDefault()
		setFormError(null)

		const scheduledAt = combineLocalDateAndTime(date, time)
		if (scheduledAt === null) {
			setFormError('Pick a valid date and time.')
			return
		}

		if (!title.trim()) {
			setFormError('Title is required.')
			return
		}

		setIsSaving(true)
		try {
			if (editingId) {
				await saveReminder(editingId, {
					title: title.trim(),
					scheduledAt,
					recurrence,
					note: note.trim() || undefined,
					deliveryMessage: deliveryMessage.trim() || undefined,
					enabled: true,
				})
			} else {
				await addReminder({
					title: title.trim(),
					scheduledAt,
					recurrence,
					note: note.trim() || undefined,
					deliveryMessage: deliveryMessage.trim() || undefined,
				})
			}

			resetForm()
			setShowForm(false)
		} catch (error) {
			setFormError(
				error instanceof Error ? error.message : 'Could not save reminder.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-sm text-muted-foreground">
						Set reminders manually here or ask in{' '}
						<Link
							to="/chat"
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							chat
						</Link>{' '}
						— the assistant knows the current time and can schedule for you.
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						When due, {`you'll`} get a chat message from your assistant and a
						notification.
						{backgroundRemindersSupported
							? isCapacitorNativePlatform()
								? ' The Android app can alert you while it is closed; tap the notification to open chat.'
								: ' On this Android install, alerts can fire while the app is closed; tap the notification or reopen the app for the chat message.'
							: canUseBackgroundReminderNotifications()
								? ' Install this PWA to your home screen and enable notifications in Settings for background alerts on Android.'
								: ' Keep the app open for on-time delivery on this browser, or build the Android app for background alerts.'}
					</p>
				</div>
				<Button
					type="button"
					size="sm"
					onClick={() => (showForm ? (resetForm(), setShowForm(false)) : startCreate())}
				>
					{showForm ? null : <Plus className="h-4 w-4" />}
					{showForm ? 'Cancel' : 'New reminder'}
				</Button>
			</div>

			{showForm ? (
				<form
					onSubmit={(event) => void handleSubmit(event)}
					className="surface-panel space-y-4 rounded-xl p-5"
				>
					<h3 className="text-sm font-medium">
						{editingId ? 'Edit reminder' : 'Create reminder'}
					</h3>

					<div className="space-y-2">
						<label htmlFor="reminder-title" className="text-sm font-medium">
							Title
						</label>
						<input
							id="reminder-title"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="Take medication"
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label htmlFor="reminder-date" className="text-sm font-medium">
								Date
							</label>
							<input
								id="reminder-date"
								type="date"
								value={date}
								onChange={(event) => setDate(event.target.value)}
								className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="reminder-time" className="text-sm font-medium">
								Time
							</label>
							<input
								id="reminder-time"
								type="time"
								value={time}
								onChange={(event) => setTime(event.target.value)}
								className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label htmlFor="reminder-recurrence" className="text-sm font-medium">
							Repeat
						</label>
						<select
							id="reminder-recurrence"
							value={recurrence}
							onChange={(event) =>
								setRecurrence(event.target.value as ReminderRecurrence)
							}
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						>
							{REMINDER_RECURRENCE_OPTIONS.map((option) => (
								<option key={option} value={option}>
									{formatRecurrenceLabel(option)}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-2">
						<label htmlFor="reminder-note" className="text-sm font-medium">
							Note <span className="text-muted-foreground">(optional)</span>
						</label>
						<textarea
							id="reminder-note"
							value={note}
							onChange={(event) => setNote(event.target.value)}
							rows={2}
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>

					<div className="space-y-2">
						<label
							htmlFor="reminder-delivery-message"
							className="text-sm font-medium"
						>
							Assistant message{' '}
							<span className="text-muted-foreground">(optional)</span>
						</label>
						<textarea
							id="reminder-delivery-message"
							value={deliveryMessage}
							onChange={(event) => setDeliveryMessage(event.target.value)}
							rows={3}
							placeholder="Custom message your assistant sends in chat when this fires."
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>

					{formError ? (
						<p className="text-sm text-destructive">{formError}</p>
					) : null}

					<div className="flex flex-wrap gap-2">
						<Button type="submit" disabled={isSaving}>
							{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add reminder'}
						</Button>
					</div>
				</form>
			) : null}

			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading reminders…</p>
			) : reminders.length === 0 ? (
				<div className="library-placeholder rounded-2xl px-6 py-12 text-center">
					<CalendarClock className="mx-auto h-8 w-8 text-primary" />
					<p className="mt-3 text-sm font-medium">No reminders yet</p>
					<p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
						Create one above or tell your assistant something like &quot;remind me
						tomorrow at 9am to call the dentist.&quot;
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{grouped.overdue.length > 0 ? (
						<ReminderGroup
							title="Due now"
							reminders={grouped.overdue}
							onEdit={startEdit}
							onToggle={(reminder) =>
								void saveReminder(reminder.id, { enabled: !reminder.enabled })
							}
							onDelete={(reminder) => {
								if (window.confirm(`Delete "${reminder.title}"?`)) {
									void removeReminder(reminder.id)
								}
							}}
							tone="due"
						/>
					) : null}

					{grouped.upcoming.length > 0 ? (
						<ReminderGroup
							title="Upcoming"
							reminders={grouped.upcoming}
							onEdit={startEdit}
							onToggle={(reminder) =>
								void saveReminder(reminder.id, { enabled: !reminder.enabled })
							}
							onDelete={(reminder) => {
								if (window.confirm(`Delete "${reminder.title}"?`)) {
									void removeReminder(reminder.id)
								}
							}}
						/>
					) : null}

					{grouped.inactive.length > 0 ? (
						<ReminderGroup
							title="Completed / paused"
							reminders={grouped.inactive}
							onEdit={startEdit}
							onToggle={(reminder) =>
								void saveReminder(reminder.id, { enabled: !reminder.enabled })
							}
							onDelete={(reminder) => {
								if (window.confirm(`Delete "${reminder.title}"?`)) {
									void removeReminder(reminder.id)
								}
							}}
							muted
						/>
					) : null}
				</div>
			)}
		</div>
	)
}

function ReminderGroup({
	title,
	reminders,
	onEdit,
	onToggle,
	onDelete,
	tone,
	muted,
}: {
	title: string
	reminders: ReminderRecord[]
	onEdit: (reminder: ReminderRecord) => void
	onToggle: (reminder: ReminderRecord) => void
	onDelete: (reminder: ReminderRecord) => void
	tone?: 'due'
	muted?: boolean
}) {
	return (
		<section className="space-y-2">
			<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{title}
			</h3>
			<div className="space-y-2">
				{reminders.map((reminder) => (
					<ReminderCard
						key={reminder.id}
						reminder={reminder}
						onEdit={() => onEdit(reminder)}
						onToggle={() => onToggle(reminder)}
						onDelete={() => onDelete(reminder)}
						tone={tone}
						muted={muted}
					/>
				))}
			</div>
		</section>
	)
}

function ReminderCard({
	reminder,
	onEdit,
	onToggle,
	onDelete,
	tone,
	muted,
}: {
	reminder: ReminderRecord
	onEdit: () => void
	onToggle: () => void
	onDelete: () => void
	tone?: 'due'
	muted?: boolean
}) {
	return (
		<div
			className={cn(
				'surface-panel flex items-start gap-3 rounded-xl px-4 py-3',
				muted && 'opacity-70',
				tone === 'due' && 'ring-1 ring-primary/30',
			)}
		>
			<div
				className={cn(
					'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
					tone === 'due' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
				)}
			>
				{tone === 'due' ? (
					<BellRing className="h-4 w-4" />
				) : (
					<CalendarClock className="h-4 w-4" />
				)}
			</div>

			<div className="min-w-0 flex-1">
				<p className="font-medium">{reminder.title}</p>
				<p className="mt-1 text-xs text-muted-foreground">
					{formatMessageTime(reminder.scheduledAt)}
					{reminder.recurrence !== 'none'
						? ` · ${formatRecurrenceLabel(reminder.recurrence)}`
						: ''}
					{!reminder.enabled ? ' · Paused' : ''}
					{reminder.source === 'assistant' ? ' · From chat' : ''}
				</p>
				{reminder.note ? (
					<p className="mt-2 text-sm text-muted-foreground">{reminder.note}</p>
				) : null}
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger
					hideChevron
					className="h-9 w-9 shrink-0 justify-center px-0"
					aria-label="Reminder actions"
				>
					<MoreHorizontal className="h-4 w-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onSelect={onEdit}>
						<Pencil className="h-4 w-4" />
						Edit
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={onToggle}>
						{reminder.enabled ? 'Pause' : 'Resume'}
					</DropdownMenuItem>
					<DropdownMenuItem className="text-destructive" onSelect={onDelete}>
						<Trash2 className="h-4 w-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
