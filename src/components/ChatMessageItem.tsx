import React, { useState, useRef } from 'react'
import {
	User,
	Bot,
	Copy,
	Check,
	ChevronDown,
	ChevronRight,
	Brain,
	Pencil,
	FileCode,
	Volume2,
	Square,
	TextSelect,
	Loader2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github-dark.css'
import type { ChatMessage } from '../types/chat'
import { imageAttachmentToDataUrl } from '../utils/fileAttachments'
import { formatMessageTimestamp } from '../utils/formatDate'
import { cn } from '../utils/cn'

interface ChatMessageItemProps {
	message: ChatMessage
	isLast: boolean
	isStreaming: boolean
	onRegenerate?: () => void
	onDelete?: (id: string) => void
	onEditPrompt?: (content: string) => void
}

function MessageActions({
	contentRef,
	text,
	className,
	onEdit,
	onListen,
	isSpeaking,
}: {
	contentRef: React.RefObject<HTMLElement | null>
	text: string
	className?: string
	onEdit?: () => void
	onListen?: () => void
	isSpeaking?: boolean
}) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(text)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			// Clipboard may fail in insecure contexts
		}
	}

	const handleSelectAll = () => {
		const element = contentRef.current
		if (!element) return
		const range = document.createRange()
		range.selectNodeContents(element)
		const selection = window.getSelection()
		selection?.removeAllRanges()
		selection?.addRange(range)
		element.focus({ preventScroll: true })
	}

	return (
		<div className={cn('flex items-center gap-1', className)}>
			{onEdit ? (
				<button
					type="button"
					onClick={onEdit}
					className="btn-ghost flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs"
				>
					<Pencil className="h-3.5 w-3.5" />
					Edit
				</button>
			) : null}
			{onListen ? (
				<button
					type="button"
					onClick={onListen}
					className={cn(
						'btn-ghost flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs',
						isSpeaking && 'text-primary',
					)}
				>
					{isSpeaking ? (
						<Square className="h-3.5 w-3.5" />
					) : (
						<Volume2 className="h-3.5 w-3.5" />
					)}
					Listen
				</button>
			) : null}
			<button
				type="button"
				onClick={handleCopy}
				className="btn-ghost flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs"
			>
				{copied ? (
					<Check className="h-3.5 w-3.5 text-emerald-400" />
				) : (
					<Copy className="h-3.5 w-3.5" />
				)}
				Copy
			</button>
			<button
				type="button"
				onClick={handleSelectAll}
				className="btn-ghost flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs"
			>
				<TextSelect className="h-3.5 w-3.5" />
				Select
			</button>
		</div>
	)
}

function MessageAvatar({ isUser }: { isUser: boolean }) {
	return (
		<div
			className={cn(
				'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
				isUser
					? 'bg-secondary text-secondary-foreground ring-1 ring-border'
					: 'bg-primary/15 text-primary',
			)}
			aria-hidden
		>
			{isUser ? (
				<User className="h-4 w-4" />
			) : (
				<Bot className="h-4 w-4" />
			)}
		</div>
	)
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
	message,
	isLast,
	isStreaming,
	onEditPrompt,
}) => {
	const [showThinking, setShowThinking] = useState(true)
	const [isEditing, setIsEditing] = useState(false)
	const [editedContent, setEditedContent] = useState(message.content)
	const [isSpeaking, setIsSpeaking] = useState(false)
	const contentRef = useRef<HTMLDivElement>(null)

	const isUser = message.role === 'user'
	const timestamp = formatMessageTimestamp(message.timestamp)
	const showStreaming = isStreaming && isLast && !isUser

	const handleListen = () => {
		if (isSpeaking) {
			window.speechSynthesis.cancel()
			setIsSpeaking(false)
			return
		}
		const utterance = new SpeechSynthesisUtterance(message.content)
		utterance.onend = () => setIsSpeaking(false)
		setIsSpeaking(true)
		window.speechSynthesis.speak(utterance)
	}

	const handleSaveEdit = () => {
		if (editedContent.trim() && onEditPrompt) {
			onEditPrompt(editedContent.trim())
			setIsEditing(false)
		}
	}

	return (
		<article
			className={cn(
				'min-w-0 max-w-full overflow-hidden border-b border-border/40 py-5 last:border-b-0',
				isUser ? 'flex justify-end' : 'flex justify-start',
			)}
		>
			<div
				className={cn(
					'flex min-w-0 max-w-full gap-3 md:gap-4',
					isUser ? 'w-full max-w-[88%] flex-row-reverse' : 'w-full',
				)}
			>
				<MessageAvatar isUser={isUser} />

				<div className={cn('min-w-0 flex-1', isUser && 'flex flex-col items-end')}>
					<div
						className={cn(
							'mb-1.5 flex flex-wrap items-center gap-2',
							isUser && 'justify-end',
						)}
					>
						<p className="text-xs font-medium text-muted-foreground">
							{isUser ? 'You' : 'J.A.R.V.I.S'}
						</p>
						<span className="text-xs text-muted-foreground/80">
							{showStreaming ? 'Now' : timestamp}
						</span>
					</div>

					{message.thinkingContent && !isUser ? (
						<div className="mb-3 w-full overflow-hidden rounded-xl border border-border surface-panel text-xs">
							<button
								type="button"
								onClick={() => setShowThinking(!showThinking)}
								className="flex w-full items-center justify-between px-3 py-2 text-muted-foreground"
							>
								<div className="flex items-center gap-2">
									<Brain className="h-3.5 w-3.5" />
									<span>Thought Process</span>
								</div>
								{showThinking ? (
									<ChevronDown className="h-3.5 w-3.5" />
								) : (
									<ChevronRight className="h-3.5 w-3.5" />
								)}
							</button>
							{showThinking ? (
								<div className="max-h-48 overflow-y-auto border-t border-border px-3 py-2 font-mono text-[10px] whitespace-pre-wrap text-muted-foreground">
									{message.thinkingContent}
								</div>
							) : null}
						</div>
					) : null}

					<div
						className={cn(
							'min-w-0 max-w-full overflow-hidden',
							isUser &&
								'rounded-[1.25rem] bg-secondary px-4 py-3 ring-1 ring-border/60',
							isUser && isEditing && 'ring-2 ring-primary/50',
						)}
					>
						{isEditing ? (
							<div className="space-y-2">
								<textarea
									value={editedContent}
									onChange={(e) => setEditedContent(e.target.value)}
									className="surface-input w-full resize-none rounded-xl p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
									rows={3}
								/>
								<div className="flex justify-end gap-2">
									<button
										type="button"
										onClick={() => setIsEditing(false)}
										className="text-xs text-muted-foreground px-3 py-1"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={handleSaveEdit}
										className="btn-primary rounded-lg px-3 py-1 text-xs font-medium"
									>
										Save
									</button>
								</div>
							</div>
						) : (
							<div
								ref={contentRef}
								tabIndex={-1}
								className={cn(
									'chat-message-content outline-none',
									isUser
										? 'text-sm leading-relaxed whitespace-pre-wrap'
										: 'chat-markdown text-[0.9375rem] leading-7',
								)}
							>
								{isUser ? (
									<>
										<p className="whitespace-pre-wrap break-words">{message.content}</p>
										{message.fileAttachments && message.fileAttachments.length > 0 ? (
											<div className="mt-3 flex flex-wrap gap-2">
												{message.fileAttachments.map((file, idx) => (
													<div key={idx}>
														{file.kind === 'image' ? (
															<img
																src={imageAttachmentToDataUrl(file)}
																alt={file.name}
																className="max-h-32 rounded-xl"
															/>
														) : (
															<div className="inline-flex items-center gap-2 rounded-xl bg-card px-3 py-1.5 text-xs ring-1 ring-border">
																<FileCode className="h-3.5 w-3.5 text-primary" />
																<span>{file.name}</span>
															</div>
														)}
													</div>
												))}
											</div>
										) : null}
									</>
								) : !message.content && showStreaming ? (
									<span className="inline-flex items-center gap-2 text-muted-foreground">
										<Loader2 className="h-4 w-4 animate-spin" />
										Thinking…
									</span>
								) : message.content ? (
									<ReactMarkdown
										remarkPlugins={[remarkGfm]}
										components={{
											table: ({ children }) => (
												<div className="markdown-table-scroll">
													<table>{children}</table>
												</div>
											),
											code({ className, children, ...props }) {
												const match = /language-(\w+)/.exec(className || '')
												if (!match && !String(children).includes('\n')) {
													return (
														<code className={className} {...props}>
															{children}
														</code>
													)
												}
												return (
													<div className="chat-code-block">
														<pre>
															<code className={className}>{children}</code>
														</pre>
													</div>
												)
											},
										}}
									>
										{message.content}
									</ReactMarkdown>
								) : null}

								{showStreaming && message.content ? (
									<span
										className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle"
									/>
								) : null}
							</div>
						)}
					</div>

					{!showStreaming && !isEditing ? (
						<MessageActions
							contentRef={contentRef}
							text={message.content}
							className={cn('mt-2', isUser && 'justify-end')}
							onEdit={
								isUser && onEditPrompt
									? () => {
											setIsEditing(true)
											setEditedContent(message.content)
										}
									: undefined
							}
							onListen={!isUser && message.content.trim() ? handleListen : undefined}
							isSpeaking={isSpeaking}
						/>
					) : null}
				</div>
			</div>
		</article>
	)
}
