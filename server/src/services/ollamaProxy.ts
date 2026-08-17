import type { ServerConfig } from '../config.js'

export async function checkOllamaHealth(ollamaBaseUrl: string): Promise<boolean> {
	try {
		const res = await fetch(`${ollamaBaseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) })
		return res.ok
	} catch {
		return false
	}
}

export async function proxyOllamaRequest(
	config: ServerConfig,
	path: string,
	init?: RequestInit
): Promise<Response> {
	const url = `${config.ollamaBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
	return fetch(url, init)
}
