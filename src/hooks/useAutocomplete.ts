import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
	AutocompleteCreateOption,
	AutocompleteItem,
	AutocompleteProvider,
	AutocompleteTriggerMatch,
} from '@/autocomplete/types'
import { getActiveTriggerMatch } from '@/autocomplete/triggers'

interface UseAutocompleteOptions {
	text: string
	cursorPosition: number
	enabled: boolean
	triggers: string[]
	providers: AutocompleteProvider[]
	createOption?: (query: string) => AutocompleteCreateOption | null
	limit?: number
}

export function useAutocomplete({
	text,
	cursorPosition,
	enabled,
	triggers,
	providers,
	createOption,
	limit = 12,
}: UseAutocompleteOptions) {
	const [items, setItems] = useState<AutocompleteItem[]>([])
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [isLoading, setIsLoading] = useState(false)

	const activeMatch = useMemo(() => {
		if (!enabled) return null
		return getActiveTriggerMatch(text, cursorPosition, triggers)
	}, [cursorPosition, enabled, text, triggers])

	const createItem = useMemo(() => {
		if (!activeMatch || !createOption) return null
		const trimmed = activeMatch.query.trim()
		if (!trimmed) return null
		return createOption(trimmed)
	}, [activeMatch, createOption])

	useEffect(() => {
		if (!activeMatch) {
			setItems([])
			setSelectedIndex(0)
			return
		}

		let cancelled = false
		setIsLoading(true)

		void Promise.all(
			providers.map((provider) => provider.search(activeMatch.query, limit)),
		)
			.then((groups) => {
				if (cancelled) return
				const merged = groups.flat()
				const deduped = new Map<string, AutocompleteItem>()
				for (const item of merged) {
					deduped.set(`${item.entityType}:${item.id}`, item)
				}
				setItems(Array.from(deduped.values()).slice(0, limit))
				setSelectedIndex(0)
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [activeMatch?.query, activeMatch?.trigger, limit, providers])

	const selectableCount = items.length + (createItem ? 1 : 0)
	const isOpen = Boolean(activeMatch)

	const moveSelection = useCallback(
		(direction: 1 | -1) => {
			if (selectableCount === 0) return
			setSelectedIndex((current) => {
				const next = current + direction
				if (next < 0) return selectableCount - 1
				if (next >= selectableCount) return 0
				return next
			})
		},
		[selectableCount],
	)

	return {
		isOpen,
		isLoading,
		activeMatch: activeMatch as AutocompleteTriggerMatch | null,
		items,
		createItem,
		selectedIndex,
		moveSelection,
		setSelectedIndex,
		selectableCount,
	}
}
