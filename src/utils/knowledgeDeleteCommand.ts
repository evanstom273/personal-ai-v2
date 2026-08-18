import { executeDocumentToolCall } from '@/services/gemini/documentTools'
import {
	findDocumentByTitle,
	listDocuments,
	resolveDocumentRef,
} from '@/services/documents/documentService'
import type { DocumentRecord, PendingDeleteConfirmation } from '@/storage/types'

const DELETE_INTENT_PATTERN = /\b(delete|remove|erase|trash)\b/i

export interface KnowledgeDeleteCommandResult {
	message: string
	pendingDeleteConfirmation?: PendingDeleteConfirmation
}

function extractAtMentionTitles(text: string): string[] {
	const titles: string[] = []
	for (const match of text.matchAll(/@([^\s@!?.]+)/g)) {
		const title = match[1]?.trim()
		if (title) titles.push(title)
	}
	return titles
}

function extractTitleAfterDeleteKeyword(text: string): string | undefined {
	const match = text.match(
		/\b(?:delete|remove|erase|trash)\s+["']?([^"'\n!?.]+?)["']?(?:\s*[!?.]*)$/i,
	)
	return match?.[1]?.trim()
}

async function resolveNoteForDelete(ref: string): Promise<DocumentRecord | undefined> {
	const trimmed = ref.trim()
	if (!trimmed) return undefined

	const byRef = await resolveDocumentRef({ title: trimmed })
	if (byRef) return byRef

	const byTitle = await findDocumentByTitle(trimmed)
	if (byTitle) return byTitle

	const normalized = trimmed.toLowerCase()
	const documents = await listDocuments()

	return (
		documents.find((doc) => doc.title.toLowerCase() === normalized) ??
		documents.find((doc) => doc.title.toLowerCase().includes(normalized)) ??
		documents.find((doc) => normalized.includes(doc.title.toLowerCase()))
	)
}

/**
 * When the user clearly asks to delete a @mentioned knowledge note, handle it in
 * the app instead of relying on the local model to call delete_note (often refuses).
 */
export async function tryPrepareKnowledgeDeleteFromUserMessage(
	text: string,
): Promise<KnowledgeDeleteCommandResult | null> {
	const trimmed = text.trim()
	if (!trimmed || !DELETE_INTENT_PATTERN.test(trimmed)) {
		return null
	}

	const mentionTitles = extractAtMentionTitles(trimmed)
	const titleRef = mentionTitles[0] ?? extractTitleAfterDeleteKeyword(trimmed)

	if (!titleRef) {
		return null
	}

	const document = await resolveNoteForDelete(titleRef)
	if (!document) {
		return {
			message: `I couldn't find a knowledge note matching "${titleRef}". Open Library → Knowledge and use ⋯ → Delete on the note, or check the exact title.`,
		}
	}

	const toolResult = await executeDocumentToolCall('delete_document', {
		document_id: document.id,
		title: document.title,
	})

	if (toolResult.pendingDeleteConfirmation) {
		return {
			message: `To permanently delete "${toolResult.pendingDeleteConfirmation.documentTitle}", confirm below. Nothing has been deleted yet.`,
			pendingDeleteConfirmation: toolResult.pendingDeleteConfirmation,
		}
	}

	if (toolResult.response.error) {
		return {
			message: String(toolResult.response.error),
		}
	}

	return null
}
