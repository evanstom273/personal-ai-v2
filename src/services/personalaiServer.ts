import { loadCachedPersonalaiHost } from '@/services/personalaiApi'

export const SERVER_OFFLINE_MESSAGE =
	'PersonalAI server is offline or not configured. Check Settings → Local connection.'

export function isPersonalAiServerConfigured(): boolean {
	return Boolean(loadCachedPersonalaiHost().trim())
}

export function requirePersonalAiServer(): void {
	if (!isPersonalAiServerConfigured()) {
		throw new Error(SERVER_OFFLINE_MESSAGE)
	}
}

export const MIGRATION_FLAGS = {
	knowledge: 'knowledge_idb_migrated_v1',
	projects: 'projects_idb_migrated_v1',
	memories: 'memories_idb_migrated_v1',
	reminders: 'reminders_idb_migrated_v1',
} as const

export function isMigrationComplete(flag: string): boolean {
	return localStorage.getItem(flag) === '1'
}

export function markMigrationComplete(flag: string): void {
	localStorage.setItem(flag, '1')
}
