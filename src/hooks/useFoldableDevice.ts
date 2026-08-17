import { useEffect, useState } from 'react'
import type { UserPreferences } from '@/storage/types'

export type FoldablePosture = 'dual-portrait' | 'dual-landscape' | 'single'

export interface FoldableDeviceInfo {
	isDualPaneActive: boolean
	isHardwareFoldable: boolean
	posture: FoldablePosture
	segmentCount: number
	hingeGap: number
	screenWidth: number
}

export function useFoldableDevice(preferences: Partial<UserPreferences> = {}): FoldableDeviceInfo {
	const enableFoldable = preferences.enableFoldableDualPane ?? true
	const forceDualPane = preferences.forceDualPaneMode ?? false
	const customHingeGap = preferences.customHingeGap ?? 0
	const minWidthThreshold = preferences.dualPaneMinWidth ?? 900

	const [screenWidth, setScreenWidth] = useState<number>(
		typeof window !== 'undefined' ? window.innerWidth : 1024,
	)
	const [hasHorizontalSegments, setHasHorizontalSegments] = useState<boolean>(false)
	const [hasVerticalSegments, setHasVerticalSegments] = useState<boolean>(false)

	useEffect(() => {
		if (typeof window === 'undefined') return

		const updateDimensions = () => {
			setScreenWidth(window.innerWidth)
		}

		window.addEventListener('resize', updateDimensions)
		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', updateDimensions)
		}

		const horizQuery = window.matchMedia('(horizontal-viewport-segments: 2)')
		const vertQuery = window.matchMedia('(vertical-viewport-segments: 2)')

		setHasHorizontalSegments(horizQuery.matches)
		setHasVerticalSegments(vertQuery.matches)

		const handleHorizChange = (e: MediaQueryListEvent) => setHasHorizontalSegments(e.matches)
		const handleVertChange = (e: MediaQueryListEvent) => setHasVerticalSegments(e.matches)

		try {
			horizQuery.addEventListener('change', handleHorizChange)
			vertQuery.addEventListener('change', handleVertChange)
		} catch {
			// Legacy fallback for Safari
			horizQuery.addListener(handleHorizChange)
			vertQuery.addListener(handleVertChange)
		}

		return () => {
			window.removeEventListener('resize', updateDimensions)
			if (window.visualViewport) {
				window.visualViewport.removeEventListener('resize', updateDimensions)
			}
			try {
				horizQuery.removeEventListener('change', handleHorizChange)
				vertQuery.removeEventListener('change', handleVertChange)
			} catch {
				horizQuery.removeListener(handleHorizChange)
				vertQuery.removeListener(handleVertChange)
			}
		}
	}, [])

	const isHardwareFoldable = hasHorizontalSegments || hasVerticalSegments
	const segmentCount = isHardwareFoldable ? 2 : 1

	let posture: FoldablePosture = 'single'
	if (hasHorizontalSegments) {
		posture = 'dual-portrait'
	} else if (hasVerticalSegments) {
		posture = 'dual-landscape'
	}

	// Calculate hinge width from CSS env() or fallback to customHingeGap
	let hingeGap = customHingeGap
	if (typeof window !== 'undefined' && isHardwareFoldable) {
		const computedHinge = parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue('--hinge-gap') || '0',
		)
		if (computedHinge > 0) {
			hingeGap = computedHinge
		}
	}

	const isDualPaneActive =
		forceDualPane || (enableFoldable && (isHardwareFoldable || screenWidth >= minWidthThreshold))

	return {
		isDualPaneActive,
		isHardwareFoldable,
		posture,
		segmentCount,
		hingeGap,
		screenWidth,
	}
}
