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
		<div
			className="z-40 shrink-0 flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm backdrop-blur-sm md:px-6"
		>
			<div className="flex min-w-0 items-center gap-2">
				<ServerCrash className="h-4 w-4 shrink-0 text-destructive" />
				<div className="min-w-0">
					<p className="font-semibold text-foreground">PersonalAI Server Offline</p>
					<p className="truncate text-xs text-muted-foreground">
						Cannot reach your laptop PersonalAI backend. Start the server and check your
						Tailscale connection.
					</p>
				</div>
			</div>
			{onRetry ? (
				<button
					type="button"
					onClick={onRetry}
					disabled={isRetrying}
					className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-60"
				>
					<RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
					Retry
				</button>
			) : null}
		</div>
	)
}
