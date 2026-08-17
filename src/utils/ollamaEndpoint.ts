export type OllamaEndpointKind =
	| 'vite-proxy'
	| 'direct'
	| 'tailscale-serve'
	| 'tailscale-ip'
	| 'https-remote'

export function normalizeOllamaHost(host: string): string {
	return host.trim().replace(/\/$/, '')
}

export function buildOllamaApiUrl(host: string, path: string): string {
	const base = normalizeOllamaHost(host)
	const apiPath = path.startsWith('/') ? path : `/${path}`
	return base ? `${base}${apiPath}` : apiPath
}

export function classifyOllamaHost(host: string): OllamaEndpointKind {
	const trimmed = normalizeOllamaHost(host)
	if (!trimmed) return 'vite-proxy'

	try {
		const url = new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`)
		if (url.hostname.endsWith('.ts.net')) return 'tailscale-serve'
		if (url.hostname.startsWith('100.')) return 'tailscale-ip'
		if (url.protocol === 'https:') return 'https-remote'
		return 'direct'
	} catch {
		return 'direct'
	}
}

export function isTailscaleServeUrl(host: string): boolean {
	return classifyOllamaHost(host) === 'tailscale-serve'
}

export function buildTailscaleServeUrl(machine: string, tailnet: string): string {
	const machineName = machine.trim().toLowerCase()
	const tailnetName = tailnet
		.trim()
		.toLowerCase()
		.replace(/\.ts\.net$/, '')

	if (!machineName || !tailnetName) {
		throw new Error('Machine name and tailnet are required')
	}

	return `https://${machineName}.${tailnetName}.ts.net`
}

export function parseTailscaleServeUrl(host: string): { machine: string; tailnet: string } | null {
	const trimmed = normalizeOllamaHost(host)
	if (!trimmed) return null

	try {
		const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
		if (!url.hostname.endsWith('.ts.net')) return null

		const parts = url.hostname.replace(/\.ts\.net$/, '').split('.')
		if (parts.length < 2) return null

		const machine = parts[0]
		const tailnet = parts.slice(1).join('.')
		return { machine, tailnet }
	} catch {
		return null
	}
}

export function getEndpointLabel(kind: OllamaEndpointKind): string {
	switch (kind) {
		case 'vite-proxy':
			return 'Local dev proxy'
		case 'tailscale-serve':
			return 'Tailscale Serve'
		case 'tailscale-ip':
			return 'Tailscale IP'
		case 'https-remote':
			return 'HTTPS remote'
		case 'direct':
			return 'Direct HTTP'
	}
}

export function getConnectionHint(kind: OllamaEndpointKind, isHttpsApp: boolean): string | undefined {
	if (isHttpsApp && kind === 'tailscale-ip') {
		return 'Browsers block HTTP Tailscale IPs from HTTPS pages. Use Tailscale Serve (https://machine.tailnet.ts.net).'
	}

	if (kind === 'vite-proxy' && isHttpsApp) {
		return 'Empty host only works with the local Vite dev server. Set a remote Ollama URL for Vercel or other hosted deployments.'
	}

	if (kind === 'tailscale-serve') {
		return 'On your PC: tailscale serve --bg --https=443 http://127.0.0.1:11434 and set OLLAMA_ORIGINS to this app URL.'
	}

	return undefined
}
