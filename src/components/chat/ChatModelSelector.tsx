import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuTriggerContent,
	ModelMenuItem,
} from '@/components/ui/dropdown-menu'
import {
	CHAT_MODEL_IDS,
} from '@/services/gemini/constants'
import { getModelById } from '@/services/gemini/models'

interface ChatModelSelectorProps {
	value: string
	onChange: (modelId: string) => void
}

export function ChatModelSelector({ value, onChange }: ChatModelSelectorProps) {
	const selected = getModelById(value)
	const models = CHAT_MODEL_IDS.map((id) => getModelById(id)).filter(
		(model) => model !== undefined,
	)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<DropdownMenuTriggerContent
					label={selected?.name ?? 'Select model'}
					subtitle="Chat model"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{models.map((model) => (
					<ModelMenuItem
						key={model.id}
						label={model.name}
						description={model.description}
						selected={model.id === value}
						onSelect={() => onChange(model.id)}
					/>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
