import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { Readable } from 'node:stream'
import type { ServerConfig } from '../config.js'

function nodeHttpRequest(url: string, init?: RequestInit): Promise<Response> {
	const parsed = new URL(url)
	const lib = parsed.protocol === 'https:' ? httpsRequest : httpRequest
	const method = init?.method ?? 'GET'
	const headers = init?.headers as Record<string, string> | undefined
	const body = init?.body

	return new Promise((resolve, reject) => {
		const req = lib(
			parsed,
			{
				method,
				headers,
				timeout: 120000,
			},
			(res) => {
				resolve(
					new Response(Readable.toWeb(res) as ReadableStream, {
						status: res.statusCode ?? 502,
						headers: res.headers as HeadersInit,
					})
				)
			}
		)

		req.on('error', reject)
		req.on('timeout', () => {
			req.destroy()
			reject(new Error('Ollama request timed out'))
		})

		if (body) {
			req.write(body)
		}
		req.end()
	})
}

export async function checkOllamaHealth(ollamaBaseUrl: string): Promise<{ ok: boolean; error?: string }> {
	const url = `${ollamaBaseUrl.replace(/\/$/, '')}/api/tags`

	try {
		const res = await nodeHttpRequest(url)
		if (res.ok) return { ok: true }
		const text = await res.text().catch(() => '')
		return { ok: false, error: `HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}` }
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return { ok: false, error: message }
	}
}

export async function proxyOllamaRequest(
	config: ServerConfig,
	path: string,
	init?: RequestInit
): Promise<Response> {
	const url = `${config.ollamaBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
	return nodeHttpRequest(url, init)
}
