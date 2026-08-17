import React from 'react'
import { ServerCrash, RefreshCw } from 'lucide-react'

interface ServerOfflineBannerProps {
	onRetry?: () => void
	isRetrying?: boolean
}

export const ServerOfflineBanner: React.FC<ServerOfflineBannerProps> = ({
	onRetry,
	isRetrying = false,
}) => {
	return (
		<div className="shrink-0 z-40 flex items-center justify-between gap-3 px-4 py-2.5 bg-rose-950/90 border-b border-rose-500/40 text-rose-100">
			<div className="flex items-center gap-2 min-w-0">
				<ServerCrash className="w-4 h-4 shrink-0 text-rose-400" />
				<div className="min-w-0">
					<p className="text-sm font-semibold text-rose-100">PersonalAI Server Offline</p>
					<p className="text-[9px] text-rose-300/90 truncate">
						Cannot reach your laptop PersonalAI backend. Start the server and check your Tailscale connection.
					</p>
				</div>
			</div>
			{onRetry && (
				<button
					type="button"
					onClick={onRetry}
					disabled={isRetrying}
					className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold transition-colors disabled:opacity-60"
				>
					<RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
					Retry
				</button>
			)}
		</div>
	)
}
