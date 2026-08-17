import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Clock,
	Eraser,
	FileText,
	Heading,
	Highlighter,
	Italic,
	Link2,
	List,
	ListOrdered,
	Minus,
	Palette,
	Quote,
	Redo,
	Sparkles,
	Undo,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { DocumentAiAskDialog } from '@/components/documents/DocumentAiAskDialog'
import { DocumentAiPreviewDialog } from '@/components/documents/DocumentAiPreviewDialog'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDocumentAiWriting } from '@/hooks/useDocumentAiWriting'
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/storage/types'
import { cn } from '@/utils/cn'

const TEXT_COLORS = [
	{ label: 'Default', value: '' },
	{ label: 'Red', value: '#ef4444' },
	{ label: 'Orange', value: '#f97316' },
	{ label: 'Yellow', value: '#eab308' },
	{ label: 'Green', value: '#22c55e' },
	{ label: 'Blue', value: '#3b82f6' },
	{ label: 'Purple', value: '#a855f7' },
	{ label: 'Gray', value: '#9ca3af' },
]

const HIGHLIGHT_COLORS = [
	{ label: 'None', value: '' },
	{ label: 'Yellow', value: '#fef08a' },
	{ label: 'Green', value: '#bbf7d0' },
	{ label: 'Blue', value: '#bfdbfe' },
	{ label: 'Pink', value: '#fbcfe8' },
	{ label: 'Orange', value: '#fed7aa' },
]

function countWords(text: string): number {
	const trimmed = text.trim()
	if (!trimmed) {
		return 0
	}
	return trimmed.split(/\s+/).filter(Boolean).length
}

function getReadingTimeText(wordCount: number): string {
	if (wordCount === 0) {
		return '0 min read'
	}
	if (wordCount < 200) {
		return '< 1 min read'
	}
	const minutes = Math.ceil(wordCount / 200)
	return `${minutes} min read`
}

interface DocumentEditorProps {
	content: string
	onChange: (html: string) => void
	editable?: boolean
	placeholder?: string
	className?: string
	documentTitle?: string
	preferences?: UserPreferences
}

export function DocumentEditor({
	content,
	onChange,
	editable = true,
	placeholder = 'Start writing…',
	className,
	documentTitle = 'Untitled document',
	preferences,
}: DocumentEditorProps) {
	const [hasSelection, setHasSelection] = useState(false)
	const [wordCount, setWordCount] = useState(0)

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: { levels: [1, 2, 3, 4] },
			}),
			TextStyle,
			Color,
			Highlight.configure({ multicolor: true }),
			TextAlign.configure({
				types: ['heading', 'paragraph'],
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: 'text-primary underline underline-offset-4',
				},
			}),
			Placeholder.configure({ placeholder }),
		],
		content,
		editable,
		onCreate: ({ editor: currentEditor }) => {
			setWordCount(countWords(currentEditor.getText({ blockSeparator: ' ' })))
		},
		onUpdate: ({ editor: currentEditor }) => {
			onChange(currentEditor.getHTML())
			setWordCount(countWords(currentEditor.getText({ blockSeparator: ' ' })))
		},
		onSelectionUpdate: ({ editor: currentEditor }) => {
			const { from, to } = currentEditor.state.selection
			setHasSelection(from !== to)
		},
		editorProps: {
			attributes: {
				class:
					'document-editor-content min-h-[50vh] px-4 py-4 focus:outline-none md:px-6',
			},
		},
	})

	const ai = useDocumentAiWriting({
		editor,
		preferences: preferences ?? DEFAULT_PREFERENCES,
		documentTitle,
	})

	useEffect(() => {
		if (!editor) {
			return
		}

		const current = editor.getHTML()
		if (content !== current) {
			editor.commands.setContent(content, { emitUpdate: false })
		}
		setWordCount(countWords(editor.getText({ blockSeparator: ' ' })))
	}, [content, editor])

	if (!editor) {
		return null
	}

	const showAi = editable && preferences

	return (
		<div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
			<div className="shrink-0 border-b border-border/40 bg-card/20 px-4 py-2 backdrop-blur-sm md:px-6">
				<div className="inline-flex items-center gap-2.5 rounded-full border border-border/50 bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
					<span className="inline-flex items-center gap-1.5">
						<FileText className="h-3.5 w-3.5 text-muted-foreground/80" />
						<span>{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
					</span>
					<span className="h-3 w-px bg-border/60" aria-hidden="true" />
					<span className="inline-flex items-center gap-1.5">
						<Clock className="h-3.5 w-3.5 text-muted-foreground/80" />
						<span>{getReadingTimeText(wordCount)}</span>
					</span>
				</div>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">
				<EditorContent editor={editor} className="h-full" />
			</div>

			{editable ? (
				<div className="document-editor-toolbar shrink-0 border-t border-border bg-card/80 px-2 py-2 backdrop-blur-md md:px-4">
					<div className="flex items-center gap-1 overflow-x-auto">
					<ToolbarButton
						label="Bold"
						active={editor.isActive('bold')}
						onClick={() => editor.chain().focus().toggleBold().run()}
					>
						<Bold className="h-4 w-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Italic"
						active={editor.isActive('italic')}
						onClick={() => editor.chain().focus().toggleItalic().run()}
					>
						<Italic className="h-4 w-4" />
					</ToolbarButton>

					<DropdownMenu>
						<DropdownMenuTrigger
							hideChevron
							className="h-8 w-8 justify-center p-0"
							aria-label="Heading"
						>
							<Heading className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" side="top">
							<DropdownMenuLabel>Heading</DropdownMenuLabel>
							<DropdownMenuItem
								onSelect={() =>
									editor.chain().focus().toggleHeading({ level: 1 }).run()
								}
							>
								Heading 1
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={() =>
									editor.chain().focus().toggleHeading({ level: 2 }).run()
								}
							>
								Heading 2
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={() =>
									editor.chain().focus().toggleHeading({ level: 3 }).run()
								}
							>
								Heading 3
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={() =>
									editor.chain().focus().toggleHeading({ level: 4 }).run()
								}
							>
								Heading 4
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onSelect={() => editor.chain().focus().setParagraph().run()}
							>
								Normal text
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<ToolbarDivider />

					<ColorPickerMenu
						label="Text colour"
						icon={<Palette className="h-4 w-4" />}
						colors={TEXT_COLORS}
						onSelect={(color) => {
							if (!color) {
								editor.chain().focus().unsetColor().run()
								return
							}
							editor.chain().focus().setColor(color).run()
						}}
					/>

					<ColorPickerMenu
						label="Highlight"
						icon={<Highlighter className="h-4 w-4" />}
						colors={HIGHLIGHT_COLORS}
						onSelect={(color) => {
							if (!color) {
								editor.chain().focus().unsetHighlight().run()
								return
							}
							editor.chain().focus().setHighlight({ color }).run()
						}}
					/>

					<ToolbarDivider />

					<ToolbarButton
						label="Align left"
						active={editor.isActive({ textAlign: 'left' })}
						onClick={() => editor.chain().focus().setTextAlign('left').run()}
					>
						<AlignLeft className="h-4 w-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Align centre"
						active={editor.isActive({ textAlign: 'center' })}
						onClick={() => editor.chain().focus().setTextAlign('center').run()}
					>
						<AlignCenter className="h-4 w-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Align right"
						active={editor.isActive({ textAlign: 'right' })}
						onClick={() => editor.chain().focus().setTextAlign('right').run()}
					>
						<AlignRight className="h-4 w-4" />
					</ToolbarButton>

					<ToolbarDivider />

					<ToolbarButton
						label="Bullet list"
						active={editor.isActive('bulletList')}
						onClick={() => editor.chain().focus().toggleBulletList().run()}
					>
						<List className="h-4 w-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Numbered list"
						active={editor.isActive('orderedList')}
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
					>
						<ListOrdered className="h-4 w-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Block quote"
						active={editor.isActive('blockquote')}
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
					>
						<Quote className="h-4 w-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Horizontal rule"
						onClick={() => editor.chain().focus().setHorizontalRule().run()}
					>
						<Minus className="h-4 w-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Link"
						active={editor.isActive('link')}
						onClick={() => {
							const previous = editor.getAttributes('link').href as string | undefined
							const url = window.prompt('Enter URL', previous ?? 'https://')
							if (url === null) {
								return
							}
							if (url === '') {
								editor.chain().focus().extendMarkRange('link').unsetLink().run()
								return
							}
							editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
						}}
					>
						<Link2 className="h-4 w-4" />
					</ToolbarButton>

					<ToolbarButton
						label="Clear formatting"
						onClick={() =>
							editor.chain().focus().clearNodes().unsetAllMarks().run()
						}
					>
						<Eraser className="h-4 w-4" />
					</ToolbarButton>

					<ToolbarDivider />

					<ToolbarButton
						label="Undo"
						onClick={() => editor.chain().focus().undo().run()}
					>
						<Undo className="h-4 w-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Redo"
						onClick={() => editor.chain().focus().redo().run()}
					>
						<Redo className="h-4 w-4" />
					</ToolbarButton>

					{showAi ? (
						<>
							<ToolbarDivider />
							<DropdownMenu>
								<DropdownMenuTrigger
									hideChevron
									className="h-8 gap-1 px-2"
									aria-label="AI writing assistance"
								>
									<Sparkles className="h-4 w-4 text-primary" />
									<span className="text-xs font-medium">AI</span>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" side="top">
									<DropdownMenuLabel>AI writing</DropdownMenuLabel>
									<DropdownMenuItem
										disabled={!hasSelection}
										onSelect={() => ai.startAction('expand')}
									>
										Expand
									</DropdownMenuItem>
									<DropdownMenuItem
										disabled={!hasSelection}
										onSelect={() => ai.startAction('rewrite')}
									>
										Rewrite
									</DropdownMenuItem>
									<DropdownMenuItem
										disabled={!hasSelection}
										onSelect={() => ai.startAction('shorten')}
									>
										Shorten
									</DropdownMenuItem>
									<DropdownMenuItem
										disabled={!hasSelection}
										onSelect={() => ai.startAction('clarify')}
									>
										Make clearer
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => ai.startAction('continue')}>
										Continue writing
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										disabled={!hasSelection}
										onSelect={() => ai.openAskDialog()}
									>
										Ask AI…
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</>
					) : null}
					</div>
				</div>
			) : null}

			{showAi ? (
				<>
					<DocumentAiPreviewDialog
						open={ai.previewOpen}
						title={ai.previewTitle}
						previewText={ai.previewText}
						isGenerating={ai.isGenerating}
						error={ai.error}
						onOpenChange={(open) => {
							if (!open) {
								ai.handleReject()
							}
						}}
						onAccept={ai.handleAccept}
						onReject={ai.handleReject}
						onRegenerate={ai.handleRegenerate}
					/>
					<DocumentAiAskDialog
						open={ai.askOpen}
						isGenerating={ai.isGenerating}
						onOpenChange={ai.setAskOpen}
						onSubmit={ai.handleAskSubmit}
					/>
				</>
			) : null}
		</div>
	)
}

function ToolbarDivider() {
	return <div className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden />
}

function ColorPickerMenu({
	label,
	icon,
	colors,
	onSelect,
}: {
	label: string
	icon: ReactNode
	colors: Array<{ label: string; value: string }>
	onSelect: (color: string) => void
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				hideChevron
				className="h-8 w-8 justify-center p-0"
				aria-label={label}
			>
				{icon}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" side="top" className="min-w-[10rem]">
				<DropdownMenuLabel>{label}</DropdownMenuLabel>
				{colors.map((color) => (
					<DropdownMenuItem key={color.label} onSelect={() => onSelect(color.value)}>
						<span className="flex items-center gap-2">
							{color.value ? (
								<span
									className="inline-block h-4 w-4 rounded-sm border border-border"
									style={{ backgroundColor: color.value }}
								/>
							) : (
								<span className="inline-block h-4 w-4 rounded-sm border border-dashed border-border" />
							)}
							{color.label}
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function ToolbarButton({
	label,
	active,
	onClick,
	disabled,
	children,
}: {
	label: string
	active?: boolean
	onClick: () => void
	disabled?: boolean
	children: ReactNode
}) {
	return (
		<Button
			type="button"
			size="icon"
			variant={active ? 'secondary' : 'ghost'}
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			className="h-8 w-8 shrink-0"
		>
			{children}
		</Button>
	)
}
