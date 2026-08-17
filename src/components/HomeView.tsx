import React from 'react'
import { Bot } from 'lucide-react'
import { cn } from '../utils/cn'

interface HomeViewProps {
	onStartChat: () => void
}

export const HomeView: React.FC<HomeViewProps> = ({ onStartChat }) => {
	return (
		<div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-6 md:px-8">
			<div className="mx-auto flex max-w-md flex-col items-center text-center">
				<div
					className={cn(
						'home-hero-icon mb-6 flex h-16 w-16 items-center justify-center rounded-full text-primary',
					)}
				>
					<Bot className="h-8 w-8" strokeWidth={1.75} />
				</div>
				<h2 className="text-xl font-semibold tracking-tight">J.A.R.V.I.S</h2>
				<p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
					Your local AI assistant. Open Chat to start a conversation, or browse past sessions in
					Library.
				</p>
				<button
					type="button"
					onClick={onStartChat}
					className="btn-primary mt-6 rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-95"
				>
					Start chatting
				</button>
			</div>
		</div>
	)
}
