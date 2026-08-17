import { listDocuments } from '@/services/documents/documentService'
import {
	documentBodyForContext,
	truncateDocumentTextForTool,
} from '@/services/gemini/documentContext'
import type { DocumentRecord } from '@/storage/types'

export function extractMentionedDocuments(
	text: string,
	documents: DocumentRecord[],
): DocumentRecord[] {
	const matched: DocumentRecord[] = []
	const seen = new Set<string>()
	const sorted = [...documents].sort((a, b) => b.title.length - a.title.length)

	for (const document of sorted) {
		const mention = `@${document.title}`
		if (text.includes(mention) && !seen.has(document.id)) {
			matched.push(document)
			seen.add(document.id)
		}
	}

	return matched
}

export async function buildMentionedDocumentsContext(
	userText: string,
): Promise<string> {
	const documents = await listDocuments()
	const mentioned = extractMentionedDocuments(userText, documents)

	if (mentioned.length === 0) {
		return ''
	}

	const sections = mentioned.map((document) => {
		const body = documentBodyForContext(document)
		const truncated = truncateDocumentTextForTool(body)
		return [
			`### @${document.title} (id: ${document.id})`,
			truncated.text,
			truncated.truncated ? '_Content truncated — use read_document for the full file._' : '',
		]
			.filter(Boolean)
			.join('\n')
	})

	return [
		'## Documents referenced in this message (@mentions)',
		'',
		'The user explicitly referenced these documents with @mentions. Use document tools to read updates or edit them.',
		'',
		sections.join('\n\n'),
	].join('\n')
}
