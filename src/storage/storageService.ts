import { getDb } from './db'
import type { StoreName } from './types'

export async function getValue<T>(
	storeName: StoreName,
	key: string,
): Promise<T | undefined> {
	const db = await getDb()
	return db.get(storeName, key) as Promise<T | undefined>
}

export async function setValue<T>(
	storeName: StoreName,
	key: string,
	value: T,
): Promise<void> {
	const db = await getDb()
	await db.put(storeName, value, key)
}

export async function deleteValue(
	storeName: StoreName,
	key: string,
): Promise<void> {
	const db = await getDb()
	await db.delete(storeName, key)
}

export async function getAllValues<T>(
	storeName: StoreName,
): Promise<T[]> {
	const db = await getDb()
	const keys = await db.getAllKeys(storeName)
	const values = await Promise.all(
		keys.map((key) => db.get(storeName, key) as Promise<T>),
	)
	return values
}
