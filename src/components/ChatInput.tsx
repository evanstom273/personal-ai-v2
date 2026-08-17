import React, { useState, useRef, useEffect } from 'react'
import { Send, Square, X, FileText, Plus, Paperclip, Sparkles, Brain, Zap, ChevronRight } from 'lucide-react'
import type { LocalModel, ChatSettings } from '../types/chat'
import { ModelPickerList } from './ModelPicker'

interface AttachedFile {
	name: string
	size: number
	content: string
	type: string
}

type MenuView = 'main' | 'models'

interface ChatInputProps {
	onSendMessage: (text: string, files: AttachedFile[]) => void
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
	const [attachments, setAttachments] = useState<AttachedFile[]>([])
	const [menuOpen, setMenuOpen] = useState(false)
	const [menuView, setMenuView] = useState<MenuView>('main')
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)

	const activeModel = models.find((m) => m.name === selectedModel)

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
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
		if ((!input.trim() && attachments.length === 0) || isStreaming || disabled) {
			return
		}

		onSendMessage(input.trim(), attachments)
		setInput('')
		setAttachments([])

		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}
	}

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (!files) return

		Array.from(files).forEach((file) => {
			const reader = new FileReader()
			reader.onload = (event) => {
				const content = event.target?.result as string
				setAttachments((prev) => [
					...prev,
					{
						name: file.name,
						size: file.size,
						content,
						type: file.type || 'text/plain',
					},
				])
			}
			reader.readAsText(file)
		})

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

	return (
		<div className="shrink-0 w-full border-t border-slate-800/70 bg-slate-950/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
			<div className="w-full max-w-3xl mx-auto px-3 pt-2 pb-3">
				<div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500/50 shadow-2xl shadow-black/80 transition-all">
					{attachments.length > 0 && (
						<div className="flex flex-wrap gap-2 p-3 pb-0 border-b border-slate-800/60">
							{attachments.map((file, idx) => (
								<div
									key={idx}
									className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 text-xs text-slate-200 border border-slate-700"
								>
									<FileText className="w-3.5 h-3.5 text-cyan-400" />
									<span className="font-medium max-w-[150px] truncate">{file.name}</span>
									<span className="text-[10px] text-slate-400">
										({Math.round(file.size / 1024)} KB)
									</span>
									<button
										type="button"
										onClick={() => removeAttachment(idx)}
										className="p-0.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								</div>
							))}
						</div>
					)}

					<div className="flex items-end px-2 py-2 sm:px-3 sm:py-2.5">
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileUpload}
							multiple
							className="hidden"
						/>

						<div className="relative shrink-0 mb-0.5" ref={menuRef}>
							<button
								type="button"
								onClick={openMenu}
								className={`p-2 rounded-xl transition-colors ${
									menuOpen
										? 'text-cyan-400 bg-slate-800'
										: 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
								}`}
								title="More options"
								aria-expanded={menuOpen}
								aria-haspopup="menu"
							>
								<Plus className={`w-5 h-5 transition-transform ${menuOpen ? 'rotate-45' : ''}`} />
							</button>

							{menuOpen && (
								<div
									className="absolute left-0 bottom-full mb-2 w-[min(100vw-1.5rem,18rem)] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/80 z-50 overflow-hidden"
									role="menu"
								>
									{menuView === 'main' ? (
										<div className="py-1">
											<button
												type="button"
												role="menuitem"
												onClick={() => fileInputRef.current?.click()}
												className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/70 transition-colors"
											>
												<Paperclip className="w-4 h-4 text-slate-400" />
												<span>Attach file</span>
											</button>

											<button
												type="button"
												role="menuitem"
												onClick={() => setMenuView('models')}
												className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/70 transition-colors"
											>
												<Sparkles className="w-4 h-4 text-cyan-400" />
												<div className="flex-1 min-w-0 text-left">
													<span className="block text-slate-400 text-[11px]">Model</span>
													<span className="font-medium truncate">{selectedModel}</span>
												</div>
												<ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
											</button>

											<button
												type="button"
												role="menuitem"
												onClick={() =>
													onUpdateSettings({ enableThinking: !settings.enableThinking })
												}
												className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800/70 transition-colors"
											>
												{settings.enableThinking ? (
													<Brain className="w-4 h-4 text-purple-400" />
												) : (
													<Zap className="w-4 h-4 text-amber-400" />
												)}
												<div className="flex-1 text-left">
													<span className="block text-slate-400 text-[11px]">Reasoning</span>
													<span className="font-medium">
														{settings.enableThinking ? 'Thinking mode' : 'Fast mode'}
													</span>
												</div>
												<span
													className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
														settings.enableThinking
															? 'text-purple-300 border-purple-500/30 bg-purple-500/10'
															: 'text-amber-300 border-amber-500/30 bg-amber-500/10'
													}`}
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
							)}
						</div>

						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={`Message ${selectedModel}...`}
							disabled={disabled}
							rows={1}
							className="w-full min-w-0 bg-transparent border-0 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-0 resize-none px-2 py-1 max-h-48 scrollbar-thin scrollbar-thumb-slate-800"
						/>

						<div className="shrink-0 mb-0.5 ml-1">
							{isStreaming ? (
								<button
									type="button"
									onClick={onStopStreaming}
									className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40 transition-all flex items-center justify-center cursor-pointer"
									title="Stop generation"
								>
									<Square className="w-4 h-4 fill-rose-400" />
								</button>
							) : (
								<button
									type="button"
									onClick={handleSubmit}
									disabled={!input.trim() && attachments.length === 0}
									className={`p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
										input.trim() || attachments.length > 0
											? 'bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/25 active:scale-95'
											: 'bg-slate-800 text-slate-500 cursor-not-allowed'
									}`}
									title="Send message (Enter)"
								>
									<Send className="w-4 h-4" />
								</button>
							)}
						</div>
					</div>

					<div className="px-3 py-1 border-t border-slate-800/40 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
						<div className="flex items-center gap-1.5 min-w-0">
							<Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
							<span className="truncate">
								{activeModel?.details?.parameter_size
									? `${selectedModel} · ${activeModel.details.parameter_size}`
									: selectedModel}
							</span>
							{settings.enableThinking ? (
								<span className="hidden sm:inline text-purple-400/80">· thinking</span>
							) : (
								<span className="hidden sm:inline text-amber-400/80">· fast</span>
							)}
						</div>
						<span className="hidden sm:inline shrink-0">Shift+Enter for newline</span>
					</div>
				</div>
			</div>
		</div>
	)
}
