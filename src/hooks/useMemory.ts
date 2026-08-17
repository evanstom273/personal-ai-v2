import { useCallback, useEffect, useState } from 'react'
import {
	listMemoryEntries,
	subscribeMemoryChanged,
} from '@/services/memory/memoryService'
import type { MemoryEntry } from '@/storage/types'

export function useMemory() {
	const [entries, setEntries] = useState<MemoryEntry[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const refreshMemory = useCallback(async () => {
		const next = await listMemoryEntries()
		setEntries(next)
		setIsLoading(false)
		return next
	}, [])

	useEffect(() => {
		void refreshMemory()
		return subscribeMemoryChanged(() => {
			void refreshMemory()
		})
	}, [refreshMemory])

	return {
		entries,
		isLoading,
		refreshMemory,
	}
}
