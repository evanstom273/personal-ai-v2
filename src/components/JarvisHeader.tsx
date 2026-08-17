import React, { useState } from 'react'
import { Phone, Download, Share2, Trash2 } from 'lucide-react'

const APP_VERSION = 'v2.1.5'

interface JarvisHeaderProps {
	onClearChat: () => void
	hasMessages: boolean
}

export const JarvisHeader: React.FC<JarvisHeaderProps> = ({ onClearChat, hasMessages }) => {
	const [copied, setCopied] = useState(false)

	const handleShare = () => {
		navigator.clipboard.writeText(window.location.href)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleDownload = () => {
		const blob = new Blob([window.location.href], { type: 'text/plain' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = 'jarvis-chat-link.txt'
		a.click()
		URL.revokeObjectURL(url)
	}

	return (
		<header className="shrink-0 flex items-start justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-[var(--jarvis-border)] bg-[var(--jarvis-bg)]">
			<div>
				<h1 className="text-lg font-bold text-[var(--jarvis-text)] tracking-tight">J.A.R.V.I.S</h1>
				<p className="text-xs text-[var(--jarvis-muted)] mt-0.5">{APP_VERSION}</p>
			</div>

			<div className="flex items-center gap-1 text-[var(--jarvis-muted)]">
				<button
					type="button"
					className="p-2 rounded-lg hover:text-[var(--jarvis-text)] hover:bg-[var(--jarvis-surface)] transition-colors"
					title="Call"
					aria-label="Call"
				>
					<Phone className="w-5 h-5" strokeWidth={1.75} />
				</button>
				<button
					type="button"
					onClick={handleDownload}
					className="p-2 rounded-lg hover:text-[var(--jarvis-text)] hover:bg-[var(--jarvis-surface)] transition-colors"
					title="Download"
					aria-label="Download"
				>
					<Download className="w-5 h-5" strokeWidth={1.75} />
				</button>
				<button
					type="button"
					onClick={handleShare}
					className="p-2 rounded-lg hover:text-[var(--jarvis-text)] hover:bg-[var(--jarvis-surface)] transition-colors"
					title={copied ? 'Copied!' : 'Share'}
					aria-label="Share"
				>
					<Share2 className="w-5 h-5" strokeWidth={1.75} />
				</button>
				<button
					type="button"
					onClick={onClearChat}
					disabled={!hasMessages}
					className="p-2 rounded-lg hover:text-[var(--jarvis-text)] hover:bg-[var(--jarvis-surface)] transition-colors disabled:opacity-30"
					title="Delete chat"
					aria-label="Delete chat"
				>
					<Trash2 className="w-5 h-5" strokeWidth={1.75} />
				</button>
			</div>
		</header>
	)
}
