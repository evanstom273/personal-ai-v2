import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFoldablePane } from '@/hooks/useFoldablePane'
import {
	DUAL_PANE_PRIMARY_ROUTE,
	isDualPaneSecondaryRoute,
} from '@/utils/dualPaneRoutes'

export function useDualPaneNavigation() {
	const { isDualPaneActive, openInSecondaryPane } = useFoldablePane()
	const navigate = useNavigate()

	const navigateApp = useCallback(
		(route: string) => {
			if (isDualPaneActive && isDualPaneSecondaryRoute(route.split('?')[0] ?? route)) {
				openInSecondaryPane(route)
				return
			}
			navigate(route)
		},
		[isDualPaneActive, navigate, openInSecondaryPane],
	)

	const openDocument = useCallback(
		(documentId: string) => {
			navigateApp(`/library/documents/${documentId}`)
		},
		[navigateApp],
	)

	const openProject = useCallback(
		(projectId: string) => {
			navigateApp(`/library/projects/${projectId}`)
		},
		[navigateApp],
	)

	const goToLibrary = useCallback(() => {
		navigateApp('/library')
	}, [navigateApp])

	const focusChat = useCallback(() => {
		navigate(DUAL_PANE_PRIMARY_ROUTE)
	}, [navigate])

	return {
		isDualPaneActive,
		navigateApp,
		openDocument,
		openProject,
		goToLibrary,
		focusChat,
		openInSecondaryPane,
	}
}
