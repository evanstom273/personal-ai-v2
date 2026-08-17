import type { AutocompleteTriggerMatch } from '@/autocomplete/types'

export function getActiveTriggerMatch(
	text: string,
	cursorPosition: number,
	triggers: string[],
): AutocompleteTriggerMatch | null {
	if (cursorPosition < 0 || cursorPosition > text.length) {
		return null
	}

	const beforeCursor = text.slice(0, cursorPosition)

	for (const trigger of triggers) {
		const triggerIndex = beforeCursor.lastIndexOf(trigger)
		if (triggerIndex < 0) continue

		const afterTrigger = beforeCursor.slice(triggerIndex + trigger.length)
		if (afterTrigger.includes('\n')) continue
		if (/\s/.test(afterTrigger)) continue

		const charBefore = triggerIndex > 0 ? beforeCursor[triggerIndex - 1] : ''
		if (trigger === '@' && charBefore && !/\s|[([{]/.test(charBefore)) {
			continue
		}

		return {
			trigger,
			start: triggerIndex,
			end: cursorPosition,
			query: afterTrigger,
		}
	}

	return null
}

export function insertTriggerSelection(
	text: string,
	match: AutocompleteTriggerMatch,
	replacement: string,
): { text: string; cursorPosition: number } {
	const before = text.slice(0, match.start)
	const after = text.slice(match.end)
	const nextText = `${before}${replacement}${after}`
	const cursorPosition = before.length + replacement.length
	return { text: nextText, cursorPosition }
}

export function fuzzyScore(query: string, target: string): number {
	const q = query.trim().toLowerCase()
	const t = target.trim().toLowerCase()
	if (!q) return 1
	if (t === q) return 100
	if (t.startsWith(q)) return 80
	if (t.includes(q)) return 60

	let score = 0
	let searchFrom = 0
	for (const char of q) {
		const index = t.indexOf(char, searchFrom)
		if (index < 0) return 0
		score += 10
		searchFrom = index + 1
	}
	return score
}
