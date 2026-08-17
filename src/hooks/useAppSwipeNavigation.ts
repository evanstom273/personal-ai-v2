import { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useFoldablePane } from '@/hooks/useFoldablePane'
import { useMobileNavLayout } from '@/hooks/useMobileNavLayout'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import {
	buildSwipeNavLocation,
	getSwipeNavStep,
	isSwipeNavigationPath,
	resolveSwipeNavIndex,
} from '@/navigation/swipeNav'

export function useAppSwipeNavigation(
	navigateWithFade: (target: { pathname: string; search: string }) => void,
): void {
	const location = useLocation()
	const isMobileNav = useMobileNavLayout()
	const { isDualPaneActive } = useFoldablePane()

	const enabled =
		isMobileNav &&
		!isDualPaneActive &&
		isSwipeNavigationPath(location.pathname) &&
		!location.pathname.startsWith('/library/documents/') &&
		!location.pathname.startsWith('/library/projects/')

	const navigateByOffset = useCallback(
		(offset: number) => {
			const currentIndex = resolveSwipeNavIndex(
				location.pathname,
				new URLSearchParams(location.search),
			)

			if (currentIndex < 0) {
				return
			}

			const step = getSwipeNavStep(currentIndex + offset)
			if (!step) {
				return
			}

			navigateWithFade(buildSwipeNavLocation(step))
		},
		[location.pathname, location.search, navigateWithFade],
	)

	useSwipeNavigation({
		enabled,
		onSwipeLeft: () => navigateByOffset(1),
		onSwipeRight: () => navigateByOffset(-1),
	})
}
