export const DUAL_PANE_PRIMARY_ROUTE = '/chat'

export const DEFAULT_SECONDARY_ROUTE = '/library'

export function buildAppRoute(pathname: string, search = ''): string {
	return `${pathname}${search}`
}

/** Routes that belong in the secondary pane when split-screen is active. */
export function isDualPaneSecondaryRoute(pathname: string): boolean {
	if (pathname === '/home' || pathname === '/') {
		return true
	}
	if (pathname.startsWith('/library')) {
		return true
	}
	if (pathname.startsWith('/memory')) {
		return true
	}
	if (pathname.startsWith('/settings')) {
		return true
	}
	if (pathname.startsWith('/scratchpad')) {
		return true
	}
	return false
}

export function isDualPanePrimaryRoute(pathname: string): boolean {
	return pathname === DUAL_PANE_PRIMARY_ROUTE
}
