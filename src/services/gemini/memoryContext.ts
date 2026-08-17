import { listMemoryEntries } from '@/services/memory/memoryService'
import type { MemoryEntry } from '@/storage/types'

const MAX_TOTAL_MEMORY_CHARS = 48_000

const CATEGORY_LABELS: Record<MemoryEntry['category'], string> = {
	preference: 'Preference',
	fact: 'Fact',
	project: 'Project',
	decision: 'Decision',
	other: 'Other',
}

function formatMemoryEntry(entry: MemoryEntry): string {
	return `- **${CATEGORY_LABELS[entry.category]}:** ${entry.content}`
}

export function buildMemoryContext(entries: MemoryEntry[]): string {
	if (entries.length === 0) {
		return [
			'## Long-term memory (always in context)',
			'',
			'No archived memory yet. Important facts from older conversation will appear here automatically.',
		].join('\n')
	}

	const sorted = [...entries].sort((a, b) => a.createdAt - b.createdAt)
	const lines: string[] = []
	let totalChars = 0
	let omittedCount = 0

	for (const entry of sorted) {
		const line = formatMemoryEntry(entry)
		if (totalChars + line.length > MAX_TOTAL_MEMORY_CHARS) {
			omittedCount += 1
			continue
		}

		lines.push(line)
		totalChars += line.length
	}

	const header = [
		'## Long-term memory (always in context)',
		'',
		'These facts were extracted from earlier conversation and are authoritative for continuity. Do not contradict them unless the user clearly updates something.',
		'',
	].join('\n')

	const omittedNote =
		omittedCount > 0
			? `\n\n_${omittedCount} older memory entr${omittedCount === 1 ? 'y' : 'ies'} omitted due to context size limits._`
			: ''

	return `${header}${lines.join('\n')}${omittedNote}`
}

export async function buildMemoryContextFromStore(): Promise<string> {
	const entries = await listMemoryEntries()
	return buildMemoryContext(entries)
}
