import React from 'react'
import { MessageCircle, Trash2 } from 'lucide-react'
import type { ChatSession } from '../types/chat'
import { formatMessageTimestamp } from '../utils/formatDate'

interface LibraryViewProps {
	sessions: ChatSession[]
	activeSessionId: string
	onSelectSession: (id: string) => void
	onDeleteSession: (id: string) => void
	onNewChat: () => void
}

export const LibraryView: React.FC<LibraryViewProps> = ({
	sessions,
	activeSessionId,
	onSelectSession,
	onDeleteSession,
	onNewChat,
}) => {
	return (
		<div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-base font-semibold text-[var(--jarvis-text)]">Library</h2>
				<button
					type="button"
					onClick={onNewChat}
					className="text-xs font-medium text-[var(--jarvis-accent)] px-3 py-1.5 rounded-lg bg-[var(--jarvis-accent-soft)]"
				>
					New chat
				</button>
			</div>

			{sessions.length === 0 ? (
				<p className="text-sm text-[var(--jarvis-muted)]">No conversations yet.</p>
			) : (
				<ul className="space-y-2">
					{sessions.map((session) => (
						<li key={session.id}>
							<div
								className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
									session.id === activeSessionId
										? 'border-[var(--jarvis-accent)] bg-[var(--jarvis-accent-soft)]'
										: 'border-[var(--jarvis-border)] bg-[var(--jarvis-surface)]'
								}`}
							>
								<button
									type="button"
									onClick={() => onSelectSession(session.id)}
									className="flex-1 min-w-0 text-left"
								>
									<div className="flex items-center gap-2">
										<MessageCircle className="w-4 h-4 text-[var(--jarvis-accent)] shrink-0" />
										<span className="text-sm font-medium text-[var(--jarvis-text)] truncate">
											{session.title}
										</span>
									</div>
									<p className="text-[10px] text-[var(--jarvis-muted)] mt-1">
										{formatMessageTimestamp(session.updatedAt)} · {session.messages.length} messages
									</p>
								</button>
								<button
									type="button"
									onClick={() => onDeleteSession(session.id)}
									className="p-2 text-[var(--jarvis-muted)] hover:text-rose-400 rounded-lg"
									aria-label="Delete conversation"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
