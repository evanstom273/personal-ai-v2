export type MessageRole = 'user' | 'assistant' | 'system'
export type StreamStatus = 'streaming' | 'complete' | 'error'
export type AttachmentKind = 'image' | 'text'

export interface ConversationRow {
	id: string
	title: string
	model: string
	system_prompt: string | null
	created_at: number
	updated_at: number
}

export interface MessageRow {
	id: string
	conversation_id: string
	role: MessageRole
	content: string
	thinking_content: string | null
	model: string | null
	tokens_per_sec: number | null
	duration_ms: number | null
	is_error: number
	stream_status: StreamStatus
	created_at: number
	updated_at: number
}

export interface AttachmentRow {
	id: string
	message_id: string
	filename: string
	mime_type: string
	storage_path: string | null
	size_bytes: number
	kind: AttachmentKind
	content_text: string | null
	created_at: number
}

export interface CreateConversationInput {
	id: string
	title: string
	model: string
	systemPrompt?: string
	createdAt: number
	updatedAt: number
}

export interface UpdateConversationInput {
	title?: string
	model?: string
	systemPrompt?: string
	updatedAt: number
}

export interface CreateMessageInput {
	id: string
	conversationId: string
	role: MessageRole
	content: string
	thinkingContent?: string
	model?: string
	tokensPerSec?: number
	durationMs?: number
	isError?: boolean
	streamStatus?: StreamStatus
	createdAt: number
	updatedAt: number
}

export interface UpdateMessageInput {
	content?: string
	thinkingContent?: string
	model?: string
	tokensPerSec?: number
	durationMs?: number
	isError?: boolean
	streamStatus?: StreamStatus
	updatedAt: number
}

export interface CreateAttachmentInput {
	id: string
	messageId: string
	filename: string
	mimeType: string
	storagePath?: string
	sizeBytes: number
	kind: AttachmentKind
	contentText?: string
	createdAt: number
}
