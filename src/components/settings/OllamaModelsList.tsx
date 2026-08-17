import { useEffect, useState } from 'react'
import { fetchLocalModels, FALLBACK_MODELS } from '@/services/ollamaService'
import { loadCachedPersonalaiHost } from '@/services/personalaiApi'
import type { LocalModel } from '@/types/serverChat'

export function OllamaModelsList() {
	const [models, setModels] = useState<LocalModel[]>(FALLBACK_MODELS)

	useEffect(() => {
		const host = loadCachedPersonalaiHost()
		void fetchLocalModels('', host).then((fetched) => {
			if (fetched.length > 0) setModels(fetched)
		})
	}, [])

	return (
		<section className="surface-panel space-y-3 rounded-xl p-5">
			<h3 className="text-sm font-medium">Installed Ollama models</h3>
			<p className="text-sm text-muted-foreground">
				These are the models available for chat. Pick one from the Chat tab header or the + menu.
			</p>
			<ul className="space-y-2">
				{models.map((model) => (
					<li
						key={model.name}
						className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm"
					>
						<p className="font-medium">{model.name}</p>
						<p className="text-xs text-muted-foreground">
							{model.details?.parameter_size
								? `${model.details.parameter_size} parameters`
								: 'Local model'}
							{model.details?.quantization_level
								? ` · ${model.details.quantization_level}`
								: ''}
						</p>
					</li>
				))}
			</ul>
		</section>
	)
}
