import { useEffect, useState } from 'react'

const MOBILE_NAV_QUERY = '(max-width: 767px)'

export function useMobileNavLayout(): boolean {
	const [isMobileNav, setIsMobileNav] = useState(() => {
		if (typeof window === 'undefined') {
			return false
		}

		return window.matchMedia(MOBILE_NAV_QUERY).matches
	})

	useEffect(() => {
		const mediaQuery = window.matchMedia(MOBILE_NAV_QUERY)

		function handleChange(): void {
			setIsMobileNav(mediaQuery.matches)
		}

		handleChange()
		mediaQuery.addEventListener('change', handleChange)

		return () => {
			mediaQuery.removeEventListener('change', handleChange)
		}
	}, [])

	return isMobileNav
}
