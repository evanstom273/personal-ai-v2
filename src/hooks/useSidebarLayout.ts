import { useEffect, useState } from 'react'

/** Desktop persistent sidebar; below this width sidebar is a full-screen overlay only */
export const DESKTOP_SIDEBAR_MEDIA = '(min-width: 1280px)'

const FOLDABLE_HORIZONTAL_SEGMENTS = '(horizontal-viewport-segments: 2)'
const FOLDABLE_VERTICAL_SEGMENTS = '(vertical-viewport-segments: 2)'

function readDesktopSidebarEligible(): boolean {
	if (typeof window === 'undefined') return false

	const isWide = window.matchMedia(DESKTOP_SIDEBAR_MEDIA).matches
	const isFoldableDualSegment =
		window.matchMedia(FOLDABLE_HORIZONTAL_SEGMENTS).matches ||
		window.matchMedia(FOLDABLE_VERTICAL_SEGMENTS).matches

	// Foldables report a wide viewport across both panels — keep overlay-only sidebar
	return isWide && !isFoldableDualSegment
}

export function useIsDesktopSidebar(): boolean {
	const [isDesktop, setIsDesktop] = useState(readDesktopSidebarEligible)

	useEffect(() => {
		const mediaQueries = [
			window.matchMedia(DESKTOP_SIDEBAR_MEDIA),
			window.matchMedia(FOLDABLE_HORIZONTAL_SEGMENTS),
			window.matchMedia(FOLDABLE_VERTICAL_SEGMENTS),
		]

		function handleChange(): void {
			setIsDesktop(readDesktopSidebarEligible())
		}

		handleChange()
		for (const mediaQuery of mediaQueries) {
			mediaQuery.addEventListener('change', handleChange)
		}

		return () => {
			for (const mediaQuery of mediaQueries) {
				mediaQuery.removeEventListener('change', handleChange)
			}
		}
	}, [])

	return isDesktop
}

export function useSidebarLayout(): {
	sidebarOpen: boolean
	setSidebarOpen: (open: boolean) => void
	isDesktopSidebar: boolean
} {
	const isDesktopSidebar = useIsDesktopSidebar()
	const [sidebarOpen, setSidebarOpen] = useState(false)

	useEffect(() => {
		setSidebarOpen(isDesktopSidebar)
	}, [isDesktopSidebar])

	return { sidebarOpen, setSidebarOpen, isDesktopSidebar }
}
