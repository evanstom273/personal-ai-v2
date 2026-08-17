import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const DEFAULT_DATA_DIR = join(homedir(), 'PersonalAI-Data')

export interface ServerConfig {
	port: number
	dataDir: string
	dbPath: string
	ollamaBaseUrl: string
	attachmentsDir: string
	documentsDir: string
	knowledgeDir: string
	backupsDir: string
}

function resolveDataDir(): string {
	const configured = process.env.PERSONALAI_DATA_DIR?.trim()
	return configured ? resolve(configured) : DEFAULT_DATA_DIR
}

export function loadConfig(): ServerConfig {
	const dataDir = resolveDataDir()
	const subdirs = ['attachments', 'documents', 'knowledge', 'backups']

	mkdirSync(dataDir, { recursive: true })
	for (const sub of subdirs) {
		mkdirSync(join(dataDir, sub), { recursive: true })
	}

	const port = Number.parseInt(process.env.PERSONALAI_PORT ?? '3847', 10)
	const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '')

	return {
		port: Number.isFinite(port) ? port : 3847,
		dataDir,
		dbPath: join(dataDir, 'personalai.db'),
		ollamaBaseUrl,
		attachmentsDir: join(dataDir, 'attachments'),
		documentsDir: join(dataDir, 'documents'),
		knowledgeDir: join(dataDir, 'knowledge'),
		backupsDir: join(dataDir, 'backups'),
	}
}
