import {
	archiveDocument,
	createDocument,
	getDocumentBacklinks,
	resolveDocumentRef,
	searchDocuments,
	updateDocument,
} from '@/services/documents/documentService'
import type { DocumentToolResult } from '@/services/gemini/documentTools'
import {
	executeDocumentToolCall,
	DOCUMENT_TOOL_DECLARATIONS,
} from '@/services/gemini/documentTools'
import { truncateDocumentTextForTool } from '@/services/gemini/documentContext'
import { htmlToPlainText, normalizeMarkdownContent } from '@/utils/documentContent'

export const KNOWLEDGE_TOOL_DECLARATIONS = [
	...DOCUMENT_TOOL_DECLARATIONS,
	{
		name: 'search_knowledge',
		description:
			'Full-text search across the Knowledge Base (titles, content, tags). Use when stored notes may be relevant.',
		parameters: {
			type: 'OBJECT',
			properties: {
				query: { type: 'STRING', description: 'Search query.' },
				limit: { type: 'INTEGER', description: 'Max results (default 20).' },
			},
			required: ['query'],
		},
	},
	{
		name: 'list_notes',
		description:
			'List knowledge notes with optional title filter, collection, tag, or pinned filter.',
		parameters: {
			type: 'OBJECT',
			properties: {
				query: { type: 'STRING' },
				tag: { type: 'STRING' },
				pinned_only: { type: 'BOOLEAN' },
				include_archived: { type: 'BOOLEAN' },
			},
		},
	},
	{
		name: 'read_note',
		description: 'Read a knowledge note by id or exact title.',
		parameters: {
			type: 'OBJECT',
			properties: {
				note_id: { type: 'STRING' },
				title: { type: 'STRING' },
			},
		},
	},
	{
		name: 'create_note',
		description: 'Create a knowledge note in Markdown.',
		parameters: {
			type: 'OBJECT',
			properties: {
				title: { type: 'STRING' },
				content: { type: 'STRING' },
				tags: { type: 'ARRAY', items: { type: 'STRING' } },
				collection_id: { type: 'STRING' },
			},
			required: ['title', 'content'],
		},
	},
	{
		name: 'update_note',
		description: 'Update a knowledge note. Saves a revision when content changes.',
		parameters: {
			type: 'OBJECT',
			properties: {
				note_id: { type: 'STRING' },
				title: { type: 'STRING' },
				content: { type: 'STRING' },
				new_title: { type: 'STRING' },
				tags: { type: 'ARRAY', items: { type: 'STRING' } },
			},
		},
	},
	{
		name: 'rename_note',
		description: 'Rename a knowledge note.',
		parameters: {
			type: 'OBJECT',
			properties: {
				note_id: { type: 'STRING' },
				title: { type: 'STRING' },
				new_title: { type: 'STRING' },
			},
			required: ['new_title'],
		},
	},
	{
		name: 'move_note',
		description: 'Move a note to a different collection/folder.',
		parameters: {
			type: 'OBJECT',
			properties: {
				note_id: { type: 'STRING' },
				title: { type: 'STRING' },
				collection_id: { type: 'STRING' },
			},
			required: ['collection_id'],
		},
	},
	{
		name: 'add_tags',
		description: 'Add or replace tags on a knowledge note.',
		parameters: {
			type: 'OBJECT',
			properties: {
				note_id: { type: 'STRING' },
				title: { type: 'STRING' },
				tags: { type: 'ARRAY', items: { type: 'STRING' } },
			},
			required: ['tags'],
		},
	},
	{
		name: 'link_notes',
		description:
			'Add wiki-style links from one note to others by appending [[Target Title]] links.',
		parameters: {
			type: 'OBJECT',
			properties: {
				source_note_id: { type: 'STRING' },
				source_title: { type: 'STRING' },
				target_titles: { type: 'ARRAY', items: { type: 'STRING' } },
			},
			required: ['target_titles'],
		},
	},
	{
		name: 'get_backlinks',
		description: 'List notes that link to the given note.',
		parameters: {
			type: 'OBJECT',
			properties: {
				note_id: { type: 'STRING' },
				title: { type: 'STRING' },
			},
		},
	},
	{
		name: 'archive_note',
		description: 'Archive a note (preferred over permanent deletion).',
		parameters: {
			type: 'OBJECT',
			properties: {
				note_id: { type: 'STRING' },
				title: { type: 'STRING' },
			},
		},
	},
	{
		name: 'delete_note',
		description:
			'Request permanent deletion of a knowledge note in the PersonalAI app. ALWAYS use this when the user asks to delete/remove a note — do not refuse. Shows a confirmation button in chat; note is not removed until the user confirms.',
		parameters: {
			type: 'OBJECT',
			properties: {
				note_id: { type: 'STRING', description: 'Note id if known.' },
				title: {
					type: 'STRING',
					description: 'Exact or @mentioned note title (e.g. meli-document-about-lyra).',
				},
			},
		},
	},
] as const

export async function executeKnowledgeToolCall(
	name: string,
	args: Record<string, unknown>,
): Promise<DocumentToolResult> {
	switch (name) {
		case 'search_knowledge': {
			const query = typeof args.query === 'string' ? args.query : ''
			const limit = typeof args.limit === 'number' ? args.limit : 20
			const notes = await searchDocuments(query, limit)
			return {
				name,
				response: {
					notes: notes.map((note) => ({
						id: note.id,
						title: note.title,
						tags: note.tags ?? [],
						updatedAt: note.updatedAt,
					})),
				},
			}
		}
		case 'list_notes': {
			const { listDocuments } = await import('@/services/documents/documentService')
			const notes = await listDocuments(
				typeof args.query === 'string' ? args.query : undefined,
			)
			const tag = typeof args.tag === 'string' ? args.tag : undefined
			const pinnedOnly = args.pinned_only === true
			const includeArchived = args.include_archived === true

			const filtered = notes.filter((note) => {
				if (!includeArchived && note.archived) return false
				if (pinnedOnly && !note.pinned) return false
				if (tag && !(note.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase())) {
					return false
				}
				return true
			})

			return {
				name,
				response: {
					notes: filtered.map((note) => ({
						id: note.id,
						title: note.title,
						pinned: note.pinned ?? false,
						archived: note.archived ?? false,
						tags: note.tags ?? [],
						updatedAt: note.updatedAt,
					})),
				},
			}
		}
		case 'read_note': {
			return executeDocumentToolCall('read_document', {
				document_id: args.note_id,
				title: args.title,
			})
		}
		case 'create_note': {
			const title = typeof args.title === 'string' ? args.title : 'Untitled note'
			const content =
				typeof args.content === 'string' ? normalizeMarkdownContent(args.content) : ''
			const tags = Array.isArray(args.tags)
				? args.tags.filter((tag): tag is string => typeof tag === 'string')
				: undefined

			const note = await createDocument(title, content, {
				source: 'assistant',
				contentFormat: 'markdown',
				readOnly: false,
				collectionId:
					typeof args.collection_id === 'string' ? args.collection_id : undefined,
				tags,
				lastEditedBy: 'assistant',
			})

			return {
				name,
				response: {
					id: note.id,
					title: note.title,
					createdAt: note.createdAt,
					updatedAt: note.updatedAt,
				},
			}
		}
		case 'update_note': {
			const note = await resolveDocumentRef({
				documentId:
					typeof args.note_id === 'string' ? args.note_id : undefined,
				title: typeof args.title === 'string' ? args.title : undefined,
			})

			if (!note) {
				return { name, response: { error: 'Note not found.' } }
			}

			const updated = await updateDocument(note.id, {
				title: typeof args.new_title === 'string' ? args.new_title : undefined,
				content:
					typeof args.content === 'string'
						? normalizeMarkdownContent(args.content)
						: undefined,
				tags: Array.isArray(args.tags)
					? args.tags.filter((tag): tag is string => typeof tag === 'string')
					: undefined,
				lastEditedBy: 'assistant',
				saveRevision: typeof args.content === 'string',
			})

			return {
				name,
				response: {
					id: updated.id,
					title: updated.title,
					updatedAt: updated.updatedAt,
				},
			}
		}
		case 'rename_note': {
			return executeDocumentToolCall('rename_document', {
				document_id: args.note_id,
				title: args.title,
				new_title: args.new_title,
			})
		}
		case 'move_note': {
			const note = await resolveDocumentRef({
				documentId:
					typeof args.note_id === 'string' ? args.note_id : undefined,
				title: typeof args.title === 'string' ? args.title : undefined,
			})

			if (!note) {
				return { name, response: { error: 'Note not found.' } }
			}

			const collectionId =
				typeof args.collection_id === 'string' ? args.collection_id : ''
			if (!collectionId) {
				return { name, response: { error: 'collection_id is required.' } }
			}

			const updated = await updateDocument(note.id, {
				collectionId,
				lastEditedBy: 'assistant',
			})

			return {
				name,
				response: {
					id: updated.id,
					title: updated.title,
					collectionId: updated.collectionId,
				},
			}
		}
		case 'add_tags': {
			const note = await resolveDocumentRef({
				documentId:
					typeof args.note_id === 'string' ? args.note_id : undefined,
				title: typeof args.title === 'string' ? args.title : undefined,
			})

			if (!note) {
				return { name, response: { error: 'Note not found.' } }
			}

			const tags = Array.isArray(args.tags)
				? args.tags.filter((tag): tag is string => typeof tag === 'string')
				: []

			const updated = await updateDocument(note.id, {
				tags,
				lastEditedBy: 'assistant',
			})

			return {
				name,
				response: { id: updated.id, tags: updated.tags ?? [] },
			}
		}
		case 'link_notes': {
			const note = await resolveDocumentRef({
				documentId:
					typeof args.source_note_id === 'string' ? args.source_note_id : undefined,
				title: typeof args.source_title === 'string' ? args.source_title : undefined,
			})

			if (!note) {
				return { name, response: { error: 'Source note not found.' } }
			}

			const targets = Array.isArray(args.target_titles)
				? args.target_titles.filter((t): t is string => typeof t === 'string')
				: []

			const links = targets.map((title) => `[[${title.trim()}]]`).join('\n')
			const content = `${note.content.trim()}\n\n${links}`.trim()

			const updated = await updateDocument(note.id, {
				content,
				lastEditedBy: 'assistant',
				saveRevision: true,
			})

			return {
				name,
				response: {
					id: updated.id,
					linked: targets,
				},
			}
		}
		case 'get_backlinks': {
			const note = await resolveDocumentRef({
				documentId:
					typeof args.note_id === 'string' ? args.note_id : undefined,
				title: typeof args.title === 'string' ? args.title : undefined,
			})

			if (!note) {
				return { name, response: { error: 'Note not found.' } }
			}

			const backlinks = await getDocumentBacklinks(note.id)
			return {
				name,
				response: {
					notes: backlinks.map((item) => ({
						id: item.id,
						title: item.title,
					})),
				},
			}
		}
		case 'archive_note': {
			const note = await resolveDocumentRef({
				documentId:
					typeof args.note_id === 'string' ? args.note_id : undefined,
				title: typeof args.title === 'string' ? args.title : undefined,
			})

			if (!note) {
				return { name, response: { error: 'Note not found.' } }
			}

			const archived = await archiveDocument(note.id)
			return {
				name,
				response: {
					id: archived.id,
					title: archived.title,
					archived: true,
				},
			}
		}
		case 'delete_note': {
			return executeDocumentToolCall('delete_document', {
				document_id: args.note_id,
				title: args.title,
			})
		}
		default:
			return executeDocumentToolCall(name, args)
	}
}

export async function readNoteForTool(noteId: string) {
	const note = await resolveDocumentRef({ documentId: noteId })
	if (!note) return null

	const rawContent =
		note.contentFormat === 'markdown'
			? note.content
			: htmlToPlainText(note.content)
	const truncated = truncateDocumentTextForTool(rawContent)

	return {
		id: note.id,
		title: note.title,
		content: truncated.text,
		truncated: truncated.truncated,
	}
}
