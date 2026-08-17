import { useCallback, useEffect, useState } from 'react'
import {
	listLibraryMedia,
	subscribeLibraryMediaChanged,
} from '@/services/library/libraryMediaService'
import type { LibraryMediaKind, LibraryMediaRecord } from '@/storage/types'

export function useLibraryMedia(kind?: LibraryMediaKind) {
	const [items, setItems] = useState<LibraryMediaRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const refresh = useCallback(async () => {
		setIsLoading(true)
		try {
			setItems(await listLibraryMedia(kind))
		} finally {
			setIsLoading(false)
		}
	}, [kind])

	useEffect(() => {
		void refresh()
		return subscribeLibraryMediaChanged(() => {
			void refresh()
		})
	}, [refresh])

	return { items, isLoading, refresh }
}
