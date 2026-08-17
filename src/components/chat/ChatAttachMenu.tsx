import {
	ChevronDown,
	FileText,
	Globe,
	ImagePlus,
	Music,
	Plus,
} from 'lucide-react'
import { useRef, useState } from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	ModelMenuItem,
} from '@/components/ui/dropdown-menu'
import { CHAT_MODEL_IDS } from '@/services/gemini/constants'
import type { GenerationIntent } from '@/services/gemini/constants'
import {
	getModelById,
	getModelsByCategory,
	MODEL_CATEGORY_LABELS,
	type ModelCategory,
} from '@/services/gemini/models'
import { cn } from '@/utils/cn'

interface ChatAttachMenuProps {
	disabled?: boolean
	webSearchEnabled: boolean
	selectedChatModelId: string
	selectedImageModelId: string
	selectedMusicModelId: string
	onWebSearchChange: (enabled: boolean) => void
	onChatModelChange: (modelId: string) => void
	onImageModelChange: (modelId: string) => void
	onMusicModelChange: (modelId: string) => void
	forcedNextIntent: GenerationIntent | null
	onForceNextIntent: (intent: GenerationIntent | null) => void
	onDocumentUpload: (files: File[]) => void
	onImageUpload: (files: File[]) => void
}

type ExpandableCategory = Exclude<ModelCategory, 'chat'>

const CATEGORY_ICONS = {
	image: ImagePlus,
	music: Music,
} as const

export function ChatAttachMenu({
	disabled,
	webSearchEnabled,
	selectedChatModelId,
	selectedImageModelId,
	selectedMusicModelId,
	onWebSearchChange,
	onChatModelChange,
	onImageModelChange,
	onMusicModelChange,
	forcedNextIntent,
	onForceNextIntent,
	onDocumentUpload,
	onImageUpload,
}: ChatAttachMenuProps) {
	const documentInputRef = useRef<HTMLInputElement>(null)
	const imageInputRef = useRef<HTMLInputElement>(null)
	const [menuOpen, setMenuOpen] = useState(false)
	const [expandedCategory, setExpandedCategory] =
		useState<ExpandableCategory | null>(null)

	const chatModels = CHAT_MODEL_IDS.map((id) => getModelById(id)).filter(
		(model) => model !== undefined,
	)

	const selectedByCategory: Record<ExpandableCategory, string> = {
		image: selectedImageModelId,
		music: selectedMusicModelId,
	}

	const onModelChangeByCategory: Record<
		ExpandableCategory,
		(modelId: string) => void
	> = {
		image: onImageModelChange,
		music: onMusicModelChange,
	}

	function handleMenuOpenChange(open: boolean): void {
		setMenuOpen(open)
		if (!open) {
			setExpandedCategory(null)
		}
	}

	function toggleCategory(category: ExpandableCategory): void {
		setExpandedCategory((current) => (current === category ? null : category))
	}

	return (
		<>
			<input
				ref={documentInputRef}
				type="file"
				multiple
				accept=".txt,.md,.markdown,.html,.htm,.json,.csv,.xml,.yml,.yaml,.pdf,text/*,application/pdf"
				className="hidden"
				onChange={(event) => {
					const files = Array.from(event.target.files ?? [])
					if (files.length > 0) {
						onDocumentUpload(files)
					}
					event.target.value = ''
				}}
			/>
			<input
				ref={imageInputRef}
				type="file"
				multiple
				accept="image/*"
				className="hidden"
				onChange={(event) => {
					const files = Array.from(event.target.files ?? [])
					if (files.length > 0) {
						onImageUpload(files)
					}
					event.target.value = ''
				}}
			/>

			<DropdownMenu modal={false} open={menuOpen} onOpenChange={handleMenuOpenChange}>
				<DropdownMenuTrigger
					hideChevron
					disabled={disabled}
					className="h-9 w-9 shrink-0 justify-center p-0 md:h-10 md:w-10"
					aria-label="Attach files or choose models"
				>
					<Plus className="h-4 w-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent
					side="top"
					align="start"
					collisionPadding={12}
					className="w-[min(17rem,calc(100vw-1.5rem))] max-h-[min(70svh,24rem)] overflow-y-auto"
				>
					<DropdownMenuLabel>Attach</DropdownMenuLabel>
					<DropdownMenuItem
						onSelect={() => {
							documentInputRef.current?.click()
						}}
					>
						<FileText className="h-4 w-4" />
						Upload documents
					</DropdownMenuItem>
					<DropdownMenuItem
						onSelect={() => {
							imageInputRef.current?.click()
						}}
					>
						<ImagePlus className="h-4 w-4" />
						Upload images
					</DropdownMenuItem>

					<DropdownMenuSeparator />
					<DropdownMenuLabel>Chat</DropdownMenuLabel>
					<ToggleMenuItem
						icon={Globe}
						label="Web search"
						description="Look up wikis and current info via Google"
						selected={webSearchEnabled}
						onSelect={() => onWebSearchChange(!webSearchEnabled)}
					/>
					{chatModels.map((model) => (
						<ModelMenuItem
							key={model.id}
							label={model.name}
							description={model.description}
							selected={model.id === selectedChatModelId}
							onSelect={() => onChatModelChange(model.id)}
						/>
					))}

					<DropdownMenuSeparator />
					<DropdownMenuLabel>Generation models</DropdownMenuLabel>
					{(['image', 'music'] as const).map((category) => {
						const Icon = CATEGORY_ICONS[category]
						const selectedModel = getModelById(selectedByCategory[category])
						const models = getModelsByCategory(category)
						const isExpanded = expandedCategory === category

						return (
							<div key={category}>
								<DropdownMenuItem
									onSelect={(event) => {
										event.preventDefault()
										toggleCategory(category)
									}}
									className={cn(
										'flex items-start gap-3 py-2.5',
										isExpanded && 'bg-accent/60',
									)}
								>
									<Icon className="mt-0.5 h-4 w-4 shrink-0" />
									<span className="min-w-0 flex-1">
										<span className="block font-medium">
											{MODEL_CATEGORY_LABELS[category]}
										</span>
										<span className="block truncate text-xs text-muted-foreground">
											{selectedModel?.name ?? 'Select model'}
										</span>
									</span>
									<ChevronDown
										className={cn(
											'mt-0.5 h-4 w-4 shrink-0 opacity-60 transition-transform',
											isExpanded && 'rotate-180',
										)}
									/>
								</DropdownMenuItem>
								{isExpanded ? (
									<>
										<DropdownMenuItem
											onSelect={(event) => {
												event.preventDefault()
												onForceNextIntent(
													forcedNextIntent === category ? null : category,
												)
											}}
											className={cn(
												'py-2 pl-8 text-xs',
												forcedNextIntent === category && 'bg-primary/10',
											)}
										>
											<span className="font-medium">
												{forcedNextIntent === category
													? 'Next message uses this model ✓'
													: 'Use for next message only'}
											</span>
										</DropdownMenuItem>
										{models.map((model) => (
											<ModelMenuItem
												key={model.id}
												label={model.name}
												description={model.description}
												selected={model.id === selectedByCategory[category]}
												onSelect={() =>
													onModelChangeByCategory[category](model.id)
												}
												className="pl-8"
											/>
										))}
									</>
								) : null}
							</div>
						)
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	)
}

function ToggleMenuItem({
	icon: Icon,
	label,
	description,
	selected,
	onSelect,
}: {
	icon: typeof Globe
	label: string
	description: string
	selected: boolean
	onSelect: () => void
}) {
	return (
		<DropdownMenuItem
			onSelect={(event) => {
				event.preventDefault()
				onSelect()
			}}
			className={cn('flex items-start gap-3 py-2.5', selected && 'bg-accent/60')}
		>
			<Icon className="mt-0.5 h-4 w-4 shrink-0" />
			<span className="min-w-0">
				<span className="block font-medium">{label}</span>
				<span className="block text-xs text-muted-foreground">{description}</span>
			</span>
		</DropdownMenuItem>
	)
}
