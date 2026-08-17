import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { StoreName } from './types'

interface GeminiChatDB extends DBSchema {
	preferences: {
		key: string
		value: unknown
	}
	conversations: {
		key: string
		value: unknown
	}
	cache: {
		key: string
		value: unknown
	}
	documents: {
		key: string
		value: unknown
	}
	libraryMedia: {
		key: string
		value: unknown
	}
	memories: {
		key: string
		value: unknown
	}
	reminders: {
		key: string
		value: unknown
	}
	projects: {
		key: string
		value: unknown
	}
}

const DB_NAME = 'gemini-chat'
const DB_VERSION = 6

let dbPromise: Promise<IDBPDatabase<GeminiChatDB>> | null = null

export function getDb(): Promise<IDBPDatabase<GeminiChatDB>> {
	if (!dbPromise) {
		dbPromise = openDB<GeminiChatDB>(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				const stores: StoreName[] = [
					'preferences',
					'conversations',
					'cache',
					'documents',
					'libraryMedia',
					'memories',
					'reminders',
					'projects',
				]
				for (const store of stores) {
					if (!db.objectStoreNames.contains(store)) {
						db.createObjectStore(store)
					}
				}

				if (oldVersion < 2) {
					// documents store added in v2
				}

				if (oldVersion < 3) {
					// libraryMedia store added in v3
				}

				if (oldVersion < 4) {
					// memories store added in v4
				}

				if (oldVersion < 5) {
					// reminders store added in v5
				}

				if (oldVersion < 6) {
					// projects store added in v6
				}
			},
		})
	}

	return dbPromise
}
