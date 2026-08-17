import type { ChatMessage, ChatSession, ChatSettings, FileAttachment } from '../types/serverChat'
import {
	buildPersonalaiApiUrl,
	buildPersonalaiHealthUrl,
	normalizePersonalaiHost,
} from '../utils/personalaiEndpoint'

export interface ServerHealthResult {
	ok: boolean
	service?: string
	version?: string
	ollama?: boolean
	error?: string
	latencyMs?: number
}

export interface PersonalaiConnectionTestResult {
	ok: boolean
	latencyMs: number
	ollama?: boolean
	error?: string
	endpointUrl: string
}

async function parseError(res: Response): Promise<string> {
	const text = await res.text().catch(() => '')
	try {
		const json = JSON.parse(text) as { error?: string }
		if (json.error) return json.error
	} catch {
		// not json
	}
	return text || `HTTP ${res.status}`
}

export async function checkServerHealth(host: string): Promise<ServerHealthResult> {
	const url = buildPersonalaiHealthUrl(host)
	const start = performance.now()

	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
		const latencyMs = Math.round(performance.now() - start)

		if (!res.ok) {
			return { ok: false, error: await parseError(res), latencyMs }
		}

		const data = (await res.json()) as ServerHealthResult
		return { ...data, ok: true, latencyMs }
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : String(err),
			latencyMs: Math.round(performance.now() - start),
		}
	}
}

export async function testPersonalaiConnection(host: string): Promise<PersonalaiConnectionTestResult> {
	const endpointUrl = buildPersonalaiHealthUrl(host)
	const result = await checkServerHealth(host)

	return {
		ok: result.ok,
		latencyMs: result.latencyMs ?? 0,
		ollama: result.ollama,
		error: result.error,
		endpointUrl,
	}
}

export async function fetchSessions(host: string): Promise<ChatSession[]> {
	const url = buildPersonalaiApiUrl(host, '/sessions')
	const res = await fetch(url)
	if (!res.ok) throw new Error(await parseError(res))

	const data = (await res.json()) as { sessions: ChatSession[] }
	return data.sessions ?? []
}

export async function createSession(
	host: string,
	input: { id?: string; title: string; model: string; systemPrompt?: string }
): Promise<ChatSession> {
	const url = buildPersonalaiApiUrl(host, '/sessions')
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	if (!res.ok) throw new Error(await parseError(res))

	const data = (await res.json()) as { session: ChatSession }
	return data.session
}

export async function updateSession(
	host: string,
	id: string,
	input: Partial<Pick<ChatSession, 'title' | 'model' | 'systemPrompt'>>
): Promise<ChatSession> {
	const url = buildPersonalaiApiUrl(host, `/sessions/${id}`)
	const res = await fetch(url, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	if (!res.ok) throw new Error(await parseError(res))

	const data = (await res.json()) as { session: ChatSession }
	return { ...data.session, messages: [] }
}

export async function deleteSession(host: string, id: string): Promise<void> {
	const url = buildPersonalaiApiUrl(host, `/sessions/${id}`)
	const res = await fetch(url, { method: 'DELETE' })
	if (!res.ok) throw new Error(await parseError(res))
}

export async function clearSessionMessages(host: string, sessionId: string): Promise<void> {
	const url = buildPersonalaiApiUrl(host, `/sessions/${sessionId}/messages`)
	const res = await fetch(url, { method: 'DELETE' })
	if (!res.ok) throw new Error(await parseError(res))
}

export async function createMessage(
	host: string,
	sessionId: string,
	message: {
		id?: string
		role: ChatMessage['role']
		content?: string
		thinkingContent?: string
		model?: string
		tokensPerSec?: number
		durationMs?: number
		isError?: boolean
		streamStatus?: 'streaming' | 'complete' | 'error'
		fileAttachments?: FileAttachment[]
	}
): Promise<ChatMessage> {
	const url = buildPersonalaiApiUrl(host, `/sessions/${sessionId}/messages`)
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			id: message.id,
			role: message.role,
			content: message.content,
			thinkingContent: message.thinkingContent,
			model: message.model,
			tokensPerSec: message.tokensPerSec,
			durationMs: message.durationMs,
			isError: message.isError,
			streamStatus: message.streamStatus,
			fileAttachments: message.fileAttachments,
		}),
	})
	if (!res.ok) throw new Error(await parseError(res))

	const data = (await res.json()) as { message: ChatMessage }
	return data.message
}

export async function updateMessage(
	host: string,
	messageId: string,
	input: Partial<{
		content: string
		thinkingContent: string
		model: string
		tokensPerSec: number
		durationMs: number
		isError: boolean
		streamStatus: 'streaming' | 'complete' | 'error'
	}>
): Promise<ChatMessage> {
	const url = buildPersonalaiApiUrl(host, `/messages/${messageId}`)
	const res = await fetch(url, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	})
	if (!res.ok) throw new Error(await parseError(res))

	const data = (await res.json()) as { message: ChatMessage }
	return data.message
}

export async function deleteMessage(host: string, messageId: string): Promise<void> {
	const url = buildPersonalaiApiUrl(host, `/messages/${messageId}`)
	const res = await fetch(url, { method: 'DELETE' })
	if (!res.ok) throw new Error(await parseError(res))
}

export async function fetchServerSettings(host: string): Promise<Partial<ChatSettings>> {
	const url = buildPersonalaiApiUrl(host, '/settings')
	const res = await fetch(url)
	if (!res.ok) throw new Error(await parseError(res))

	const data = (await res.json()) as { settings: Partial<ChatSettings> }
	return data.settings ?? {}
}

export async function saveServerSettings(
	host: string,
	settings: Partial<ChatSettings>
): Promise<void> {
	const url = buildPersonalaiApiUrl(host, '/settings')
	const res = await fetch(url, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ settings }),
	})
	if (!res.ok) throw new Error(await parseError(res))
}

export function cachePersonalaiHost(host: string): void {
	const normalized = normalizePersonalaiHost(host)
	if (normalized) {
		localStorage.setItem('personal_ai_personalai_host_cache', normalized)
	}
}

export function loadCachedPersonalaiHost(): string {
	return localStorage.getItem('personal_ai_personalai_host_cache') ?? ''
}
