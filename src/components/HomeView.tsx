import React from 'react'
import { Bot } from 'lucide-react'

interface HomeViewProps {
	onStartChat: () => void
}

export const HomeView: React.FC<HomeViewProps> = ({ onStartChat }) => {
	return (
		<div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
			<div className="w-16 h-16 rounded-full bg-[var(--jarvis-accent)] flex items-center justify-center mb-6 shadow-lg shadow-[var(--jarvis-accent)]/20">
				<Bot className="w-8 h-8 text-white" strokeWidth={1.75} />
			</div>
			<h2 className="text-xl font-bold text-[var(--jarvis-text)] mb-2">J.A.R.V.I.S</h2>
			<p className="text-sm text-[var(--jarvis-muted)] max-w-sm leading-relaxed mb-6">
				Your local AI assistant. Open Chat to start a conversation, or browse past sessions in Library.
			</p>
			<button
				type="button"
				onClick={onStartChat}
				className="px-6 py-2.5 rounded-full bg-[var(--jarvis-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
			>
				Start chatting
			</button>
		</div>
	)
}
