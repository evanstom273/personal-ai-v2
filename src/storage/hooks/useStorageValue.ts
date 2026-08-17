import { useCallback, useEffect, useState } from 'react'
import { getValue, setValue } from '@/storage/storageService'
import type { StoreName } from '@/storage/types'

export function useStorageValue<T>(
	storeName: StoreName,
	key: string,
	defaultValue: T,
): {
	value: T
	setValue: (next: T | ((current: T) => T)) => Promise<void>
	isLoading: boolean
	error: Error | null
} {
	const [value, setLocalValue] = useState<T>(defaultValue)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	useEffect(() => {
		let cancelled = false

		async function load(): Promise<void> {
			try {
				const stored = await getValue<T>(storeName, key)
				if (!cancelled) {
					setLocalValue(stored ?? defaultValue)
					setError(null)
				}
			} catch (loadError) {
				if (!cancelled) {
					setError(
						loadError instanceof Error
							? loadError
							: new Error('Failed to load storage value'),
					)
				}
			} finally {
				if (!cancelled) {
					setIsLoading(false)
				}
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [storeName, key, defaultValue])

	const persist = useCallback(
		async (next: T | ((current: T) => T)): Promise<void> => {
			try {
				const resolved =
					typeof next === 'function'
						? (next as (current: T) => T)(value)
						: next
				setLocalValue(resolved)
				await setValue(storeName, key, resolved)
				setError(null)
			} catch (persistError) {
				setError(
					persistError instanceof Error
						? persistError
						: new Error('Failed to save storage value'),
				)
				throw persistError
			}
		},
		[storeName, key, value],
	)

	return {
		value,
		setValue: persist,
		isLoading,
		error,
	}
}
