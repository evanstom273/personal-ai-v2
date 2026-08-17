import type { MessageDocumentLink } from '@/storage/types'

export function extractDocumentLinkFromToolResult(
	toolName: string,
	response: Record<string, unknown>,
): MessageDocumentLink | null {
	if (response.error) {
		return null
	}

	const id = typeof response.id === 'string' ? response.id : undefined
	const title = typeof response.title === 'string' ? response.title.trim() : undefined

	if (!id || !title) {
		return null
	}

	if (toolName === 'create_document') {
		return { id, title, action: 'created' }
	}

	if (toolName === 'update_document' || toolName === 'rename_document') {
		return { id, title, action: 'updated' }
	}

	return null
}

export function mergeDocumentLinks(
	existing: MessageDocumentLink[],
	incoming: MessageDocumentLink[],
): MessageDocumentLink[] {
	const merged = new Map<string, MessageDocumentLink>()

	for (const link of existing) {
		merged.set(link.id, link)
	}

	for (const link of incoming) {
		merged.set(link.id, link)
	}

	return [...merged.values()]
}
