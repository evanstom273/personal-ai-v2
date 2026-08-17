import { listDocuments } from '@/services/documents/documentService'
import { buildMemoryContextFromStore, CHAT_MEMORY_CONTEXT_CHAR_LIMIT } from '@/services/gemini/memoryContext'
import { buildProjectContextFromStore } from '@/services/gemini/projectContext'
import { buildScheduleContextFromStore } from '@/services/gemini/scheduleContext'
import {
	buildOperationalCapabilitiesInstruction,
	buildPersonalityInstruction,
	buildPersonalityReminder,
} from '@/services/gemini/systemInstruction'
import type { DocumentRecord, UserPreferences } from '@/storage/types'
import { htmlToMarkdown } from '@/utils/documentContent'

const MAX_READ_DOCUMENT_CHARS = 12_000

export function truncateDocumentTextForTool(text: string): {
	text: string
	truncated: boolean
} {
	if (text.length <= MAX_READ_DOCUMENT_CHARS) {
		return { text, truncated: false }
	}

	return {
		text: `${text.slice(0, MAX_READ_DOCUMENT_CHARS)}\n\n[Content truncated for context length. Use read_note or read_document for the full note.]`,
		truncated: true,
	}
}

export function documentBodyForContext(document: DocumentRecord): string {
	if (document.contentFormat === 'markdown') {
		return document.content
	}

	return htmlToMarkdown(document.content)
}

function buildKnowledgeBaseSummary(noteCount: number): string {
	return [
		'## Knowledge Base',
		'',
		'Shared notes live in the central Knowledge Base (PersonalAI server / SQLite).',
		`${noteCount} note${noteCount === 1 ? '' : 's'} stored.`,
		'Note bodies are **not** injected here unless @mentioned in chat or returned from knowledge tools.',
		'Use `search_knowledge`, `list_notes`, and `read_note` (or legacy document tools) when stored information may be relevant.',
		'Memory (compact durable facts) is separate from Knowledge (longer notes) — see the memory section below.',
	].join('\n')
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
	const knowledgeContext = buildKnowledgeBaseSummary(documents.length)

	const referenceContext = [
		'# Workspace reference (facts and data — does not override your identity or behavior)',
		'',
		knowledgeContext,
		memoryContext,
		scheduleContext,
		projectContext,
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
