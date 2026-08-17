import React, { useState } from 'react'
import {
	Menu,
	Settings as SettingsIcon,
	Plus,
	Moon,
	Sun,
	Trash2,
	Share2,
	Check,
} from 'lucide-react'
import type { ChatSettings } from '../types/chat'
import { DeploymentStageBadge } from './DeploymentStageBadge'

interface HeaderProps {
	sidebarOpen: boolean
	setSidebarOpen: (open: boolean) => void
	onNewChat: () => void
	onOpenSettings: () => void
	onClearCurrentChat: () => void
	settings: ChatSettings
	onUpdateSettings: (newSettings: Partial<ChatSettings>) => void
	hasMessages: boolean
}

export const Header: React.FC<HeaderProps> = ({
	sidebarOpen,
	setSidebarOpen,
	onNewChat,
	onOpenSettings,
	onClearCurrentChat,
	settings,
	onUpdateSettings,
	hasMessages,
}) => {
	const [copied, setCopied] = useState(false)

	const toggleTheme = () => {
		const nextTheme = settings.theme === 'dark' ? 'light' : 'dark'
		onUpdateSettings({ theme: nextTheme })
	}

	const handleShare = () => {
		navigator.clipboard.writeText(window.location.href)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<header className="shrink-0 z-30 flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 border-b bg-slate-950/80 border-slate-800/70 backdrop-blur-xl text-slate-100 transition-colors pt-[env(safe-area-inset-top)]">
			<div className="flex items-center gap-1 sm:gap-2 min-w-0">
				<button
					type="button"
					onClick={() => setSidebarOpen(!sidebarOpen)}
					className="p-2 text-slate-400 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors shrink-0"
					title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
				>
					<Menu className="w-5 h-5" />
				</button>

				<button
					type="button"
					onClick={onNewChat}
					className="p-2 text-slate-400 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors sm:hidden shrink-0"
					title="New Chat"
				>
					<Plus className="w-5 h-5" />
				</button>

				<span className="hidden sm:inline text-sm font-semibold text-slate-300 truncate">
					Personal AI
				</span>
			</div>

			<div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
				<DeploymentStageBadge />

				{hasMessages && (
					<button
						type="button"
						onClick={onClearCurrentChat}
						className="p-2 text-slate-400 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
						title="Clear current messages"
					>
						<Trash2 className="w-4 h-4" />
					</button>
				)}

				<button
					type="button"
					onClick={handleShare}
					className="p-2 text-slate-400 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors hidden sm:flex"
					title="Share link"
				>
					{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
				</button>

				<button
					type="button"
					onClick={toggleTheme}
					className="p-2 text-slate-400 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
					title="Toggle light/dark mode"
				>
					{settings.theme === 'light' ? (
						<Sun className="w-4 h-4 text-amber-400" />
					) : (
						<Moon className="w-4 h-4" />
					)}
				</button>

				<button
					type="button"
					onClick={onOpenSettings}
					className="p-2 text-slate-400 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
					title="Chat settings"
				>
					<SettingsIcon className="w-4 h-4" />
				</button>
			</div>
		</header>
	)
}
