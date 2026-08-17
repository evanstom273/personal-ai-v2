import React from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'
import type { ChatSession } from '../types/chat'
import { formatMessageTimestamp } from '../utils/formatDate'
import { cn } from '../utils/cn'

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
		<div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-6 md:px-8">
			<div className="mx-auto max-w-2xl">
				<div className="mb-5 flex items-center justify-between gap-3">
					<h2 className="text-base font-semibold md:text-lg">Library</h2>
					<button
						type="button"
						onClick={onNewChat}
						className="rounded-full bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/25 transition-colors hover:bg-primary/20"
					>
						New chat
					</button>
				</div>

				{sessions.length === 0 ? (
					<div className="home-placeholder-card rounded-[1.35rem] p-6 text-center">
						<p className="text-sm text-muted-foreground">No conversations yet.</p>
					</div>
				) : (
					<ul className="space-y-2">
						{sessions.map((session) => {
							const isActive = session.id === activeSessionId
							return (
								<li key={session.id}>
									<div
										className={cn(
											'surface-panel flex items-center gap-3 rounded-[1.25rem] p-3 transition-colors',
											isActive && 'ring-1 ring-primary/40',
										)}
									>
										<button
											type="button"
											onClick={() => onSelectSession(session.id)}
											className="min-w-0 flex-1 text-left"
										>
											<div className="flex items-center gap-2">
												<MessageSquare
													className="h-4 w-4 shrink-0 text-primary"
													strokeWidth={1.85}
												/>
												<span className="truncate text-sm font-medium">{session.title}</span>
											</div>
											<p className="mt-1 text-xs text-muted-foreground">
												{formatMessageTimestamp(session.updatedAt)} · {session.messages.length}{' '}
												messages
											</p>
										</button>
										<button
											type="button"
											onClick={() => onDeleteSession(session.id)}
											className="btn-ghost rounded-lg p-2 hover:text-destructive"
											aria-label="Delete conversation"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								</li>
							)
						})}
					</ul>
				)}
			</div>
		</div>
	)
}
