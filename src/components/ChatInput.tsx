import React, { useState, useRef, useEffect } from 'react'
import { Plus, Mic, ArrowUp, Square, X, FileText, Paperclip, Loader2 } from 'lucide-react'
import type { FileAttachment, LocalModel, ChatSettings } from '../types/chat'
import { readFileAsAttachment } from '../utils/fileAttachments'
import { cn } from '../utils/cn'

interface ChatInputProps {
	onSendMessage: (text: string, files: FileAttachment[]) => void
	isStreaming: boolean
	onStopStreaming: () => void
	selectedModel: string
	models: LocalModel[]
	onSelectModel: (modelName: string) => void
	settings: ChatSettings
	onUpdateSettings: (newSettings: Partial<ChatSettings>) => void
	disabled?: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({
	onSendMessage,
	isStreaming,
	onStopStreaming,
	disabled = false,
}) => {
	const [input, setInput] = useState('')
	const [attachments, setAttachments] = useState<FileAttachment[]>([])
	const [uploadError, setUploadError] = useState('')
	const [isReadingFiles, setIsReadingFiles] = useState(false)
	const [menuOpen, setMenuOpen] = useState(false)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = '0px'
			const maxHeight = 128
			const nextHeight = Math.min(textareaRef.current.scrollHeight, maxHeight)
			textareaRef.current.style.height = `${nextHeight}px`
			textareaRef.current.style.overflowY =
				textareaRef.current.scrollHeight > maxHeight ? 'auto' : 'hidden'
		}
	}, [input])

	const handleSubmit = () => {
		if ((!input.trim() && attachments.length === 0) || isStreaming || disabled || isReadingFiles) return
		onSendMessage(input.trim(), attachments)
		setInput('')
		setAttachments([])
		setUploadError('')
		if (textareaRef.current) textareaRef.current.style.height = 'auto'
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
	}

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files?.length) return
		setIsReadingFiles(true)
		setUploadError('')
		for (const file of Array.from(files)) {
			try {
				const attachment = await readFileAsAttachment(file)
				setAttachments((prev) => [...prev, attachment])
			} catch (err) {
				setUploadError(err instanceof Error ? err.message : 'Failed to read file')
			}
		}
		setIsReadingFiles(false)
		if (fileInputRef.current) fileInputRef.current.value = ''
		setMenuOpen(false)
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				handleSubmit()
			}}
			className="chat-input-bar relative z-30 w-full max-w-full shrink-0 overflow-visible border-t border-border px-3 py-2.5 md:px-8 md:py-4"
		>
			{uploadError ? (
				<p className="mx-auto mb-2 max-w-3xl text-xs text-destructive">{uploadError}</p>
			) : null}

			{attachments.length > 0 ? (
				<div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
					{attachments.map((file, idx) => (
						<div
							key={idx}
							className="surface-panel flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
						>
							<FileText className="h-3.5 w-3.5 text-primary shrink-0" />
							<span className="max-w-[10rem] truncate">{file.name}</span>
							<button
								type="button"
								className="text-muted-foreground hover:text-foreground"
								onClick={() => setAttachments((p) => p.filter((_, i) => i !== idx))}
								aria-label={`Remove ${file.name}`}
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
					))}
				</div>
			) : null}

			<div className="relative mx-auto w-full min-w-0 max-w-3xl">
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleFileUpload}
					multiple
					accept=".png,.jpg,.jpeg,.gif,.webp,.bmp,.txt,.md,.markdown,.json,.csv,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.yaml,.yml,.log,.sql,.pdf,.docx,text/*,image/*,application/json,application/pdf"
					className="hidden"
				/>

				<div className="surface-glass flex items-end gap-2 rounded-2xl p-2 shadow-sm border-border">
					<button
						type="button"
						onClick={() => {
							setMenuOpen((o) => !o)
							if (!menuOpen) fileInputRef.current?.click()
						}}
						disabled={disabled || isReadingFiles}
						className="btn-ghost flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border disabled:opacity-40"
						aria-label="Add attachment"
					>
						{isReadingFiles ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Plus className="h-4 w-4" />
						)}
					</button>

					<button
						type="button"
						disabled={disabled}
						className="btn-ghost flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border disabled:opacity-40"
						aria-label="Voice input"
						title="Voice input (coming soon)"
					>
						<Mic className="h-4 w-4" />
					</button>

					<textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Message…"
						disabled={disabled || isReadingFiles}
						rows={1}
						className="max-h-32 min-h-[40px] flex-1 resize-none overflow-hidden bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60 md:min-h-[44px] md:px-3"
					/>

					{isStreaming ? (
						<button
							type="button"
							onClick={onStopStreaming}
							className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground"
							aria-label="Stop"
						>
							<Square className="h-4 w-4" />
						</button>
					) : (
						<button
							type="submit"
							disabled={
								disabled || isReadingFiles || (!input.trim() && attachments.length === 0)
							}
							className={cn(
								'btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-md disabled:opacity-40',
								'disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none',
							)}
							aria-label="Send message"
						>
							<ArrowUp className="h-4 w-4" />
						</button>
					)}
				</div>
			</div>

			{menuOpen ? (
				<div className="mx-auto mt-2 max-w-3xl px-1">
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
					>
						<Paperclip className="h-3.5 w-3.5" />
						Attach file
					</button>
				</div>
			) : null}
		</form>
	)
}
