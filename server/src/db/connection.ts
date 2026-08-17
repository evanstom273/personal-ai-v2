import { DatabaseSync } from 'node:sqlite'
import type { ServerConfig } from '../config.js'
import { runMigrations } from './migrate.js'
import type { PersonalAiDatabase } from './types.js'

let dbInstance: PersonalAiDatabase | null = null

export function getDb(config: ServerConfig): PersonalAiDatabase {
	if (!dbInstance) {
		dbInstance = new DatabaseSync(config.dbPath)
		dbInstance.exec('PRAGMA foreign_keys = ON')
		dbInstance.exec('PRAGMA journal_mode = WAL')
		runMigrations(dbInstance)
	}
	return dbInstance
}

export function closeDb(): void {
	if (dbInstance) {
		dbInstance.close()
		dbInstance = null
	}
}
