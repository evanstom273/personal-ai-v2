import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { loadConfig } from './config.js'
import { getDb } from './db/connection.js'
import { createPersonalAiRoutes } from './routes/personalai.js'
import { checkOllamaHealth, proxyOllamaRequest } from './services/ollamaProxy.js'

const config = loadConfig()
const app = new Hono()

app.use(
	'*',
	cors({
		origin: (origin) => origin || '*',
		allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type'],
	})
)

app.get('/health', async (c) => {
	const ollama = await checkOllamaHealth(config.ollamaBaseUrl)
	return c.json({
		ok: true,
		service: 'personalai',
		version: '0.1.0',
		dataDir: config.dataDir,
		ollama: ollama.ok,
		ollamaError: ollama.error,
		ollamaUrl: config.ollamaBaseUrl,
	})
})

const personalAi = createPersonalAiRoutes(config)
app.route('/api/personalai', personalAi)

app.get('/api/tags', async (c) => {
	try {
		const res = await proxyOllamaRequest(config, '/api/tags')
		const body = await res.text()
		return new Response(body, {
			status: res.status,
			headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
		})
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return c.json({ error: `Ollama proxy error: ${message}` }, 502)
	}
})

app.post('/api/chat', async (c) => {
	try {
		const body = await c.req.text()
		const res = await proxyOllamaRequest(config, '/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
		})

		const headers = new Headers()
		const contentType = res.headers.get('Content-Type')
		if (contentType) headers.set('Content-Type', contentType)

		return new Response(res.body, {
			status: res.status,
			headers,
		})
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		return c.json({ error: `Ollama proxy error: ${message}` }, 502)
	}
})

getDb(config)

console.log(`PersonalAI server starting on port ${config.port}`)
console.log(`Data directory: ${config.dataDir}`)
console.log(`Ollama proxy target: ${config.ollamaBaseUrl}`)

serve({
	fetch: app.fetch,
	port: config.port,
})
