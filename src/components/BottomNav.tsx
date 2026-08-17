import React from 'react'
import { Home, MessageCircle, Library, Settings, FileText } from 'lucide-react'

export type AppTab = 'home' | 'chat' | 'library' | 'settings'

interface BottomNavProps {
	activeTab: AppTab
	onTabChange: (tab: AppTab) => void
	onOpenTranscripts?: () => void
}

export const BottomNav: React.FC<BottomNavProps> = ({
	activeTab,
	onTabChange,
	onOpenTranscripts,
}) => {
	const items: { id: AppTab; label: string; icon: React.ReactNode }[] = [
		{ id: 'home', label: 'Home', icon: <Home className="w-5 h-5" strokeWidth={1.75} /> },
		{ id: 'chat', label: 'Chat', icon: <MessageCircle className="w-5 h-5" strokeWidth={1.75} /> },
		{ id: 'library', label: 'Library', icon: <Library className="w-5 h-5" strokeWidth={1.75} /> },
		{ id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" strokeWidth={1.75} /> },
	]

	return (
		<nav
			className="shrink-0 flex items-center justify-between px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-[var(--jarvis-border)] bg-[var(--jarvis-bg)]"
			aria-label="Main navigation"
		>
			<button
				type="button"
				onClick={onOpenTranscripts}
				className="p-2.5 rounded-lg text-[var(--jarvis-muted)] hover:text-[var(--jarvis-text)] hover:bg-[var(--jarvis-surface)] transition-colors"
				title="Transcripts"
				aria-label="Transcripts"
			>
				<FileText className="w-5 h-5" strokeWidth={1.75} />
			</button>

			<div className="flex items-center justify-center gap-1 flex-1">
				{items.map((item) => {
					const isActive = activeTab === item.id
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => onTabChange(item.id)}
							className={`flex flex-col items-center justify-center min-w-[4.5rem] py-1.5 px-3 rounded-xl transition-colors ${
								isActive
									? 'text-[var(--jarvis-accent)] bg-[var(--jarvis-accent-soft)]'
									: 'text-[var(--jarvis-muted)] hover:text-[var(--jarvis-text)]'
							}`}
						>
							<span className={isActive ? 'text-[var(--jarvis-accent)]' : ''}>{item.icon}</span>
							<span className="text-[10px] font-medium mt-0.5 tracking-wide">{item.label}</span>
						</button>
					)
				})}
			</div>
		</nav>
	)
}
