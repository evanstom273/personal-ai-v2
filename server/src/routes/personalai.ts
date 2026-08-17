import { Hono } from 'hono'
import type { ServerConfig } from '../config.js'
import { getDb } from '../db/connection.js'
import * as conversationRepo from '../repositories/conversationRepository.js'
import * as messageRepo from '../repositories/messageRepository.js'
import * as settingsRepo from '../repositories/settingsRepository.js'
import type { AttachmentRow, MessageRow } from '../types.js'

function mapAttachment(row: AttachmentRow) {
	return {
		name: row.filename,
		size: row.size_bytes,
		content: row.content_text ?? '',
		type: row.mime_type,
		kind: row.kind,
	}
}

function mapMessage(db: ReturnType<typeof getDb>, row: MessageRow) {
	const attachments = messageRepo.listAttachmentsForMessage(db, row.id)
	return {
		id: row.id,
		role: row.role,
		content: row.content,
		thinkingContent: row.thinking_content ?? undefined,
		timestamp: row.created_at,
		model: row.model ?? undefined,
		tokensPerSec: row.tokens_per_sec ?? undefined,
		durationMs: row.duration_ms ?? undefined,
		isError: row.is_error === 1,
		streamStatus: row.stream_status,
		fileAttachments: attachments.length > 0 ? attachments.map(mapAttachment) : undefined,
	}
}

export function createPersonalAiRoutes(config: ServerConfig): Hono {
	const app = new Hono()

	app.get('/health', (c) => {
		return c.json({ ok: true, service: 'personalai', version: '0.1.0' })
	})

	app.get('/sessions', (c) => {
		const db = getDb(config)
		const conversations = conversationRepo.listConversations(db)
		return c.json({
			sessions: conversations.map((conv) => {
				const messages = messageRepo.listMessagesForConversation(db, conv.id)
				return {
					id: conv.id,
					title: conv.title,
					createdAt: conv.created_at,
					updatedAt: conv.updated_at,
					model: conv.model,
					systemPrompt: conv.system_prompt ?? undefined,
					messages: messages.map((m) => mapMessage(db, m)),
				}
			}),
		})
	})

	app.get('/sessions/:id', (c) => {
		const db = getDb(config)
		const id = c.req.param('id')
		const conv = conversationRepo.getConversation(db, id)
		if (!conv) return c.json({ error: 'Session not found' }, 404)

		const messages = messageRepo.listMessagesForConversation(db, id)
		return c.json({
			session: {
				id: conv.id,
				title: conv.title,
				createdAt: conv.created_at,
				updatedAt: conv.updated_at,
				model: conv.model,
				systemPrompt: conv.system_prompt ?? undefined,
				messages: messages.map((m) => mapMessage(db, m)),
			},
		})
	})

	app.post('/sessions', async (c) => {
		const db = getDb(config)
		const body = await c.req.json<{
			id?: string
			title?: string
			model?: string
			systemPrompt?: string
		}>()

		if (!body.model?.trim()) {
			return c.json({ error: 'model is required' }, 400)
		}

		const now = Date.now()
		const id = body.id ?? `session_${now}_${Math.random().toString(36).slice(2, 7)}`
		const title = body.title?.trim() || 'New Chat'

		const conv = conversationRepo.createConversation(db, {
			id,
			title,
			model: body.model.trim(),
			systemPrompt: body.systemPrompt,
			createdAt: now,
			updatedAt: now,
		})

		return c.json({
			session: {
				id: conv.id,
				title: conv.title,
				createdAt: conv.created_at,
				updatedAt: conv.updated_at,
				model: conv.model,
				systemPrompt: conv.system_prompt ?? undefined,
				messages: [],
			},
		})
	})

	app.patch('/sessions/:id', async (c) => {
		const db = getDb(config)
		const id = c.req.param('id')
		const body = await c.req.json<{
			title?: string
			model?: string
			systemPrompt?: string
		}>()

		const updated = conversationRepo.updateConversation(db, id, {
			title: body.title,
			model: body.model,
			systemPrompt: body.systemPrompt,
			updatedAt: Date.now(),
		})

		if (!updated) return c.json({ error: 'Session not found' }, 404)

		return c.json({
			session: {
				id: updated.id,
				title: updated.title,
				createdAt: updated.created_at,
				updatedAt: updated.updated_at,
				model: updated.model,
				systemPrompt: updated.system_prompt ?? undefined,
			},
		})
	})

	app.delete('/sessions/:id', (c) => {
		const db = getDb(config)
		const id = c.req.param('id')
		const deleted = conversationRepo.deleteConversation(db, id)
		if (!deleted) return c.json({ error: 'Session not found' }, 404)
		return c.json({ ok: true })
	})

	app.post('/sessions/:id/messages', async (c) => {
		const db = getDb(config)
		const conversationId = c.req.param('id')
		const conv = conversationRepo.getConversation(db, conversationId)
		if (!conv) return c.json({ error: 'Session not found' }, 404)

		const body = await c.req.json<{
			id?: string
			role: string
			content?: string
			thinkingContent?: string
			model?: string
			tokensPerSec?: number
			durationMs?: number
			isError?: boolean
			streamStatus?: string
			fileAttachments?: Array<{
				name: string
				size: number
				content: string
				type: string
				kind: 'image' | 'text'
			}>
		}>()

		if (!body.role || !['user', 'assistant', 'system'].includes(body.role)) {
			return c.json({ error: 'Invalid role' }, 400)
		}

		const now = Date.now()
		const id = body.id ?? `msg_${body.role}_${now}_${Math.random().toString(36).slice(2, 7)}`

		const message = messageRepo.createMessage(db, {
			id,
			conversationId,
			role: body.role as 'user' | 'assistant' | 'system',
			content: body.content ?? '',
			thinkingContent: body.thinkingContent,
			model: body.model,
			tokensPerSec: body.tokensPerSec,
			durationMs: body.durationMs,
			isError: body.isError,
			streamStatus: (body.streamStatus as 'streaming' | 'complete' | 'error') ?? 'complete',
			createdAt: now,
			updatedAt: now,
		})

		if (body.fileAttachments?.length) {
			for (const file of body.fileAttachments) {
				messageRepo.createAttachment(db, {
					id: `att_${now}_${Math.random().toString(36).slice(2, 7)}`,
					messageId: id,
					filename: file.name,
					mimeType: file.type,
					sizeBytes: file.size,
					kind: file.kind,
					contentText: file.content,
					createdAt: now,
				})
			}
		}

		conversationRepo.touchConversation(db, conversationId, now)

		return c.json({ message: mapMessage(db, message) })
	})

	app.patch('/messages/:id', async (c) => {
		const db = getDb(config)
		const id = c.req.param('id')
		const existing = messageRepo.getMessage(db, id)
		if (!existing) return c.json({ error: 'Message not found' }, 404)

		const body = await c.req.json<{
			content?: string
			thinkingContent?: string
			model?: string
			tokensPerSec?: number
			durationMs?: number
			isError?: boolean
			streamStatus?: string
		}>()

		const now = Date.now()
		const updated = messageRepo.updateMessage(db, id, {
			content: body.content,
			thinkingContent: body.thinkingContent,
			model: body.model,
			tokensPerSec: body.tokensPerSec,
			durationMs: body.durationMs,
			isError: body.isError,
			streamStatus: body.streamStatus as 'streaming' | 'complete' | 'error' | undefined,
			updatedAt: now,
		})

		conversationRepo.touchConversation(db, existing.conversation_id, now)

		return c.json({ message: mapMessage(db, updated!) })
	})

	app.delete('/messages/:id', (c) => {
		const db = getDb(config)
		const id = c.req.param('id')
		const existing = messageRepo.getMessage(db, id)
		if (!existing) return c.json({ error: 'Message not found' }, 404)

		messageRepo.deleteMessage(db, id)
		conversationRepo.touchConversation(db, existing.conversation_id, Date.now())
		return c.json({ ok: true })
	})

	app.delete('/sessions/:id/messages', (c) => {
		const db = getDb(config)
		const conversationId = c.req.param('id')
		const conv = conversationRepo.getConversation(db, conversationId)
		if (!conv) return c.json({ error: 'Session not found' }, 404)

		messageRepo.deleteMessagesForConversation(db, conversationId)
		conversationRepo.touchConversation(db, conversationId, Date.now())
		return c.json({ ok: true })
	})

	app.get('/settings', (c) => {
		const db = getDb(config)
		const raw = settingsRepo.getAllSettings(db)
		const settings: Record<string, unknown> = {}

		for (const [key, value] of Object.entries(raw)) {
			try {
				settings[key] = JSON.parse(value)
			} catch {
				settings[key] = value
			}
		}

		return c.json({ settings })
	})

	app.put('/settings', async (c) => {
		const db = getDb(config)
		const body = await c.req.json<{ settings?: Record<string, unknown> }>()
		if (!body.settings || typeof body.settings !== 'object') {
			return c.json({ error: 'settings object is required' }, 400)
		}

		settingsRepo.upsertSettings(db, body.settings)
		return c.json({ ok: true })
	})

	return app
}
