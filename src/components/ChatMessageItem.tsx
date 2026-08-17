import React, { useState } from 'react'
import {
	User,
	Bot,
	Copy,
	Check,
	ChevronDown,
	ChevronRight,
	Brain,
	Edit2,
	FileCode,
	Volume2,
	List,
	Loader2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github-dark.css'
import type { ChatMessage } from '../types/chat'
import { imageAttachmentToDataUrl } from '../utils/fileAttachments'
import { formatMessageTimestamp } from '../utils/formatDate'

interface ChatMessageItemProps {
	message: ChatMessage
	isLast: boolean
	isStreaming: boolean
	onRegenerate?: () => void
	onDelete?: (id: string) => void
	onEditPrompt?: (content: string) => void
}

const ActionButton: React.FC<{
	icon: React.ReactNode
	label: string
	onClick: () => void
}> = ({ icon, label, onClick }) => (
	<button
		type="button"
		onClick={onClick}
		className="flex flex-col items-center gap-1 text-[var(--jarvis-muted)] hover:text-[var(--jarvis-text)] transition-colors min-w-[3rem]"
	>
		{icon}
		<span className="text-[10px] font-medium">{label}</span>
	</button>
)

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
	message,
	isLast,
	isStreaming,
	onEditPrompt,
}) => {
	const [copiedText, setCopiedText] = useState(false)
	const [showThinking, setShowThinking] = useState(true)
	const [isEditing, setIsEditing] = useState(false)
	const [editedContent, setEditedContent] = useState(message.content)
	const [isSpeaking, setIsSpeaking] = useState(false)

	const isUser = message.role === 'user'
	const timestamp = formatMessageTimestamp(message.timestamp)

	const handleCopyMessage = () => {
		navigator.clipboard.writeText(message.content)
		setCopiedText(true)
		setTimeout(() => setCopiedText(false), 2000)
	}

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

	const handleSelect = () => {
		const selection = window.getSelection()
		const el = document.getElementById(`msg-content-${message.id}`)
		if (selection && el) {
			const range = document.createRange()
			range.selectNodeContents(el)
			selection.removeAllRanges()
			selection.addRange(range)
		}
	}

	const handleSaveEdit = () => {
		if (editedContent.trim() && onEditPrompt) {
			onEditPrompt(editedContent.trim())
			setIsEditing(false)
		}
	}

	if (isUser) {
		return (
			<div className="px-4 py-5">
				<div className="flex items-center justify-end gap-2 mb-2">
					<span className="text-xs text-[var(--jarvis-muted)]">You {timestamp}</span>
					<div className="w-9 h-9 rounded-full bg-[var(--jarvis-surface)] border border-[var(--jarvis-border)] flex items-center justify-center shrink-0">
						<User className="w-4 h-4 text-[var(--jarvis-muted)]" strokeWidth={1.75} />
					</div>
				</div>

				{isEditing ? (
					<div className="ml-auto max-w-[90%] space-y-2">
						<textarea
							value={editedContent}
							onChange={(e) => setEditedContent(e.target.value)}
							className="w-full p-3 rounded-2xl bg-[var(--jarvis-surface)] border border-[var(--jarvis-accent)] text-[var(--jarvis-text)] text-sm resize-none"
							rows={3}
						/>
						<div className="flex justify-end gap-2">
							<button type="button" onClick={() => setIsEditing(false)} className="text-xs text-[var(--jarvis-muted)] px-3 py-1">
								Cancel
							</button>
							<button type="button" onClick={handleSaveEdit} className="text-xs text-white bg-[var(--jarvis-accent)] px-3 py-1 rounded-lg">
								Save
							</button>
						</div>
					</div>
				) : (
					<div className="ml-auto max-w-[90%] rounded-2xl px-4 py-3 bg-[var(--jarvis-bubble)] text-[var(--jarvis-text)] text-sm leading-relaxed">
						<p className="whitespace-pre-wrap break-words">{message.content}</p>
					</div>
				)}

				{message.fileAttachments && message.fileAttachments.length > 0 && (
					<div className="flex flex-wrap gap-2 justify-end mt-2 max-w-[90%] ml-auto">
						{message.fileAttachments.map((file, idx) => (
							<div key={idx}>
								{file.kind === 'image' ? (
									<img src={imageAttachmentToDataUrl(file)} alt={file.name} className="max-h-32 rounded-xl" />
								) : (
									<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--jarvis-surface)] text-xs">
										<FileCode className="w-3.5 h-3.5 text-[var(--jarvis-accent)]" />
										<span>{file.name}</span>
									</div>
								)}
							</div>
						))}
					</div>
				)}

				<div className="flex justify-end gap-4 mt-3 pr-1">
					{onEditPrompt && (
						<ActionButton
							icon={<Edit2 className="w-4 h-4" strokeWidth={1.75} />}
							label="Edit"
							onClick={() => setIsEditing(true)}
						/>
					)}
					<ActionButton
						icon={copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" strokeWidth={1.75} />}
						label="Copy"
						onClick={handleCopyMessage}
					/>
					<ActionButton
						icon={<List className="w-4 h-4" strokeWidth={1.75} />}
						label="Select"
						onClick={handleSelect}
					/>
				</div>
			</div>
		)
	}

	return (
		<div className="px-4 py-5">
			<div className="flex items-center gap-2 mb-2">
				<div className="w-9 h-9 rounded-full bg-[var(--jarvis-accent)] flex items-center justify-center shrink-0">
					<Bot className="w-4 h-4 text-white" strokeWidth={1.75} />
				</div>
				<span className="text-xs text-[var(--jarvis-muted)]">J.A.R.V.I.S {timestamp}</span>
			</div>

			{!message.content && !message.thinkingContent && isStreaming && isLast && (
				<div className="flex items-center gap-2 text-xs text-[var(--jarvis-muted)] py-2">
					<Loader2 className="w-4 h-4 animate-spin" />
					<span>Thinking...</span>
				</div>
			)}

			{message.thinkingContent && (
				<div className="mb-3 rounded-xl border border-[var(--jarvis-border)] bg-[var(--jarvis-surface)] overflow-hidden text-xs">
					<button
						type="button"
						onClick={() => setShowThinking(!showThinking)}
						className="w-full flex items-center justify-between px-3 py-2 text-[var(--jarvis-muted)]"
					>
						<div className="flex items-center gap-2">
							<Brain className="w-3.5 h-3.5" />
							<span>Thought Process</span>
						</div>
						{showThinking ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
					</button>
					{showThinking && (
						<div className="px-3 py-2 border-t border-[var(--jarvis-border)] text-[var(--jarvis-muted)] font-mono text-[10px] whitespace-pre-wrap max-h-48 overflow-y-auto">
							{message.thinkingContent}
						</div>
					)}
				</div>
			)}

			{message.content && (
				<div
					id={`msg-content-${message.id}`}
					className="prose prose-invert jarvis-prose max-w-full text-[var(--jarvis-text)] text-sm leading-relaxed"
				>
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
										<code className="px-1 py-0.5 rounded bg-[var(--jarvis-surface)] text-[var(--jarvis-accent)] font-mono text-xs" {...props}>
											{children}
										</code>
									)
								}
								return (
									<pre className="rounded-xl bg-[var(--jarvis-surface)] p-3 overflow-x-auto text-xs">
										<code className={className}>{children}</code>
									</pre>
								)
							},
						}}
					>
						{message.content}
					</ReactMarkdown>
				</div>
			)}

			{isStreaming && isLast && message.content && (
				<span className="inline-block w-1.5 h-4 ml-0.5 bg-[var(--jarvis-accent)] animate-pulse rounded-sm align-middle" />
			)}

			<div className="flex gap-4 mt-4">
				<ActionButton
					icon={<Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-[var(--jarvis-accent)]' : ''}`} strokeWidth={1.75} />}
					label="Listen"
					onClick={handleListen}
				/>
				<ActionButton
					icon={copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" strokeWidth={1.75} />}
					label="Copy"
					onClick={handleCopyMessage}
				/>
				<ActionButton
					icon={<List className="w-4 h-4" strokeWidth={1.75} />}
					label="Select"
					onClick={handleSelect}
				/>
			</div>
		</div>
	)
}
