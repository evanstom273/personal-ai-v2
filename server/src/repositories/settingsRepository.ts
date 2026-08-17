import type Database from 'better-sqlite3'

export function getAllSettings(db: Database.Database): Record<string, string> {
	const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[]
	const result: Record<string, string> = {}
	for (const row of rows) {
		result[row.key] = row.value
	}
	return result
}

export function getSetting(db: Database.Database, key: string): string | undefined {
	const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
		| { value: string }
		| undefined
	return row?.value
}

export function upsertSettings(db: Database.Database, settings: Record<string, unknown>): void {
	const now = Date.now()
	const stmt = db.prepare(
		`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
	)

	const tx = db.transaction((entries: [string, string][]) => {
		for (const [key, value] of entries) {
			stmt.run(key, value, now)
		}
	})

	const entries = Object.entries(settings).map(([key, value]) => [
		key,
		typeof value === 'string' ? value : JSON.stringify(value),
	]) as [string, string][]

	tx(entries)
}

export function deleteSetting(db: Database.Database, key: string): boolean {
	const result = db.prepare('DELETE FROM app_settings WHERE key = ?').run(key)
	return result.changes > 0
}
