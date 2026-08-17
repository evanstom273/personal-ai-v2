import React from 'react'
import { Home, MessageSquare, Library, Settings, FileText } from 'lucide-react'
import { cn } from '../utils/cn'

export type AppTab = 'home' | 'chat' | 'library' | 'settings'

interface BottomNavProps {
	activeTab: AppTab
	onTabChange: (tab: AppTab) => void
	onOpenTranscripts?: () => void
}

const NAV_ITEMS: { id: AppTab; label: string; icon: typeof Home }[] = [
	{ id: 'home', label: 'Home', icon: Home },
	{ id: 'chat', label: 'Chat', icon: MessageSquare },
	{ id: 'library', label: 'Library', icon: Library },
	{ id: 'settings', label: 'Settings', icon: Settings },
]

export const BottomNav: React.FC<BottomNavProps> = ({
	activeTab,
	onTabChange,
	onOpenTranscripts,
}) => {
	return (
		<div className="bottom-nav-dock shrink-0">
			<div className="flex items-center gap-2 max-w-[36rem] mx-auto">
				{onOpenTranscripts ? (
					<button
						type="button"
						onClick={onOpenTranscripts}
						className="btn-ghost flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/5 surface-glass"
						title="Transcripts"
						aria-label="Transcripts"
					>
						<FileText className="h-5 w-5" strokeWidth={1.85} />
					</button>
				) : null}

				<nav className="bottom-nav-island flex-1 min-w-0" aria-label="Main navigation">
					{NAV_ITEMS.map(({ id, label, icon: Icon }) => {
						const isActive = activeTab === id
						return (
							<button
								key={id}
								type="button"
								onClick={() => onTabChange(id)}
								className={cn('bottom-nav-item', isActive && 'bottom-nav-item-active')}
							>
								<span
									className={cn(
										'bottom-nav-icon-shell',
										isActive && 'bottom-nav-icon-shell-active',
									)}
								>
									<Icon
										className="h-[1.35rem] w-[1.35rem]"
										strokeWidth={isActive ? 2.25 : 1.85}
									/>
								</span>
								<span className="bottom-nav-label">{label}</span>
							</button>
						)
					})}
				</nav>
			</div>
		</div>
	)
}
