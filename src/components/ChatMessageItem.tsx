import React, { useState } from 'react'
import {
	User,
	Bot,
	Copy,
	Check,
	ChevronDown,
	ChevronRight,
	Brain,
	RotateCcw,
	Trash2,
	Edit2,
	FileCode,
	Zap,
	Loader2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import type { ChatMessage } from '../types/chat'
import { imageAttachmentToDataUrl, isExtractedDocumentName } from '../utils/fileAttachments'
import { cn } from '../utils/cn'

interface ChatMessageItemProps {
	message: ChatMessage
	isLast: boolean
	isStreaming: boolean
	onRegenerate?: () => void
	onDelete?: (id: string) => void
	onEditPrompt?: (content: string) => void
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
	message,
	isLast,
	isStreaming,
	onRegenerate,
	onDelete,
	onEditPrompt,
}) => {
	const [copiedText, setCopiedText] = useState(false)
	const [showThinking, setShowThinking] = useState(true)
	const [isEditing, setIsEditing] = useState(false)
	const [editedContent, setEditedContent] = useState(message.content)

	const isUser = message.role === 'user'

	const handleCopyMessage = () => {
		navigator.clipboard.writeText(message.content)
		setCopiedText(true)
		setTimeout(() => setCopiedText(false), 2000)
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
				'group relative border-b border-border/40 px-4 py-5 transition-colors sm:px-6',
				isUser ? 'flex justify-end' : 'flex justify-start',
			)}
		>
			<div
				className={cn(
					'flex w-full min-w-0 max-w-3xl items-start gap-3 md:gap-4',
					isUser && 'max-w-[88%] flex-row-reverse',
				)}
			>
				<div
					className={cn(
						'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
						isUser
							? 'bg-secondary text-secondary-foreground ring-1 ring-border'
							: 'bg-primary/15 text-primary',
					)}
					aria-hidden
				>
					{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
				</div>

				<div className={cn('min-w-0 flex-1 space-y-3', isUser && 'flex flex-col items-end')}>
					<div
						className={cn(
							'flex items-center justify-between gap-2',
							isUser && 'w-full flex-row-reverse',
						)}
					>
						<div className="flex items-center gap-2">
							<span className="text-xs font-medium text-muted-foreground">
								{isUser ? 'You' : message.model || 'J.A.R.V.I.S'}
							</span>
							{!isUser && message.tokensPerSec ? (
								<span
									className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[8px] text-primary"
								>
									<Zap className="h-3 w-3" />
									{message.tokensPerSec} t/s
									{message.durationMs
										? ` • ${(message.durationMs / 1000).toFixed(1)}s`
										: ''}
								</span>
							) : null}
						</div>

						<div
							className={cn(
								'flex items-center gap-1 text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100',
								isUser && 'flex-row-reverse',
							)}
						>
							<button
								type="button"
								onClick={handleCopyMessage}
								className="btn-ghost rounded p-1"
								title="Copy message"
							>
								{copiedText ? (
									<Check className="h-3.5 w-3.5 text-emerald-400" />
								) : (
									<Copy className="h-3.5 w-3.5" />
								)}
							</button>

							{isUser && onEditPrompt ? (
								<button
									type="button"
									onClick={() => setIsEditing(!isEditing)}
									className="btn-ghost rounded p-1"
									title="Edit prompt"
								>
									<Edit2 className="h-3.5 w-3.5" />
								</button>
							) : null}

							{!isUser && onRegenerate && !isStreaming ? (
								<button
									type="button"
									onClick={onRegenerate}
									className="btn-ghost rounded p-1"
									title="Regenerate response"
								>
									<RotateCcw className="h-3.5 w-3.5" />
								</button>
							) : null}

							{onDelete ? (
								<button
									type="button"
									onClick={() => onDelete(message.id)}
									className="btn-ghost rounded p-1 hover:text-destructive"
									title="Delete message"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							) : null}
						</div>
					</div>

					{message.fileAttachments && message.fileAttachments.length > 0 ? (
						<div className={cn('flex flex-wrap gap-2', isUser && 'justify-end')}>
							{message.fileAttachments.map((file, idx) => (
								<div key={idx}>
									{file.kind === 'image' ? (
										<div className="surface-panel max-w-xs rounded-xl p-2">
											<img
												src={imageAttachmentToDataUrl(file)}
												alt={file.name}
												className="max-h-40 rounded-lg object-contain"
											/>
											<p className="mt-1 truncate text-[8px] text-muted-foreground">
												{file.name}
											</p>
										</div>
									) : (
										<div className="surface-panel inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs">
											<FileCode className="h-3.5 w-3.5 shrink-0 text-primary" />
											<span className="font-medium">{file.name}</span>
											{isExtractedDocumentName(file.name) ? (
												<span className="text-[8px] text-primary">extracted text</span>
											) : null}
											<span className="text-[8px] text-muted-foreground">
												({Math.round(file.size / 1024)} KB)
											</span>
										</div>
									)}
								</div>
							))}
						</div>
					) : null}

					{isEditing ? (
						<div className="w-full space-y-2">
							<textarea
								value={editedContent}
								onChange={(e) => setEditedContent(e.target.value)}
								className="surface-input w-full resize-none rounded-xl p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								rows={3}
							/>
							<div className="flex justify-end gap-2 text-xs">
								<button
									type="button"
									onClick={() => setIsEditing(false)}
									className="btn-ghost rounded-lg px-3 py-1.5"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleSaveEdit}
									className="btn-primary rounded-lg px-3 py-1.5 font-medium"
								>
									Save & Submit
								</button>
							</div>
						</div>
					) : (
						<>
							{!isUser &&
							isStreaming &&
							isLast &&
							!message.content &&
							!message.thinkingContent ? (
								<div
									className="my-1 flex animate-pulse items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 font-mono text-xs text-primary"
								>
									<Loader2 className="h-4 w-4 shrink-0 animate-spin" />
									<span>Loading model into memory & initializing generation...</span>
								</div>
							) : null}

							{message.thinkingContent ? (
								<div className="surface-panel my-2 w-full overflow-hidden rounded-xl text-xs">
									<button
										type="button"
										onClick={() => setShowThinking(!showThinking)}
										className="flex w-full items-center justify-between px-3.5 py-2 text-muted-foreground transition-colors hover:text-foreground"
									>
										<div className="flex items-center gap-2 font-medium">
											<Brain className="h-3.5 w-3.5 text-purple-400" />
											<span>Thought Process</span>
											{isStreaming && isLast && !message.content ? (
												<span className="flex items-center gap-1 font-mono text-[8px] text-purple-300">
													<span className="h-2 w-2 animate-ping rounded-full bg-purple-400" />
													Thinking...
												</span>
											) : null}
										</div>
										{showThinking ? (
											<ChevronDown className="h-3.5 w-3.5" />
										) : (
											<ChevronRight className="h-3.5 w-3.5" />
										)}
									</button>

									{showThinking ? (
										<div
											className="max-h-60 overflow-y-auto border-t border-border/60 bg-background/40 p-3.5 font-mono text-[9px] leading-relaxed whitespace-pre-wrap text-muted-foreground"
										>
											{message.thinkingContent}
										</div>
									) : null}
								</div>
							) : null}

							{message.content ? (
								<div
									className={cn(
										'min-w-0 max-w-full',
										isUser &&
											'rounded-[1.25rem] bg-secondary px-4 py-3 ring-1 ring-border/60',
									)}
								>
									{isUser ? (
										<p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
											{message.content}
										</p>
									) : (
										<div className="chat-markdown text-[0.9375rem] leading-7">
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
														const lang = match ? match[1] : ''
														const codeString = String(children).replace(/\n$/, '')

														if (!match && !String(children).includes('\n')) {
															return (
																<code className={className} {...props}>
																	{children}
																</code>
															)
														}

														let highlighted = codeString
														if (lang && hljs.getLanguage(lang)) {
															try {
																highlighted = hljs.highlight(codeString, {
																	language: lang,
																}).value
															} catch {
																highlighted = codeString
															}
														}

														return (
															<CodeBlock
																code={codeString}
																language={lang}
																highlightedHtml={highlighted}
															/>
														)
													},
												}}
											>
												{message.content}
											</ReactMarkdown>
										</div>
									)}
								</div>
							) : null}

							{isStreaming &&
							isLast &&
							!isUser &&
							(message.content || message.thinkingContent) ? (
								<span
									className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle"
								/>
							) : null}
						</>
					)}
				</div>
			</div>
		</article>
	)
}

const CodeBlock: React.FC<{ code: string; language: string; highlightedHtml?: string }> = ({
	code,
	language,
	highlightedHtml,
}) => {
	const [copied, setCopied] = useState(false)

	const handleCopyCode = () => {
		navigator.clipboard.writeText(code)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="chat-code-block my-4 overflow-hidden">
			<div
				className="flex items-center justify-between border-b border-border bg-background/40 px-4 py-2 text-xs text-muted-foreground"
			>
				<span className="font-mono font-semibold uppercase tracking-wider text-foreground">
					{language || 'code'}
				</span>
				<button
					type="button"
					onClick={handleCopyCode}
					className="btn-ghost flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1"
				>
					{copied ? (
						<>
							<Check className="h-3.5 w-3.5 text-emerald-400" />
							<span className="text-[9px] font-medium text-emerald-400">Copied!</span>
						</>
					) : (
						<>
							<Copy className="h-3.5 w-3.5" />
							<span className="text-[9px]">Copy code</span>
						</>
					)}
				</button>
			</div>
			<div className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground">
				{highlightedHtml ? (
					<pre>
						<code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
					</pre>
				) : (
					<pre>
						<code>{code}</code>
					</pre>
				)}
			</div>
		</div>
	)
}
