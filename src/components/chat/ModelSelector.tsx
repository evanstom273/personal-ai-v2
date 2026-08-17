import { useMemo } from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuTriggerContent,
	ModelMenuItem,
} from '@/components/ui/dropdown-menu'
import {
	GEMINI_MODELS,
	getModelById,
	getModelsByCategory,
	MODEL_CATEGORY_LABELS,
	type ModelCategory,
} from '@/services/gemini/models'

const CATEGORY_ORDER: ModelCategory[] = ['chat', 'image', 'music']

interface ModelSelectorProps {
	value: string
	onChange: (modelId: string) => void
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
	const selected = getModelById(value)

	const grouped = useMemo(
		() =>
			CATEGORY_ORDER.map((category) => ({
				category,
				models: getModelsByCategory(category),
			})),
		[],
	)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<DropdownMenuTriggerContent
					label={selected?.name ?? 'Select model'}
					subtitle={selected ? MODEL_CATEGORY_LABELS[selected.category] : undefined}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="max-h-96 overflow-y-auto">
				{grouped.map(({ category, models }, index) => (
					<div key={category}>
						{index > 0 ? <DropdownMenuSeparator /> : null}
						<DropdownMenuLabel>{MODEL_CATEGORY_LABELS[category]}</DropdownMenuLabel>
						{models.map((model) => (
							<ModelMenuItem
								key={model.id}
								label={model.name}
								description={model.description}
								selected={model.id === value}
								onSelect={() => onChange(model.id)}
							/>
						))}
					</div>
				))}
				{GEMINI_MODELS.length === 0 ? (
					<div className="px-2 py-3 text-sm text-muted-foreground">
						No models configured
					</div>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
