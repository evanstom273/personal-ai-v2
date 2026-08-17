import React, { useState, useEffect } from 'react'
import {
	X,
	Sliders,
	HardDrive,
	RotateCcw,
	Check,
	Server,
	Brain,
	Zap,
	Loader2,
	AlertCircle,
	Network,
	Link2,
} from 'lucide-react'
import type { ChatSettings, LocalModel } from '../types/chat'
import { DEFAULT_SETTINGS, testOllamaConnection } from '../services/ollamaService'
import {
	buildTailscaleServeUrl,
	classifyOllamaHost,
	getEndpointLabel,
	isTailscaleServeUrl,
	parseTailscaleServeUrl,
} from '../utils/ollamaEndpoint'

interface SettingsModalProps {
	isOpen: boolean
	onClose: () => void
	settings: ChatSettings
	onSaveSettings: (newSettings: ChatSettings) => void
	onModelsRefresh?: (models: LocalModel[]) => void
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

export const SettingsModal: React.FC<SettingsModalProps> = ({
	isOpen,
	onClose,
	settings,
	onSaveSettings,
	onModelsRefresh,
}) => {
	const [formData, setFormData] = useState<ChatSettings>(settings)
	const [saved, setSaved] = useState(false)
	const [testStatus, setTestStatus] = useState<TestStatus>('idle')
	const [testMessage, setTestMessage] = useState('')
	const [testHint, setTestHint] = useState('')

	useEffect(() => {
		if (isOpen) {
			setFormData({
				...DEFAULT_SETTINGS,
				...settings,
			})
			setTestStatus('idle')
			setTestMessage('')
			setTestHint('')
		}
	}, [isOpen, settings])

	if (!isOpen) return null

	const endpointKind = classifyOllamaHost(formData.ollamaHost)
	const isTailscale = isTailscaleServeUrl(formData.ollamaHost)

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault()
		onSaveSettings(formData)
		setSaved(true)
		setTimeout(() => {
			setSaved(false)
			onClose()
		}, 1000)
	}

	const handleReset = () => {
		setFormData(DEFAULT_SETTINGS)
		setTestStatus('idle')
		setTestMessage('')
		setTestHint('')
	}

	const handleApplyTailscaleUrl = () => {
		try {
			const url = buildTailscaleServeUrl(formData.tailscaleMachine, formData.tailscaleTailnet)
			setFormData({ ...formData, ollamaHost: url })
			setTestStatus('idle')
			setTestMessage('')
			setTestHint('Tailscale Serve URL applied. Run Test Connection after starting serve on your PC.')
		} catch (err) {
			setTestStatus('error')
			setTestMessage(err instanceof Error ? err.message : 'Invalid Tailscale settings')
			setTestHint('')
		}
	}

	const handleOllamaHostChange = (value: string) => {
		const parsed = parseTailscaleServeUrl(value)
		setFormData({
			...formData,
			ollamaHost: value,
			tailscaleMachine: parsed?.machine ?? formData.tailscaleMachine,
			tailscaleTailnet: parsed?.tailnet ?? formData.tailscaleTailnet,
		})
		setTestStatus('idle')
	}

	const handleTestConnection = async () => {
		setTestStatus('testing')
		setTestMessage('')
		setTestHint('')

		const result = await testOllamaConnection(formData.ollamaHost)

		if (result.ok) {
			setTestStatus('success')
			setTestMessage(
				`Connected (${result.endpointLabel}) · ${result.latencyMs}ms · ${result.modelCount ?? 0} model(s)`
			)
			if (result.modelNames && result.modelNames.length > 0) {
				setTestHint(`Models: ${result.modelNames.slice(0, 4).join(', ')}${result.modelNames.length > 4 ? '…' : ''}`)
			}
			if (result.models && result.models.length > 0) {
				onModelsRefresh?.(result.models)
			}
		} else {
			setTestStatus('error')
			setTestMessage(result.error || 'Connection failed')
			setTestHint(result.hint || '')
		}
	}

	const systemPresets = [
		{
			name: 'Default',
			prompt: 'You are a helpful, intelligent, and precise AI assistant powered by local models.',
		},
		{
			name: 'Code Specialist',
			prompt: 'You are an expert software engineer. Provide clean, production-ready code with minimal explanation unless asked.',
		},
		{
			name: 'Concise Expert',
			prompt: 'Provide direct, accurate, and concise answers without unnecessary filler.',
		},
		{
			name: 'Creative Writer',
			prompt: 'You are a creative writing assistant. Be expressive, imaginative, and engaging.',
		},
	]

	const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app-url'

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
			<div className="relative w-full max-w-xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh]">
				<div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
					<div className="flex items-center gap-2.5">
						<Sliders className="w-5 h-5 text-cyan-400" />
						<h2 className="font-bold text-slate-100 text-base">Chat & Model Parameters</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
					<div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
					<div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<HardDrive className="w-5 h-5 text-cyan-400 shrink-0" />
							<div>
								<h4 className="font-semibold text-slate-200">Local Storage Path</h4>
								<code className="text-cyan-400 font-mono text-[11px]">E:\models</code>
							</div>
						</div>
						<span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
							Ollama Engine
						</span>
					</div>

					<div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
						<div className="flex items-center gap-2">
							<Network className="w-4 h-4 text-sky-400" />
							<h4 className="font-semibold text-slate-100 text-sm">Remote Ollama Connection</h4>
						</div>

						<div className="space-y-2">
							<label className="font-semibold text-slate-200 flex items-center gap-2">
								<Server className="w-3.5 h-3.5 text-purple-400" />
								Ollama Host Endpoint
							</label>
							<div className="flex gap-2">
								<input
									type="url"
									value={formData.ollamaHost}
									onChange={(e) => handleOllamaHostChange(e.target.value)}
									placeholder="https://desktop.tailnet.ts.net or leave empty for local dev proxy"
									className="flex-1 min-w-0 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-cyan-500"
								/>
								<button
									type="button"
									onClick={handleTestConnection}
									disabled={testStatus === 'testing'}
									className="shrink-0 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-60 flex items-center gap-1.5"
								>
									{testStatus === 'testing' ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : (
										<Link2 className="w-3.5 h-3.5" />
									)}
									<span>Test</span>
								</button>
							</div>
							<p className="text-[11px] text-slate-500">
								Empty = local Vite proxy (<code className="font-mono">/api</code> → 127.0.0.1:11434).
								For Vercel or phone access, set a reachable HTTPS URL.
							</p>

							{testStatus === 'success' && (
								<div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px]">
									<Check className="w-4 h-4 shrink-0 mt-0.5" />
									<div>
										<p className="font-semibold">{testMessage}</p>
										{testHint && <p className="text-emerald-200/80 mt-0.5">{testHint}</p>}
									</div>
								</div>
							)}

							{testStatus === 'error' && (
								<div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
									<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
									<div>
										<p className="font-semibold">{testMessage}</p>
										{testHint && <p className="text-rose-200/80 mt-0.5">{testHint}</p>}
									</div>
								</div>
							)}

							{testHint && testStatus === 'idle' && (
								<p className="text-[11px] text-slate-400">{testHint}</p>
							)}
						</div>

						<div className="pt-3 border-t border-slate-800/80 space-y-3">
							<div className="flex items-center justify-between gap-2">
								<div>
									<h5 className="font-semibold text-slate-200 text-sm">Tailscale Serve</h5>
									<p className="text-[11px] text-slate-500 mt-0.5">
										Private HTTPS access from your phone without exposing Ollama publicly.
									</p>
								</div>
								{isTailscale && (
									<span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 font-medium shrink-0">
										Active
									</span>
								)}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<input
									type="text"
									value={formData.tailscaleMachine}
									onChange={(e) =>
										setFormData({ ...formData, tailscaleMachine: e.target.value })
									}
									placeholder="Machine name (e.g. desktop)"
									className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
								/>
								<input
									type="text"
									value={formData.tailscaleTailnet}
									onChange={(e) =>
										setFormData({ ...formData, tailscaleTailnet: e.target.value })
									}
									placeholder="Tailnet (e.g. tail12345)"
									className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
								/>
							</div>

							<button
								type="button"
								onClick={handleApplyTailscaleUrl}
								className="w-full px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-colors"
							>
								Apply Tailscale Serve URL
							</button>

							<div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-2 font-mono leading-relaxed">
								<p className="text-slate-300 font-sans font-semibold text-xs">On your Ollama PC:</p>
								<p>tailscale serve --bg --https=443 http://127.0.0.1:11434</p>
								<p>setx OLLAMA_ORIGINS &quot;{appOrigin}&quot;</p>
								<p className="text-slate-500 font-sans">
									Install Tailscale on your phone and sign into the same tailnet. Then apply your machine
									name above and test the connection.
								</p>
							</div>
						</div>
					</div>

					<div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								{formData.enableThinking ? (
									<Brain className="w-4 h-4 text-purple-400" />
								) : (
									<Zap className="w-4 h-4 text-amber-400" />
								)}
								<h4 className="font-semibold text-slate-100 text-sm">
									{formData.enableThinking ? 'Thinking Mode (Deep Reasoning)' : 'Fast Mode (No Thinking)'}
								</h4>
							</div>
							<p className="text-[11px] text-slate-400 max-w-sm">
								{formData.enableThinking
									? 'Model generates step-by-step thought processes before responding. Higher accuracy, slower speed.'
									: 'Model skips internal reasoning and responds directly. Up to 3x-5x faster responses!'}
							</p>
						</div>
						<button
							type="button"
							onClick={() => setFormData({ ...formData, enableThinking: !formData.enableThinking })}
							className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
								formData.enableThinking ? 'bg-purple-600' : 'bg-slate-700'
							}`}
						>
							<span
								className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
									formData.enableThinking ? 'translate-x-5' : 'translate-x-0'
								}`}
							/>
						</button>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className="font-semibold text-slate-200 text-sm">System Prompt</label>
							<div className="flex gap-1.5">
								{systemPresets.map((preset) => (
									<button
										key={preset.name}
										type="button"
										onClick={() => setFormData({ ...formData, systemPrompt: preset.prompt })}
										className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition-colors"
									>
										{preset.name}
									</button>
								))}
							</div>
						</div>
						<textarea
							value={formData.systemPrompt}
							onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
							rows={3}
							className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-mono leading-relaxed"
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
						<div className="space-y-2 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
							<div className="flex justify-between items-center">
								<label className="font-semibold text-slate-200">Temperature</label>
								<span className="font-mono text-cyan-400 font-bold">{formData.temperature}</span>
							</div>
							<input
								type="range"
								min="0"
								max="2"
								step="0.05"
								value={formData.temperature}
								onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
								className="w-full accent-cyan-400 cursor-pointer"
							/>
							<p className="text-[10px] text-slate-400">
								Higher = more creative & diverse. Lower = deterministic & focused.
							</p>
						</div>

						<div className="space-y-2 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
							<div className="flex justify-between items-center">
								<label className="font-semibold text-slate-200">Top-P (Nucleus Sampling)</label>
								<span className="font-mono text-cyan-400 font-bold">{formData.topP}</span>
							</div>
							<input
								type="range"
								min="0.1"
								max="1.0"
								step="0.05"
								value={formData.topP}
								onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
								className="w-full accent-cyan-400 cursor-pointer"
							/>
							<p className="text-[10px] text-slate-400">
								Considers cumulative probability cutoff for token selection.
							</p>
						</div>

						<div className="space-y-2 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
							<div className="flex justify-between items-center">
								<label className="font-semibold text-slate-200">Context Window (Tokens)</label>
								<span className="font-mono text-cyan-400 font-bold">{formData.contextWindow}</span>
							</div>
							<select
								value={formData.contextWindow}
								onChange={(e) => setFormData({ ...formData, contextWindow: parseInt(e.target.value) })}
								className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none"
							>
								<option value={4096}>4,096 (Standard)</option>
								<option value={8192}>8,192 (Medium)</option>
								<option value={16384}>16,384 (Large)</option>
								<option value={32768}>32,768 (Extended)</option>
								<option value={65536}>65,536 (Ultra)</option>
							</select>
						</div>

						<div className="space-y-2 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
							<div className="flex justify-between items-center">
								<label className="font-semibold text-slate-200">Max Generation Tokens</label>
								<span className="font-mono text-cyan-400 font-bold">{formData.maxTokens}</span>
							</div>
							<select
								value={formData.maxTokens}
								onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
								className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none"
							>
								<option value={1024}>1,024 Tokens</option>
								<option value={2048}>2,048 Tokens</option>
								<option value={4096}>4,096 Tokens</option>
								<option value={8192}>8,192 Tokens</option>
							</select>
						</div>
					</div>

					{endpointKind !== 'vite-proxy' && (
						<p className="text-[11px] text-slate-500">
							Endpoint type: <span className="text-slate-300">{getEndpointLabel(endpointKind)}</span>
						</p>
					)}
					</div>

					<div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
					<button
						type="button"
						onClick={handleReset}
						className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
					>
						<RotateCcw className="w-3.5 h-3.5" />
						<span>Reset Defaults</span>
					</button>

					<div className="flex gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							onClick={(e) => {
								e.preventDefault()
								handleSave(e)
							}}
							className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all shadow-md shadow-cyan-500/20"
						>
							{saved ? (
								<>
									<Check className="w-4 h-4 text-white" />
									<span>Saved!</span>
								</>
							) : (
								<span>Save Changes</span>
							)}
						</button>
					</div>
					</div>
				</form>
			</div>
		</div>
	)
}
