import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface VoiceSessionOverlayProps {
	label: string
	onDismiss: () => void
	children: ReactNode
}

export function VoiceSessionOverlay({
	label,
	onDismiss,
	children,
}: VoiceSessionOverlayProps) {
	return (
		<div className="shrink-0 border-t border-primary/30 bg-card px-4 py-4 md:px-6">
			<div className="mb-4 flex items-center justify-between gap-3">
				<p className="text-sm font-medium text-foreground">{label}</p>
				<Button type="button" size="sm" variant="outline" onClick={onDismiss}>
					End
				</Button>
			</div>
			{children}
		</div>
	)
}
