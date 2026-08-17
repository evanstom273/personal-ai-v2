import Database from 'better-sqlite3'
import type { ServerConfig } from '../config.js'
import { runMigrations } from './migrate.js'

let dbInstance: Database.Database | null = null

export function getDb(config: ServerConfig): Database.Database {
	if (!dbInstance) {
		dbInstance = new Database(config.dbPath)
		dbInstance.pragma('journal_mode = WAL')
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
