import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFoldableDevice, type FoldableDeviceInfo } from '@/hooks/useFoldableDevice'
import { usePreferencesContext } from '@/providers/ChatProvider'
import {
	buildAppRoute,
	DEFAULT_SECONDARY_ROUTE,
	DUAL_PANE_PRIMARY_ROUTE,
	isDualPanePrimaryRoute,
	isDualPaneSecondaryRoute,
} from '@/utils/dualPaneRoutes'

export interface FoldablePaneContextValue {
	foldableInfo: FoldableDeviceInfo
	isDualPaneActive: boolean
	pane1Route: string
	pane2Route: string
	splitRatio: number
	activePane: 'pane1' | 'pane2'
	setPane1Route: (route: string) => void
	setPane2Route: (route: string) => void
	openInSecondaryPane: (route: string) => void
	closeSecondaryPane: () => void
	swapPanes: () => void
	setSplitRatio: (ratio: number) => void
	setActivePane: (pane: 'pane1' | 'pane2') => void
}

const FoldablePaneContext = createContext<FoldablePaneContextValue | null>(null)

export function FoldablePaneProvider({ children }: { children: ReactNode }) {
	const { preferences, savePreferences } = usePreferencesContext()
	const foldableInfo = useFoldableDevice(preferences)
	const location = useLocation()
	const navigate = useNavigate()

	const [splitRatio, setRatioState] = useState<number>(
		preferences.dualPaneSplitRatio ?? 50,
	)
	const [pane1Route, setPane1RouteState] = useState<string>(DUAL_PANE_PRIMARY_ROUTE)
	const [pane2Route, setPane2RouteState] = useState<string>(DEFAULT_SECONDARY_ROUTE)
	const [activePane, setActivePane] = useState<'pane1' | 'pane2'>('pane1')
	const wasDualPaneActiveRef = useRef(foldableInfo.isDualPaneActive)

	const currentRoute = buildAppRoute(location.pathname, location.search)

	// Keep ratio synced with preference changes
	useEffect(() => {
		if (preferences.dualPaneSplitRatio !== undefined) {
			setRatioState(preferences.dualPaneSplitRatio)
		}
	}, [preferences.dualPaneSplitRatio])

	// When split-screen turns on, pin chat to pane 1 and move the current view to pane 2.
	useEffect(() => {
		const justActivated =
			foldableInfo.isDualPaneActive && !wasDualPaneActiveRef.current
		wasDualPaneActiveRef.current = foldableInfo.isDualPaneActive

		if (!foldableInfo.isDualPaneActive) {
			setPane1RouteState(currentRoute)
			return
		}

		setPane1RouteState(DUAL_PANE_PRIMARY_ROUTE)

		if (justActivated) {
			if (isDualPaneSecondaryRoute(location.pathname)) {
				setPane2RouteState(currentRoute)
			} else if (!pane2Route) {
				setPane2RouteState(DEFAULT_SECONDARY_ROUTE)
			}
		}

		if (!isDualPanePrimaryRoute(location.pathname)) {
			navigate(DUAL_PANE_PRIMARY_ROUTE, { replace: justActivated })
		}
	}, [
		currentRoute,
		foldableInfo.isDualPaneActive,
		location.pathname,
		navigate,
		pane2Route,
	])

	// While split-screen is active, any main-router navigation to a secondary route
	// should update pane 2 only — chat stays in pane 1.
	useEffect(() => {
		if (!foldableInfo.isDualPaneActive) {
			return
		}

		if (isDualPanePrimaryRoute(location.pathname)) {
			setPane1RouteState(DUAL_PANE_PRIMARY_ROUTE)
			return
		}

		if (isDualPaneSecondaryRoute(location.pathname)) {
			setPane2RouteState(currentRoute)
			setPane1RouteState(DUAL_PANE_PRIMARY_ROUTE)
			navigate(DUAL_PANE_PRIMARY_ROUTE, { replace: true })
		}
	}, [
		currentRoute,
		foldableInfo.isDualPaneActive,
		location.pathname,
		navigate,
	])

	const setSplitRatio = useCallback(
		(ratio: number) => {
			const clamped = Math.min(80, Math.max(20, Math.round(ratio)))
			setRatioState(clamped)
			void savePreferences({
				...preferences,
				dualPaneSplitRatio: clamped,
			})
		},
		[preferences, savePreferences],
	)

	const openInSecondaryPane = useCallback(
		(route: string) => {
			setPane2RouteState(route)
			setActivePane('pane2')

			if (foldableInfo.isDualPaneActive) {
				setPane1RouteState(DUAL_PANE_PRIMARY_ROUTE)
				if (!isDualPanePrimaryRoute(location.pathname)) {
					navigate(DUAL_PANE_PRIMARY_ROUTE, { replace: true })
				}
				return
			}

			navigate(route)
		},
		[foldableInfo.isDualPaneActive, location.pathname, navigate],
	)

	const closeSecondaryPane = useCallback(() => {
		setPane2RouteState('')
		setActivePane('pane1')
	}, [])

	const swapPanes = useCallback(() => {
		setActivePane((current) => (current === 'pane1' ? 'pane2' : 'pane1'))
	}, [])

	const contextValue = useMemo<FoldablePaneContextValue>(
		() => ({
			foldableInfo,
			isDualPaneActive: foldableInfo.isDualPaneActive,
			pane1Route,
			pane2Route,
			splitRatio,
			activePane,
			setPane1Route: setPane1RouteState,
			setPane2Route: setPane2RouteState,
			openInSecondaryPane,
			closeSecondaryPane,
			swapPanes,
			setSplitRatio,
			setActivePane,
		}),
		[
			foldableInfo,
			pane1Route,
			pane2Route,
			splitRatio,
			activePane,
			openInSecondaryPane,
			closeSecondaryPane,
			swapPanes,
			setSplitRatio,
		],
	)

	return (
		<FoldablePaneContext.Provider value={contextValue}>
			{children}
		</FoldablePaneContext.Provider>
	)
}

export function useFoldablePaneContext(): FoldablePaneContextValue {
	const context = useContext(FoldablePaneContext)
	if (!context) {
		throw new Error('useFoldablePaneContext must be used within a FoldablePaneProvider')
	}
	return context
}
