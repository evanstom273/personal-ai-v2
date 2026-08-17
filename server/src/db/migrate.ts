import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PersonalAiDatabase } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function runMigrations(db: PersonalAiDatabase): void {
	db.exec('PRAGMA foreign_keys = ON')

	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			applied_at INTEGER NOT NULL
		)
	`)

	const applied = new Set(
		(db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as { version: number }[])
			.map((row) => row.version)
	)

	const migrationsDir = join(__dirname, 'migrations')
	const files = readdirSync(migrationsDir)
		.filter((f) => f.endsWith('.sql'))
		.sort()

	for (const file of files) {
		const version = Number.parseInt(file.split('_')[0], 10)
		if (!Number.isFinite(version) || applied.has(version)) continue

		const sql = readFileSync(join(migrationsDir, file), 'utf-8')
		db.exec(sql)
		db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
			version,
			Date.now()
		)
	}
}
