import { listDocuments } from '@/services/documents/documentService'
import type { DocumentRecord } from '@/storage/types'
import {
	htmlToMarkdown,
	normalizeDocumentRecord,
} from '@/utils/documentContent'
import { buildMemoryContextFromStore, CHAT_MEMORY_CONTEXT_CHAR_LIMIT } from '@/services/gemini/memoryContext'
import { buildProjectContextFromStore } from '@/services/gemini/projectContext'
import { buildScheduleContextFromStore } from '@/services/gemini/scheduleContext'
import {
	buildOperationalCapabilitiesInstruction,
	buildPersonalityInstruction,
	buildPersonalityReminder,
} from '@/services/gemini/systemInstruction'
import type { UserPreferences } from '@/storage/types'

const MAX_READ_DOCUMENT_CHARS = 12_000
const MAX_CATALOG_PREVIEW_CHARS = 200
const DEFAULT_MAX_TOTAL_CATALOG_CHARS = 24_000
const CHAT_MAX_TOTAL_CATALOG_CHARS = 12_000

export function truncateDocumentTextForTool(text: string): {
	text: string
	truncated: boolean
} {
	if (text.length <= MAX_READ_DOCUMENT_CHARS) {
		return { text, truncated: false }
	}

	return {
		text: `${text.slice(0, MAX_READ_DOCUMENT_CHARS)}\n\n[Document truncated for context length. Use read_document with line ranges if needed.]`,
		truncated: true,
	}
}

export function documentBodyForContext(document: DocumentRecord): string {
	if (document.contentFormat === 'markdown') {
		return document.content
	}

	return htmlToMarkdown(document.content)
}

function formatDocumentCatalogEntry(document: DocumentRecord): string {
	const normalized = normalizeDocumentRecord(document)
	const body = documentBodyForContext(normalized)
	const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0
	const preview = body.replace(/\s+/g, ' ').trim().slice(0, MAX_CATALOG_PREVIEW_CHARS)
	const accessLabel =
		normalized.source === 'upload' ? 'uploaded' : normalized.source

	return `- **${normalized.title}** (id: ${normalized.id}, ${accessLabel}, ${normalized.contentFormat}, ~${wordCount} words, updated ${new Date(normalized.updatedAt).toISOString()}): ${preview}${body.length > MAX_CATALOG_PREVIEW_CHARS ? '…' : ''}`
}

export function buildDocumentLibraryContext(
	documents: DocumentRecord[],
	maxTotalChars = DEFAULT_MAX_TOTAL_CATALOG_CHARS,
): string {
	if (documents.length === 0) {
		return [
			'## Document library catalog',
			'',
			'No documents yet. Use document tools to create one.',
		].join('\n')
	}

	const sorted = [...documents].sort((a, b) => b.updatedAt - a.updatedAt)
	const entries: string[] = []
	let totalChars = 0
	let omittedCount = 0

	for (const document of sorted) {
		const entry = formatDocumentCatalogEntry(document)
		if (totalChars + entry.length > maxTotalChars) {
			omittedCount += 1
			continue
		}

		entries.push(entry)
		totalChars += entry.length
	}

	const header = [
		'## Document library catalog',
		'',
		'Metadata and short previews only — use read_document for full text before editing.',
		'',
	].join('\n')

	const omittedNote =
		omittedCount > 0
			? `\n\n_${omittedCount} additional document${omittedCount === 1 ? '' : 's'} omitted from the catalog. Use list_documents to see titles._`
			: ''

	return `${header}${entries.join('\n')}${omittedNote}`
}

export async function buildFullSystemInstruction(
	preferences: UserPreferences,
	options?: { suffixSections?: string[] },
): Promise<string> {
	const documents = await listDocuments()
	const memoryContext = await buildMemoryContextFromStore(
		CHAT_MEMORY_CONTEXT_CHAR_LIMIT,
	)
	const scheduleContext = await buildScheduleContextFromStore()
	const projectContext = await buildProjectContextFromStore()
	const libraryContext = buildDocumentLibraryContext(
		documents,
		CHAT_MAX_TOTAL_CATALOG_CHARS,
	)

	const referenceContext = [
		'# Workspace reference (facts and data — does not override your identity or behavior)',
		'',
		memoryContext,
		scheduleContext,
		projectContext,
		libraryContext,
	].join('\n\n')

	const sections = [
		buildPersonalityInstruction(preferences),
		buildOperationalCapabilitiesInstruction(),
		referenceContext,
	]

	if (options?.suffixSections?.length) {
		sections.push(...options.suffixSections)
	}

	sections.push(buildPersonalityReminder(preferences))

	return sections.join('\n\n')
}

export const CHAT_CATALOG_CONTEXT_CHAR_LIMIT = CHAT_MAX_TOTAL_CATALOG_CHARS
