const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export class GeminiApiError extends Error {
	status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'GeminiApiError'
		this.status = status
	}
}

export async function geminiFetch<T>(
	apiKey: string,
	path: string,
	init?: RequestInit,
): Promise<T> {
	const separator = path.includes('?') ? '&' : '?'
	const url = `${GEMINI_API_BASE}${path}${separator}key=${encodeURIComponent(apiKey)}`

	const response = await fetch(url, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init?.headers,
		},
	})

	if (!response.ok) {
		let message = `Gemini API request failed (${response.status})`
		try {
			const body = (await response.json()) as {
				error?: { message?: string }
			}
			if (body.error?.message) {
				message = body.error.message
			}
		} catch {
			// ignore parse errors
		}
		throw new GeminiApiError(message, response.status)
	}

	return response.json() as Promise<T>
}

export function toDataUrl(mimeType: string, base64Data: string): string {
	return `data:${mimeType};base64,${base64Data}`
}
