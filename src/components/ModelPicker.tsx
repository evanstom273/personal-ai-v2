import React from 'react'
import { Check, HardDrive } from 'lucide-react'
import type { LocalModel } from '../types/chat'

interface ModelPickerListProps {
	models: LocalModel[]
	selectedModel: string
	onSelectModel: (modelName: string) => void
	onClose?: () => void
}

export const ModelPickerList: React.FC<ModelPickerListProps> = ({
	models,
	selectedModel,
	onSelectModel,
	onClose,
}) => (
	<>
		<div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
			<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Local Models
			</span>
			<span className="inline-flex items-center gap-1 text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
				<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
				Ollama
			</span>
		</div>

		<div className="max-h-64 overflow-y-auto p-1 space-y-1">
			{models.map((m) => {
				const isSelected = m.name === selectedModel
				return (
					<button
						key={m.name}
						type="button"
						onClick={() => {
							onSelectModel(m.name)
							onClose?.()
						}}
						className={`w-full flex items-start justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
							isSelected
								? 'border border-primary/30 bg-primary/10 text-primary'
								: 'border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
						}`}
					>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-semibold text-sm">{m.name}</span>
								{m.details?.parameter_size && (
									<span className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground">
										{m.details.parameter_size}
									</span>
								)}
							</div>
							<p className="mt-0.5 text-[9px] text-muted-foreground">
								{m.details?.quantization_level
									? `Quant: ${m.details.quantization_level}`
									: 'Local Model'}
								{m.details?.context_length
									? ` • ${Math.round(m.details.context_length / 1024)}k context`
									: ''}
							</p>
						</div>
						{isSelected && <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />}
					</button>
				)
			})}
		</div>

		<div className="flex items-center border-t border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
			<span className="flex items-center gap-1.5 text-[9px]">
				<HardDrive className="h-3.5 w-3.5" />
				Path: <code className="font-mono text-primary">E:\models</code>
			</span>
		</div>
	</>
)
