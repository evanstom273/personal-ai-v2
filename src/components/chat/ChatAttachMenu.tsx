import { FileText, ImagePlus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	ModelMenuItem,
} from '@/components/ui/dropdown-menu'
import { fetchLocalModels, FALLBACK_MODELS } from '@/services/ollamaService'
import { loadCachedPersonalaiHost } from '@/services/personalaiApi'
import type { LocalModel } from '@/types/serverChat'
import { cn } from '@/utils/cn'

interface ChatAttachMenuProps {
	disabled?: boolean
	selectedChatModelId: string
	onChatModelChange: (modelId: string) => void
	onDocumentUpload: (files: File[]) => void
	onImageUpload: (files: File[]) => void
}

export function ChatAttachMenu({
	disabled,
	selectedChatModelId,
	onChatModelChange,
	onDocumentUpload,
	onImageUpload,
}: ChatAttachMenuProps) {
	const documentInputRef = useRef<HTMLInputElement>(null)
	const imageInputRef = useRef<HTMLInputElement>(null)
	const [menuOpen, setMenuOpen] = useState(false)
	const [models, setModels] = useState<LocalModel[]>(FALLBACK_MODELS)

	useEffect(() => {
		const host = loadCachedPersonalaiHost()
		void fetchLocalModels('', host).then((fetched) => {
			if (fetched.length > 0) setModels(fetched)
		})
	}, [menuOpen])

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
					if (files.length > 0) onDocumentUpload(files)
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
					if (files.length > 0) onImageUpload(files)
					event.target.value = ''
				}}
			/>

			<DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
				<DropdownMenuTrigger
					hideChevron
					disabled={disabled}
					className={cn(
						'h-9 w-9 shrink-0 justify-center p-0 md:h-10 md:w-10',
						menuOpen && 'bg-accent text-primary',
					)}
					aria-label="Attach files or choose model"
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
					<DropdownMenuLabel>Local model</DropdownMenuLabel>
					{models.map((model) => (
						<ModelMenuItem
							key={model.name}
							label={model.name}
							description={
								model.details?.parameter_size
									? `${model.details.parameter_size} parameters`
									: 'Ollama model'
							}
							selected={model.name === selectedChatModelId}
							onSelect={() => {
								onChatModelChange(model.name)
								setMenuOpen(false)
							}}
						/>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	)
}
