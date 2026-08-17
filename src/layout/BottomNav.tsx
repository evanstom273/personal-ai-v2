import { Home, Library, MessageSquare, Settings } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useFoldablePane } from '@/hooks/useFoldablePane'
import { useChatGenerationContext } from '@/providers/ChatProvider'
import {
	DUAL_PANE_PRIMARY_ROUTE,
	isDualPaneSecondaryRoute,
} from '@/utils/dualPaneRoutes'
import { cn } from '@/utils/cn'

const NAV_ITEMS = [
	{ to: '/home', label: 'Home', icon: Home, end: true },
	{ to: DUAL_PANE_PRIMARY_ROUTE, label: 'Chat', icon: MessageSquare, end: true },
	{ to: '/library', label: 'Library', icon: Library, end: false },
	{ to: '/settings', label: 'Settings', icon: Settings, end: true },
] as const

export function BottomNav() {
	const { isGenerating } = useChatGenerationContext()
	const {
		isDualPaneActive,
		openInSecondaryPane,
		pane2Route,
		setActivePane,
	} = useFoldablePane()
	const navigate = useNavigate()

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
		if (!isDualPaneActive) {
			return
		}

		if (to === DUAL_PANE_PRIMARY_ROUTE) {
			e.preventDefault()
			navigate(DUAL_PANE_PRIMARY_ROUTE)
			setActivePane('pane1')
			return
		}

		if (isDualPaneSecondaryRoute(to)) {
			e.preventDefault()
			openInSecondaryPane(to)
		}
	}

	return (
		<div className="bottom-nav-dock shrink-0">
			<nav className="bottom-nav-island" aria-label="Main navigation">
				{NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
					return (
						<NavLink
							key={to}
							to={to}
							end={end}
							onClick={(e) => handleClick(e, to)}
							className={({ isActive }) => {
								const active = isDualPaneActive
									? to === DUAL_PANE_PRIMARY_ROUTE
										? isActive
										: pane2Route.startsWith(to)
									: isActive
								return cn('bottom-nav-item', active && 'bottom-nav-item-active')
							}}
						>
							{({ isActive }) => {
								const active = isDualPaneActive
									? to === DUAL_PANE_PRIMARY_ROUTE
										? isActive
										: pane2Route.startsWith(to)
									: isActive
								return (
									<>
										<span
											className={cn(
												'bottom-nav-icon-shell',
												active && 'bottom-nav-icon-shell-active',
											)}
										>
											<Icon
												className="h-[1.35rem] w-[1.35rem]"
												strokeWidth={active ? 2.25 : 1.85}
											/>
											{isGenerating && to === DUAL_PANE_PRIMARY_ROUTE && !active ? (
												<span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
													<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
													<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
												</span>
											) : null}
										</span>
										<span className="bottom-nav-label">{label}</span>
									</>
								)
							}}
						</NavLink>
					)
				})}
			</nav>
		</div>
	)
}
