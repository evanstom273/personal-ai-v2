export interface ActiveDocumentMention {
	start: number
	end: number
	query: string
}

export function getActiveDocumentMention(
	text: string,
	cursorPosition: number,
): ActiveDocumentMention | null {
	const beforeCursor = text.slice(0, cursorPosition)
	const match = beforeCursor.match(/@([^\s@]*)$/)

	if (!match || match.index === undefined) {
		return null
	}

	return {
		start: match.index,
		end: cursorPosition,
		query: match[1] ?? '',
	}
}

export function buildDocumentMention(title: string): string {
	return `@${title}`
}

export function insertDocumentMention(
	text: string,
	mention: ActiveDocumentMention,
	title: string,
): { nextText: string; nextCursor: number } {
	const insertion = `${buildDocumentMention(title)} `
	const nextText =
		text.slice(0, mention.start) + insertion + text.slice(mention.end)
	const nextCursor = mention.start + insertion.length

	return { nextText, nextCursor }
}
