import React, { useState, useRef, useEffect } from 'react'
import { Plus, Mic, ArrowUp, Square, X, FileText, Paperclip, Loader2 } from 'lucide-react'
import type { FileAttachment, LocalModel, ChatSettings } from '../types/chat'
import { readFileAsAttachment } from '../utils/fileAttachments'

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
			textareaRef.current.style.height = 'auto'
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
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
		<div className="shrink-0 px-3 pt-2 pb-2 bg-[var(--jarvis-bg)]">
			{uploadError && (
				<p className="text-[10px] text-rose-400 mb-2 px-1">{uploadError}</p>
			)}

			{attachments.length > 0 && (
				<div className="flex flex-wrap gap-2 mb-2 px-1">
					{attachments.map((file, idx) => (
						<div
							key={idx}
							className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--jarvis-surface)] text-xs text-[var(--jarvis-text)] border border-[var(--jarvis-border)]"
						>
							<FileText className="w-3.5 h-3.5 text-[var(--jarvis-accent)]" />
							<span className="truncate max-w-[120px]">{file.name}</span>
							<button type="button" onClick={() => setAttachments((p) => p.filter((_, i) => i !== idx))}>
								<X className="w-3.5 h-3.5 text-[var(--jarvis-muted)]" />
							</button>
						</div>
					))}
				</div>
			)}

			<div className="flex items-center gap-2">
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleFileUpload}
					multiple
					accept=".png,.jpg,.jpeg,.gif,.webp,.bmp,.txt,.md,.markdown,.json,.csv,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.yaml,.yml,.log,.sql,.pdf,.docx,text/*,image/*,application/json,application/pdf"
					className="hidden"
				/>

				<button
					type="button"
					onClick={() => {
						setMenuOpen((o) => !o)
						if (!menuOpen) fileInputRef.current?.click()
					}}
					disabled={disabled || isReadingFiles}
					className="w-10 h-10 shrink-0 rounded-full border border-[var(--jarvis-border)] bg-[var(--jarvis-surface)] flex items-center justify-center text-[var(--jarvis-muted)] hover:text-[var(--jarvis-text)] transition-colors disabled:opacity-40"
					aria-label="Add attachment"
				>
					{isReadingFiles ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" strokeWidth={1.75} />}
				</button>

				<button
					type="button"
					disabled={disabled}
					className="w-10 h-10 shrink-0 rounded-full border border-[var(--jarvis-border)] bg-[var(--jarvis-surface)] flex items-center justify-center text-[var(--jarvis-muted)] hover:text-[var(--jarvis-text)] transition-colors disabled:opacity-40"
					aria-label="Voice input"
					title="Voice input (coming soon)"
				>
					<Mic className="w-5 h-5" strokeWidth={1.75} />
				</button>

				<div className="flex-1 min-w-0 rounded-2xl border border-[var(--jarvis-border)] bg-[var(--jarvis-surface)] px-4 py-2.5">
					<textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Message..."
						disabled={disabled || isReadingFiles}
						rows={1}
						className="w-full bg-transparent text-[var(--jarvis-text)] placeholder-[var(--jarvis-muted)] text-sm resize-none focus:outline-none max-h-28"
					/>
				</div>

				{isStreaming ? (
					<button
						type="button"
						onClick={onStopStreaming}
						className="w-10 h-10 shrink-0 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400"
						aria-label="Stop"
					>
						<Square className="w-4 h-4 fill-current" />
					</button>
				) : (
					<button
						type="button"
						onClick={handleSubmit}
						disabled={disabled || isReadingFiles || (!input.trim() && attachments.length === 0)}
						className="w-10 h-10 shrink-0 rounded-full bg-[var(--jarvis-accent)] flex items-center justify-center text-white disabled:opacity-40 disabled:bg-[var(--jarvis-surface)] disabled:text-[var(--jarvis-muted)] transition-opacity"
						aria-label="Send"
					>
						<ArrowUp className="w-5 h-5" strokeWidth={2} />
					</button>
				)}
			</div>

			{menuOpen && (
				<div className="mt-2 px-1">
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="flex items-center gap-2 text-xs text-[var(--jarvis-muted)] hover:text-[var(--jarvis-text)]"
					>
						<Paperclip className="w-3.5 h-3.5" />
						Attach file
					</button>
				</div>
			)}
		</div>
	)
}
