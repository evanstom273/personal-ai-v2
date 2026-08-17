import React, { useState, useRef, useEffect } from 'react'
import {
	Send,
	Square,
	X,
	FileText,
	Plus,
	Paperclip,
	Sparkles,
	Brain,
	Zap,
	ChevronRight,
	Loader2,
} from 'lucide-react'
import type { FileAttachment, LocalModel, ChatSettings } from '../types/chat'
import { ModelPickerList } from './ModelPicker'
import { readFileAsAttachment } from '../utils/fileAttachments'
import { cn } from '../utils/cn'

type MenuView = 'main' | 'models'

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
	selectedModel,
	models,
	onSelectModel,
	settings,
	onUpdateSettings,
	disabled = false,
}) => {
	const [input, setInput] = useState('')
	const [attachments, setAttachments] = useState<FileAttachment[]>([])
	const [uploadError, setUploadError] = useState('')
	const [isReadingFiles, setIsReadingFiles] = useState(false)
	const [menuOpen, setMenuOpen] = useState(false)
	const [menuView, setMenuView] = useState<MenuView>('main')
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)

	const activeModel = models.find((m) => m.name === selectedModel)

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = '0px'
			const maxHeight = 200
			const nextHeight = Math.min(textareaRef.current.scrollHeight, maxHeight)
			textareaRef.current.style.height = `${nextHeight}px`
			textareaRef.current.style.overflowY =
				textareaRef.current.scrollHeight > maxHeight ? 'auto' : 'hidden'
		}
	}, [input])

	useEffect(() => {
		if (!menuOpen) return
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false)
				setMenuView('main')
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [menuOpen])

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		}
	}

	const handleSubmit = () => {
		if ((!input.trim() && attachments.length === 0) || isStreaming || disabled || isReadingFiles) {
			return
		}

		onSendMessage(input.trim(), attachments)
		setInput('')
		setAttachments([])
		setUploadError('')

		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}
	}

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files || files.length === 0) return

		setIsReadingFiles(true)
		setUploadError('')

		for (const file of Array.from(files)) {
			try {
				const attachment = await readFileAsAttachment(file)
				setAttachments((prev) => [...prev, attachment])
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to read file'
				setUploadError(message)
			}
		}

		setIsReadingFiles(false)

		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}

		setMenuOpen(false)
		setMenuView('main')
	}

	const removeAttachment = (index: number) => {
		setAttachments((prev) => prev.filter((_, i) => i !== index))
	}

	const openMenu = () => {
		setMenuOpen((open) => {
			if (open) {
				setMenuView('main')
				return false
			}
			setMenuView('main')
			return true
		})
	}

	const canSend = !isReadingFiles && (input.trim() || attachments.length > 0)

	return (
		<div
			className="chat-input-bar shrink-0 w-full border-t border-border pb-[max(0.5rem,env(safe-area-inset-bottom))]"
		>
			<div className="mx-auto w-full max-w-3xl px-3 pt-2 pb-3 md:px-8">
				<div
					className="surface-glass relative rounded-2xl transition-all focus-within:ring-1 focus-within:ring-primary/40"
				>
					{uploadError ? (
						<div className="border-b border-destructive/20 bg-destructive/10 px-3 pt-3 text-[9px] text-destructive">
							{uploadError}
						</div>
					) : null}

					{attachments.length > 0 ? (
						<div className="flex flex-wrap gap-2 border-b border-border/60 p-3 pb-0">
							{attachments.map((file, idx) => (
								<div
									key={idx}
									className="surface-panel inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
								>
									<FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
									<span className="max-w-[120px] truncate font-medium">{file.name}</span>
									<span className="shrink-0 text-[8px] text-muted-foreground">
										({Math.round(file.size / 1024)} KB)
									</span>
									<button
										type="button"
										onClick={() => removeAttachment(idx)}
										className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								</div>
							))}
						</div>
					) : null}

					<div className="flex items-end px-2 py-2 sm:px-3 sm:py-2.5 min-w-0">
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileUpload}
							multiple
							accept=".png,.jpg,.jpeg,.gif,.webp,.bmp,.txt,.md,.markdown,.json,.csv,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.yaml,.yml,.log,.sql,.pdf,.docx,text/*,image/*,application/json,application/pdf"
							className="hidden"
						/>

						<div className="relative mb-0.5 shrink-0" ref={menuRef}>
							<button
								type="button"
								onClick={openMenu}
								className={cn(
									'btn-ghost rounded-xl p-2 transition-colors',
									menuOpen && 'bg-accent text-primary',
								)}
								title="More options"
								aria-expanded={menuOpen}
								aria-haspopup="menu"
							>
								<Plus
									className={cn(
										'h-5 w-5 transition-transform',
										menuOpen && 'rotate-45',
									)}
								/>
							</button>

							{menuOpen ? (
								<div
									className="surface-popover absolute bottom-full left-0 z-50 mb-2 w-[min(100vw-1.5rem,18rem)] overflow-hidden rounded-2xl"
									role="menu"
								>
									{menuView === 'main' ? (
										<div className="py-1">
											<button
												type="button"
												role="menuitem"
												onClick={() => fileInputRef.current?.click()}
												disabled={isReadingFiles}
												className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-60"
											>
												{isReadingFiles ? (
													<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
												) : (
													<Paperclip className="h-4 w-4 text-muted-foreground" />
												)}
												<span>Attach file</span>
											</button>

											<button
												type="button"
												role="menuitem"
												onClick={() => setMenuView('models')}
												className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
											>
												<Sparkles className="h-4 w-4 text-primary" />
												<div className="min-w-0 flex-1 text-left">
													<span className="block text-[9px] text-muted-foreground">Model</span>
													<span className="truncate font-medium">{selectedModel}</span>
												</div>
												<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
											</button>

											<button
												type="button"
												role="menuitem"
												onClick={() =>
													onUpdateSettings({ enableThinking: !settings.enableThinking })
												}
												className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
											>
												{settings.enableThinking ? (
													<Brain className="h-4 w-4 text-purple-400" />
												) : (
													<Zap className="h-4 w-4 text-amber-400" />
												)}
												<div className="flex-1 text-left">
													<span className="block text-[9px] text-muted-foreground">
														Reasoning
													</span>
													<span className="font-medium">
														{settings.enableThinking ? 'Thinking mode' : 'Fast mode'}
													</span>
												</div>
												<span
													className={cn(
														'rounded-full border px-2 py-0.5 text-[8px] font-semibold',
														settings.enableThinking
															? 'border-purple-500/30 bg-purple-500/10 text-purple-300'
															: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
													)}
												>
													{settings.enableThinking ? 'ON' : 'OFF'}
												</span>
											</button>
										</div>
									) : (
										<ModelPickerList
											models={models}
											selectedModel={selectedModel}
											onSelectModel={onSelectModel}
											onClose={() => {
												setMenuOpen(false)
												setMenuView('main')
											}}
										/>
									)}
								</div>
							) : null}
						</div>

						<div className="relative mb-0.5 min-w-0 shrink flex-1">
							<textarea
								ref={textareaRef}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder={`Message ${selectedModel}...`}
								disabled={disabled || isReadingFiles}
								rows={1}
								className="max-h-48 w-full min-w-[6rem] resize-none border-0 bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
							/>
						</div>

						<div className="mb-0.5 ml-1 shrink-0">
							{isStreaming ? (
								<button
									type="button"
									onClick={onStopStreaming}
									className="flex cursor-pointer items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/20 p-2.5 text-rose-400 transition-all hover:bg-rose-500/30"
									title="Stop generation"
								>
									<Square className="h-4 w-4 fill-rose-400" />
								</button>
							) : (
								<button
									type="button"
									onClick={handleSubmit}
									disabled={!canSend}
									className={cn(
										'flex cursor-pointer items-center justify-center rounded-xl p-2.5 transition-all',
										canSend
											? 'btn-primary active:scale-95'
											: 'cursor-not-allowed bg-secondary text-muted-foreground',
									)}
									title="Send message (Enter)"
								>
									{isReadingFiles ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Send className="h-4 w-4" />
									)}
								</button>
							)}
						</div>
					</div>

					<div className="flex items-center justify-between border-t border-border/40 px-3 py-1 text-[8px] text-muted-foreground sm:text-[9px]">
						<div className="flex min-w-0 items-center gap-1.5">
							<Sparkles className="h-3 w-3 shrink-0 text-primary" />
							<span className="truncate">
								{activeModel?.details?.parameter_size
									? `${selectedModel} · ${activeModel.details.parameter_size}`
									: selectedModel}
							</span>
							{settings.enableThinking ? (
								<span className="hidden text-purple-400/80 sm:inline">· thinking</span>
							) : (
								<span className="hidden text-amber-400/80 sm:inline">· fast</span>
							)}
						</div>
						<span className="hidden shrink-0 sm:inline">Shift+Enter for newline</span>
					</div>
				</div>
			</div>
		</div>
	)
}
