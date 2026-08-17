import type { PersonalAiDatabase } from '../db/types.js'
import type {
	AttachmentRow,
	CreateAttachmentInput,
	CreateMessageInput,
	MessageRow,
	UpdateMessageInput,
} from '../types.js'

export function listMessagesForConversation(db: PersonalAiDatabase, conversationId: string): MessageRow[] {
	return db
		.prepare(
			`SELECT id, conversation_id, role, content, thinking_content, model, tokens_per_sec,
			        duration_ms, is_error, stream_status, created_at, updated_at
			 FROM messages
			 WHERE conversation_id = ?
			 ORDER BY created_at ASC`
		)
		.all(conversationId) as MessageRow[]
}

export function getMessage(db: PersonalAiDatabase, id: string): MessageRow | undefined {
	return db
		.prepare(
			`SELECT id, conversation_id, role, content, thinking_content, model, tokens_per_sec,
			        duration_ms, is_error, stream_status, created_at, updated_at
			 FROM messages WHERE id = ?`
		)
		.get(id) as MessageRow | undefined
}

export function createMessage(db: PersonalAiDatabase, input: CreateMessageInput): MessageRow {
	db.prepare(
		`INSERT INTO messages (
			id, conversation_id, role, content, thinking_content, model,
			tokens_per_sec, duration_ms, is_error, stream_status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		input.id,
		input.conversationId,
		input.role,
		input.content,
		input.thinkingContent ?? null,
		input.model ?? null,
		input.tokensPerSec ?? null,
		input.durationMs ?? null,
		input.isError ? 1 : 0,
		input.streamStatus ?? 'complete',
		input.createdAt,
		input.updatedAt
	)
	return getMessage(db, input.id)!
}

export function updateMessage(
	db: PersonalAiDatabase,
	id: string,
	input: UpdateMessageInput
): MessageRow | undefined {
	const existing = getMessage(db, id)
	if (!existing) return undefined

	const content = input.content ?? existing.content
	const thinkingContent = input.thinkingContent ?? existing.thinking_content
	const model = input.model ?? existing.model
	const tokensPerSec = input.tokensPerSec ?? existing.tokens_per_sec
	const durationMs = input.durationMs ?? existing.duration_ms
	const isError = input.isError !== undefined ? (input.isError ? 1 : 0) : existing.is_error
	const streamStatus = input.streamStatus ?? existing.stream_status

	db.prepare(
		`UPDATE messages SET
			content = ?, thinking_content = ?, model = ?, tokens_per_sec = ?,
			duration_ms = ?, is_error = ?, stream_status = ?, updated_at = ?
		 WHERE id = ?`
	).run(
		content,
		thinkingContent,
		model,
		tokensPerSec,
		durationMs,
		isError,
		streamStatus,
		input.updatedAt,
		id
	)

	return getMessage(db, id)
}

export function deleteMessage(db: PersonalAiDatabase, id: string): boolean {
	const result = db.prepare('DELETE FROM messages WHERE id = ?').run(id)
	return result.changes > 0
}

export function deleteMessagesForConversation(db: PersonalAiDatabase, conversationId: string): number {
	const result = db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId)
	return result.changes
}

export function listAttachmentsForMessage(db: PersonalAiDatabase, messageId: string): AttachmentRow[] {
	return db
		.prepare(
			`SELECT id, message_id, filename, mime_type, storage_path, size_bytes, kind, content_text, created_at
			 FROM message_attachments WHERE message_id = ? ORDER BY created_at ASC`
		)
		.all(messageId) as AttachmentRow[]
}

export function createAttachment(db: PersonalAiDatabase, input: CreateAttachmentInput): AttachmentRow {
	db.prepare(
		`INSERT INTO message_attachments (
			id, message_id, filename, mime_type, storage_path, size_bytes, kind, content_text, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		input.id,
		input.messageId,
		input.filename,
		input.mimeType,
		input.storagePath ?? null,
		input.sizeBytes,
		input.kind,
		input.contentText ?? null,
		input.createdAt
	)
	return db
		.prepare(
			`SELECT id, message_id, filename, mime_type, storage_path, size_bytes, kind, content_text, created_at
			 FROM message_attachments WHERE id = ?`
		)
		.get(input.id) as AttachmentRow
}
