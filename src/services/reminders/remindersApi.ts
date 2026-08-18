import { buildPersonalaiApiUrl } from '@/utils/personalaiEndpoint'
import { loadCachedPersonalaiHost } from '@/services/personalaiApi'
import type {
	ReminderRecord,
	ReminderRecurrence,
	ReminderSource,
} from '@/storage/types'

async function parseError(res: Response): Promise<string> {
	const text = await res.text().catch(() => '')
	try {
		const json = JSON.parse(text) as { error?: string }
		if (json.error) return json.error
	} catch {
		// not json
	}
	return text || `HTTP ${res.status}`
}

function url(path = ''): string {
	return buildPersonalaiApiUrl(loadCachedPersonalaiHost(), `/reminders${path}`)
}

export async function fetchReminders(query?: string): Promise<ReminderRecord[]> {
	const suffix = query ? `?query=${encodeURIComponent(query)}` : ''
	const res = await fetch(url(suffix))
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { reminders: ReminderRecord[] }
	return data.reminders ?? []
}

export async function fetchDueReminders(now = Date.now()): Promise<ReminderRecord[]> {
	const res = await fetch(url(`/due?now=${now}`))
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { reminders: ReminderRecord[] }
	return data.reminders ?? []
}

export async function fetchReminder(id: string): Promise<ReminderRecord | undefined> {
	const res = await fetch(url(`/${id}`))
	if (res.status === 404) return undefined
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { reminder: ReminderRecord }
	return data.reminder
}

export async function createReminderApi(input: {
	id?: string
	title: string
	scheduledAt: number
	recurrence?: ReminderRecurrence
	note?: string
	deliveryMessage?: string
	source?: ReminderSource
	enabled?: boolean
}): Promise<ReminderRecord> {
	const res = await fetch(url(''), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { reminder: ReminderRecord }
	return data.reminder
}

export async function updateReminderApi(
	id: string,
	updates: Partial<ReminderRecord>,
): Promise<ReminderRecord> {
	const res = await fetch(url(`/${id}`), {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(updates),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { reminder: ReminderRecord }
	return data.reminder
}

export async function deleteReminderApi(id: string): Promise<void> {
	const res = await fetch(url(`/${id}`), { method: 'DELETE' })
	if (!res.ok) throw new Error(await parseError(res))
}

export async function importRemindersBatch(
	reminders: ReminderRecord[],
): Promise<{ imported: number; skipped: number }> {
	const res = await fetch(url('/import-batch'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ reminders }),
	})
	if (!res.ok) throw new Error(await parseError(res))
	return (await res.json()) as { imported: number; skipped: number }
}
