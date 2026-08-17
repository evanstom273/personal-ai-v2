import React, { useState } from 'react'
import { Phone, Download, Share2, Trash2 } from 'lucide-react'
import { cn } from '../utils/cn'

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
		<header
			className={cn(
				'app-header-glass relative z-40 shrink-0 px-4 pb-3 md:px-6',
				'pt-[max(0.75rem,env(safe-area-inset-top))]',
			)}
		>
			<div className="flex min-w-0 items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-base font-semibold md:text-lg">J.A.R.V.I.S</h1>
					<p className="truncate text-xs text-muted-foreground mt-0.5">{APP_VERSION}</p>
				</div>

				<div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
					<button
						type="button"
						className="btn-ghost rounded-lg p-2"
						title="Call"
						aria-label="Call"
					>
						<Phone className="h-5 w-5" strokeWidth={1.75} />
					</button>
					<button
						type="button"
						onClick={handleDownload}
						className="btn-ghost rounded-lg p-2"
						title="Download"
						aria-label="Download"
					>
						<Download className="h-5 w-5" strokeWidth={1.75} />
					</button>
					<button
						type="button"
						onClick={handleShare}
						className="btn-ghost rounded-lg p-2"
						title={copied ? 'Copied!' : 'Share'}
						aria-label="Share"
					>
						<Share2 className="h-5 w-5" strokeWidth={1.75} />
					</button>
					<button
						type="button"
						onClick={onClearChat}
						disabled={!hasMessages}
						className="btn-ghost rounded-lg p-2 disabled:opacity-30"
						title="Delete chat"
						aria-label="Delete chat"
					>
						<Trash2 className="h-5 w-5" strokeWidth={1.75} />
					</button>
				</div>
			</div>
		</header>
	)
}
