import { buildPersonalaiApiUrl } from '@/utils/personalaiEndpoint'
import { loadCachedPersonalaiHost } from '@/services/personalaiApi'
import type { MemoryCategory, MemoryEntry } from '@/storage/types'

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
	return buildPersonalaiApiUrl(loadCachedPersonalaiHost(), `/memories${path}`)
}

export async function fetchMemories(query?: string): Promise<MemoryEntry[]> {
	const suffix = query ? `?query=${encodeURIComponent(query)}` : ''
	const res = await fetch(url(suffix))
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { memories: MemoryEntry[] }
	return data.memories ?? []
}

export async function addMemoriesBatchApi(
	entries: Array<Pick<MemoryEntry, 'content' | 'category' | 'archivedFromMessageCount'>>,
): Promise<MemoryEntry[]> {
	const res = await fetch(url('/batch'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ entries }),
	})
	if (!res.ok) throw new Error(await parseError(res))
	const data = (await res.json()) as { memories: MemoryEntry[] }
	return data.memories ?? []
}

export async function clearAllMemoriesApi(): Promise<void> {
	const res = await fetch(url(''), { method: 'DELETE' })
	if (!res.ok) throw new Error(await parseError(res))
}

export async function importMemoriesBatch(
	memories: MemoryEntry[],
): Promise<{ imported: number; skipped: number }> {
	const res = await fetch(url('/import-batch'), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ memories }),
	})
	if (!res.ok) throw new Error(await parseError(res))
	return (await res.json()) as { imported: number; skipped: number }
}

export type { MemoryCategory }
