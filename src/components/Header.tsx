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
		<header className="app-header-glass shrink-0 z-30 flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 pt-[env(safe-area-inset-top)] text-foreground transition-colors">
			<div className="flex min-w-0 items-center gap-1 sm:gap-2">
				<button
					type="button"
					onClick={() => setSidebarOpen(!sidebarOpen)}
					className="btn-ghost shrink-0 rounded-lg p-2 xl:hidden"
					title={sidebarOpen ? 'Close menu' : 'Open menu'}
				>
					<Menu className="w-5 h-5" />
				</button>

				<button
					type="button"
					onClick={onNewChat}
					className="btn-ghost shrink-0 rounded-lg p-2 sm:hidden"
					title="New Chat"
				>
					<Plus className="w-5 h-5" />
				</button>

				<span className="hidden truncate text-sm font-semibold text-muted-foreground sm:inline">
					Personal AI
				</span>
			</div>

			<div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
				<DeploymentStageBadge />

				{hasMessages && (
					<button
						type="button"
						onClick={onClearCurrentChat}
						className="btn-ghost rounded-lg p-2 hover:text-destructive"
						title="Clear current messages"
					>
						<Trash2 className="w-4 h-4" />
					</button>
				)}

				<button
					type="button"
					onClick={handleShare}
					className="btn-ghost hidden rounded-lg p-2 sm:flex"
					title="Share link"
				>
					{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
				</button>

				<button
					type="button"
					onClick={toggleTheme}
					className="btn-ghost rounded-lg p-2"
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
					className="btn-ghost rounded-lg p-2"
					title="Chat settings"
				>
					<SettingsIcon className="w-4 h-4" />
				</button>
			</div>
		</header>
	)
}
