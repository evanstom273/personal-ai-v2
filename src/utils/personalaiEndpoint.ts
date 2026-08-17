export function normalizePersonalaiHost(host: string): string {
	return host.trim().replace(/\/$/, '')
}

export function buildPersonalaiApiUrl(host: string, path: string): string {
	const base = normalizePersonalaiHost(host)
	const apiPath = path.startsWith('/') ? path : `/${path}`
	if (!base) {
		return `/api/personalai${apiPath}`
	}
	return `${base}/api/personalai${apiPath}`
}

export function buildPersonalaiHealthUrl(host: string): string {
	const base = normalizePersonalaiHost(host)
	if (!base) return '/health'
	return `${base}/health`
}

export function getEffectiveOllamaHost(ollamaHost: string, personalaiHost: string): string {
	return normalizePersonalaiHost(ollamaHost) || normalizePersonalaiHost(personalaiHost)
}
