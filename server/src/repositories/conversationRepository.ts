import type { PersonalAiDatabase } from '../db/types.js'
import type {
	ConversationRow,
	CreateConversationInput,
	UpdateConversationInput,
} from '../types.js'

export function listConversations(db: PersonalAiDatabase): ConversationRow[] {
	return db
		.prepare(
			`SELECT id, title, model, system_prompt, created_at, updated_at
			 FROM conversations
			 ORDER BY updated_at DESC`
		)
		.all() as ConversationRow[]
}

export function getConversation(db: PersonalAiDatabase, id: string): ConversationRow | undefined {
	return db
		.prepare(
			`SELECT id, title, model, system_prompt, created_at, updated_at
			 FROM conversations WHERE id = ?`
		)
		.get(id) as ConversationRow | undefined
}

export function createConversation(db: PersonalAiDatabase, input: CreateConversationInput): ConversationRow {
	db.prepare(
		`INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`
	).run(
		input.id,
		input.title,
		input.model,
		input.systemPrompt ?? null,
		input.createdAt,
		input.updatedAt
	)
	return getConversation(db, input.id)!
}

export function updateConversation(
	db: PersonalAiDatabase,
	id: string,
	input: UpdateConversationInput
): ConversationRow | undefined {
	const existing = getConversation(db, id)
	if (!existing) return undefined

	const title = input.title ?? existing.title
	const model = input.model ?? existing.model
	const systemPrompt = input.systemPrompt ?? existing.system_prompt

	db.prepare(
		`UPDATE conversations SET title = ?, model = ?, system_prompt = ?, updated_at = ? WHERE id = ?`
	).run(title, model, systemPrompt, input.updatedAt, id)

	return getConversation(db, id)
}

export function deleteConversation(db: PersonalAiDatabase, id: string): boolean {
	const result = db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
	return result.changes > 0
}

export function touchConversation(db: PersonalAiDatabase, id: string, updatedAt: number): void {
	db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(updatedAt, id)
}
