import { useEffect, useState } from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuTriggerContent,
	ModelMenuItem,
} from '@/components/ui/dropdown-menu'
import { fetchLocalModels, FALLBACK_MODELS } from '@/services/ollamaService'
import { loadCachedPersonalaiHost } from '@/services/personalaiApi'
import type { LocalModel } from '@/types/serverChat'

interface OllamaChatModelSelectorProps {
	value: string
	onChange: (modelId: string) => void
}

export function OllamaChatModelSelector({
	value,
	onChange,
}: OllamaChatModelSelectorProps) {
	const [models, setModels] = useState<LocalModel[]>(FALLBACK_MODELS)

	useEffect(() => {
		const host = loadCachedPersonalaiHost()
		void fetchLocalModels('', host).then((fetched) => {
			if (fetched.length > 0) setModels(fetched)
		})
	}, [])

	const selected = models.find((model) => model.name === value)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<DropdownMenuTriggerContent
					label={selected?.name ?? value ?? 'Select model'}
					subtitle="Local Ollama model"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{models.map((model) => (
					<ModelMenuItem
						key={model.name}
						label={model.name}
						description={
							model.details?.parameter_size
								? `${model.details.parameter_size} parameters`
								: 'Local model'
						}
						selected={model.name === value}
						onSelect={() => onChange(model.name)}
					/>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
