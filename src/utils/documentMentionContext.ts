import { listDocuments } from '@/services/documents/documentService'
import { listMemoryEntries } from '@/services/memory/memoryService'
import { listProjects } from '@/services/projects/projectService'
import {
	documentBodyForContext,
	truncateDocumentTextForTool,
} from '@/services/gemini/documentContext'
import type { DocumentRecord, MemoryEntry, ProjectRecord } from '@/storage/types'

const PROJECT_MENTION_PATTERN = /@project:([^\s@]+)/g
const MEMORY_MENTION_PATTERN = /@memory:([^\n@]+?)(?=\s|$)/g

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

function extractProjectMentionTitles(text: string): string[] {
	const titles: string[] = []
	for (const match of text.matchAll(PROJECT_MENTION_PATTERN)) {
		const title = match[1]?.trim()
		if (title) titles.push(title)
	}
	return titles
}

function extractMemoryMentionSnippets(text: string): string[] {
	const snippets: string[] = []
	for (const match of text.matchAll(MEMORY_MENTION_PATTERN)) {
		const snippet = match[1]?.trim()
		if (snippet) snippets.push(snippet)
	}
	return snippets
}

function matchProjectsByTitles(
	titles: string[],
	projects: ProjectRecord[],
): ProjectRecord[] {
	const matched: ProjectRecord[] = []
	const seen = new Set<string>()
	const normalizedTitles = titles.map((title) => title.toLowerCase())

	for (const project of projects) {
		const projectTitle = project.title.trim().toLowerCase()
		if (
			normalizedTitles.some(
				(title) => title === projectTitle || projectTitle.startsWith(title),
			) &&
			!seen.has(project.id)
		) {
			matched.push(project)
			seen.add(project.id)
		}
	}

	return matched
}

function matchMemoriesBySnippets(
	snippets: string[],
	memories: MemoryEntry[],
): MemoryEntry[] {
	const matched: MemoryEntry[] = []
	const seen = new Set<string>()
	const normalizedSnippets = snippets.map((snippet) => snippet.toLowerCase())

	for (const memory of memories) {
		const content = memory.content.toLowerCase()
		if (
			normalizedSnippets.some(
				(snippet) => content.startsWith(snippet) || content.includes(snippet),
			) &&
			!seen.has(memory.id)
		) {
			matched.push(memory)
			seen.add(memory.id)
		}
	}

	return matched
}

export async function buildMentionedDocumentsContext(
	userText: string,
): Promise<string> {
	const [documents, projects, memories] = await Promise.all([
		listDocuments(),
		listProjects(),
		listMemoryEntries(),
	])

	const mentionedDocuments = extractMentionedDocuments(userText, documents)
	const mentionedProjects = matchProjectsByTitles(
		extractProjectMentionTitles(userText),
		projects,
	)
	const mentionedMemories = matchMemoriesBySnippets(
		extractMemoryMentionSnippets(userText),
		memories,
	)

	if (
		mentionedDocuments.length === 0 &&
		mentionedProjects.length === 0 &&
		mentionedMemories.length === 0
	) {
		return ''
	}

	const sections: string[] = []

	for (const document of mentionedDocuments) {
		const body = documentBodyForContext(document)
		const truncated = truncateDocumentTextForTool(body)
		sections.push(
			[
				`### @${document.title} (Note, id: ${document.id})`,
				truncated.text,
				truncated.truncated
					? '_Content truncated — use read_document for the full file._'
					: '',
			]
				.filter(Boolean)
				.join('\n'),
		)
	}

	for (const project of mentionedProjects) {
		const taskSummary = project.tasks
			.slice(0, 12)
			.map((task) => `- [${task.status}] ${task.title}`)
			.join('\n')
		sections.push(
			[
				`### @project:${project.title} (Project, id: ${project.id})`,
				project.description?.trim() || '_No description._',
				taskSummary ? `Tasks:\n${taskSummary}` : '',
			]
				.filter(Boolean)
				.join('\n'),
		)
	}

	for (const memory of mentionedMemories) {
		sections.push(
			[
				`### @memory:${memory.content.slice(0, 60)} (Memory, id: ${memory.id})`,
				`Category: ${memory.category}`,
				memory.content,
			].join('\n'),
		)
	}

	return [
		'## References in this message (@mentions)',
		'',
		'The user explicitly referenced these items with @mentions.',
		'',
		sections.join('\n\n'),
	].join('\n')
}
