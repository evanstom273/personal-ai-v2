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
		<div className="px-3 py-2 border-b border-slate-800/60 flex items-center justify-between">
			<span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
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
						className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start justify-between ${
							isSelected
								? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-300 border border-cyan-500/30'
								: 'hover:bg-slate-800/70 text-slate-300 hover:text-slate-100 border border-transparent'
						}`}
					>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-semibold text-sm">{m.name}</span>
								{m.details?.parameter_size && (
									<span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400">
										{m.details.parameter_size}
									</span>
								)}
							</div>
							<p className="text-[9px] text-slate-500 mt-0.5">
								{m.details?.quantization_level
									? `Quant: ${m.details.quantization_level}`
									: 'Local Model'}
								{m.details?.context_length
									? ` • ${Math.round(m.details.context_length / 1024)}k context`
									: ''}
							</p>
						</div>
						{isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-1" />}
					</button>
				)
			})}
		</div>

		<div className="px-3 py-2 border-t border-slate-800/60 flex items-center text-slate-400 text-xs bg-slate-950/40">
			<span className="flex items-center gap-1.5 text-[9px]">
				<HardDrive className="w-3.5 h-3.5 text-slate-500" />
				Path: <code className="text-cyan-400 font-mono">E:\models</code>
			</span>
		</div>
	</>
)
