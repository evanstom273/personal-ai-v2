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
	Database,
} from 'lucide-react'
import type { ChatSettings, LocalModel } from '../types/chat'
import { DEFAULT_SETTINGS, testOllamaConnection } from '../services/ollamaService'
import { testPersonalaiConnection } from '../services/personalaiApi'
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
	const [serverTestStatus, setServerTestStatus] = useState<TestStatus>('idle')
	const [serverTestMessage, setServerTestMessage] = useState('')
	const [serverTestHint, setServerTestHint] = useState('')

	useEffect(() => {
		if (isOpen) {
			setFormData({
				...DEFAULT_SETTINGS,
				...settings,
			})
			setTestStatus('idle')
			setTestMessage('')
			setTestHint('')
			setServerTestStatus('idle')
			setServerTestMessage('')
			setServerTestHint('')
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
			setFormData({ ...formData, personalaiHost: url, ollamaHost: '' })
			setServerTestStatus('idle')
			setTestStatus('idle')
			setTestMessage('')
			setTestHint('')
			setServerTestHint('Tailscale Serve URL applied for PersonalAI backend. Start serve on port 3847, then test.')
		} catch (err) {
			setServerTestStatus('error')
			setServerTestMessage(err instanceof Error ? err.message : 'Invalid Tailscale settings')
			setServerTestHint('')
		}
	}

	const handlePersonalaiHostChange = (value: string) => {
		const parsed = parseTailscaleServeUrl(value)
		setFormData({
			...formData,
			personalaiHost: value,
			tailscaleMachine: parsed?.machine ?? formData.tailscaleMachine,
			tailscaleTailnet: parsed?.tailnet ?? formData.tailscaleTailnet,
		})
		setServerTestStatus('idle')
	}

	const handleTestServerConnection = async () => {
		setServerTestStatus('testing')
		setServerTestMessage('')
		setServerTestHint('')

		const result = await testPersonalaiConnection(formData.personalaiHost)

		if (result.ok) {
			setServerTestStatus('success')
			setServerTestMessage(
				`PersonalAI server online · ${result.latencyMs}ms${result.ollama ? ' · Ollama reachable' : ' · Ollama not detected'}`
			)
		} else {
			setServerTestStatus('error')
			setServerTestMessage(result.error || 'Server connection failed')
			setServerTestHint('Start the PersonalAI backend on your laptop and verify Tailscale Serve.')
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
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
			<div className="surface-popover relative flex w-full max-w-xl flex-col max-h-[90vh] overflow-hidden rounded-xl text-popover-foreground shadow-lg">
				<div className="app-header-glass flex shrink-0 items-center justify-between border-b border-border/40 p-4">
					<div className="flex items-center gap-2.5">
						<Sliders className="h-5 w-5 text-primary" />
						<h2 className="text-base font-bold">Chat & Model Parameters</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="btn-ghost rounded-lg p-1.5"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
					<div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
					<div className="p-3.5 surface-panel rounded-[1.25rem] flex items-center justify-between">
						<div className="flex items-center gap-3">
							<HardDrive className="h-5 w-5 text-primary shrink-0" />
							<div>
								<h4 className="font-semibold text-foreground">Local Storage Path</h4>
								<code className="text-primary font-mono text-[9px]">E:\models</code>
							</div>
						</div>
						<span className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
							Ollama Engine
						</span>
					</div>

					<div className="space-y-3 p-4 surface-panel rounded-[1.25rem]">
						<div className="flex items-center gap-2">
							<Database className="h-4 w-4 text-emerald-400" />
							<h4 className="font-semibold text-foreground text-sm">PersonalAI Server (SQLite)</h4>
						</div>

						<div className="space-y-2">
							<label className="font-semibold text-foreground flex items-center gap-2">
								<Server className="h-3.5 w-3.5 text-primary" />
								PersonalAI Backend URL
							</label>
							<div className="flex gap-2">
								<input
									type="url"
									value={formData.personalaiHost}
									onChange={(e) => handlePersonalaiHostChange(e.target.value)}
									placeholder="https://desktop.tailnet.ts.net or empty for local dev proxy"
									className="surface-input flex-1 min-w-0 rounded-xl p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
								<button
									type="button"
									onClick={handleTestServerConnection}
									disabled={serverTestStatus === 'testing'}
									className="shrink-0 flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
								>
									{serverTestStatus === 'testing' ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : (
										<Link2 className="w-3.5 h-3.5" />
									)}
									<span>Test</span>
								</button>
							</div>
							<p className="text-[9px] text-muted-foreground">
								Central persistence on your laptop. Empty = local dev proxy (<code className="font-mono">/api/personalai</code> → 127.0.0.1:3847).
								When using the backend, leave Ollama Host empty — the server proxies Ollama locally.
							</p>

							{serverTestStatus === 'success' && (
								<div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px]">
									<Check className="w-4 h-4 shrink-0 mt-0.5" />
									<p className="font-semibold">{serverTestMessage}</p>
								</div>
							)}

							{serverTestStatus === 'error' && (
								<div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[9px]">
									<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
									<div>
										<p className="font-semibold">{serverTestMessage}</p>
										{serverTestHint && <p className="text-rose-200/80 mt-0.5">{serverTestHint}</p>}
									</div>
								</div>
							)}

							<div className="surface-panel rounded-xl p-3 text-[9px] text-muted-foreground space-y-2 font-mono leading-relaxed">
								<p className="text-foreground font-sans font-semibold text-xs">On your laptop:</p>
								<p>npm run dev:server</p>
								<p>tailscale serve --bg --https=443 http://127.0.0.1:3847</p>
								<p className="text-muted-foreground font-sans">
									Data stored in <code className="font-mono">PersonalAI-Data/personalai.db</code> (configurable via PERSONALAI_DATA_DIR).
								</p>
							</div>
						</div>
					</div>

					<div className="space-y-3 p-4 surface-panel rounded-[1.25rem]">
						<div className="flex items-center gap-2">
							<Network className="h-4 w-4 text-primary" />
							<h4 className="font-semibold text-foreground text-sm">Remote Ollama Connection</h4>
						</div>

						<div className="space-y-2">
							<label className="font-semibold text-foreground flex items-center gap-2">
								<Server className="w-3.5 h-3.5 text-purple-400" />
								Ollama Host Endpoint
							</label>
							<div className="flex gap-2">
								<input
									type="url"
									value={formData.ollamaHost}
									onChange={(e) => handleOllamaHostChange(e.target.value)}
									placeholder="https://desktop.tailnet.ts.net or leave empty for local dev proxy"
									className="surface-input flex-1 min-w-0 rounded-xl p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
								<button
									type="button"
									onClick={handleTestConnection}
									disabled={testStatus === 'testing'}
									className="shrink-0 flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
								>
									{testStatus === 'testing' ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : (
										<Link2 className="w-3.5 h-3.5" />
									)}
									<span>Test</span>
								</button>
							</div>
							<p className="text-[9px] text-muted-foreground">
								Empty = local Vite proxy (<code className="font-mono">/api</code> → 127.0.0.1:11434).
								For Vercel or phone access, set a reachable HTTPS URL.
							</p>

							{testStatus === 'success' && (
								<div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px]">
									<Check className="w-4 h-4 shrink-0 mt-0.5" />
									<div>
										<p className="font-semibold">{testMessage}</p>
										{testHint && <p className="text-emerald-200/80 mt-0.5">{testHint}</p>}
									</div>
								</div>
							)}

							{testStatus === 'error' && (
								<div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[9px]">
									<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
									<div>
										<p className="font-semibold">{testMessage}</p>
										{testHint && <p className="text-rose-200/80 mt-0.5">{testHint}</p>}
									</div>
								</div>
							)}

							{testHint && testStatus === 'idle' && (
								<p className="text-[9px] text-muted-foreground">{testHint}</p>
							)}
						</div>

						<div className="pt-3 border-t border-border/80 space-y-3">
							<div className="flex items-center justify-between gap-2">
								<div>
									<h5 className="font-semibold text-foreground text-sm">Tailscale Serve</h5>
									<p className="text-[9px] text-muted-foreground mt-0.5">
										Private HTTPS access from your phone without exposing Ollama publicly.
									</p>
								</div>
								{isTailscale && (
									<span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[8px] font-medium text-primary">
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
									className="surface-input rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
								<input
									type="text"
									value={formData.tailscaleTailnet}
									onChange={(e) =>
										setFormData({ ...formData, tailscaleTailnet: e.target.value })
									}
									placeholder="Tailnet (e.g. tail12345)"
									className="surface-input rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>

							<button
								type="button"
								onClick={handleApplyTailscaleUrl}
								className="w-full rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
							>
								Apply Tailscale Serve URL
							</button>

							<div className="surface-panel rounded-xl p-3 text-[9px] text-muted-foreground space-y-2 font-mono leading-relaxed">
								<p className="text-foreground font-sans font-semibold text-xs">Direct Ollama only (optional):</p>
								<p>tailscale serve --bg --https=443 http://127.0.0.1:11434</p>
								<p>setx OLLAMA_ORIGINS &quot;{appOrigin}&quot;</p>
								<p className="text-muted-foreground font-sans">
									Skip this if the PersonalAI backend proxies Ollama. Install Tailscale on your phone and sign into the same tailnet.
								</p>
							</div>
						</div>
					</div>

					<div className="p-4 surface-panel rounded-[1.25rem] flex items-center justify-between">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								{formData.enableThinking ? (
									<Brain className="w-4 h-4 text-purple-400" />
								) : (
									<Zap className="w-4 h-4 text-amber-400" />
								)}
								<h4 className="font-semibold text-foreground text-sm">
									{formData.enableThinking ? 'Thinking Mode (Deep Reasoning)' : 'Fast Mode (No Thinking)'}
								</h4>
							</div>
							<p className="text-[9px] text-muted-foreground max-w-sm">
								{formData.enableThinking
									? 'Model generates step-by-step thought processes before responding. Higher accuracy, slower speed.'
									: 'Model skips internal reasoning and responds directly. Up to 3x-5x faster responses!'}
							</p>
						</div>
						<button
							type="button"
							onClick={() => setFormData({ ...formData, enableThinking: !formData.enableThinking })}
							className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
								formData.enableThinking ? 'bg-purple-600' : 'bg-muted'
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
							<label className="font-semibold text-foreground text-sm">System Prompt</label>
							<div className="flex gap-1.5">
								{systemPresets.map((preset) => (
									<button
										key={preset.name}
										type="button"
										onClick={() => setFormData({ ...formData, systemPrompt: preset.prompt })}
										className="rounded bg-secondary px-2 py-0.5 text-[8px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
							className="surface-input w-full resize-none rounded-xl p-3 font-mono leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
						<div className="surface-panel rounded-xl p-3.5 border-border/80">
							<div className="flex justify-between items-center">
								<label className="font-semibold text-foreground">Temperature</label>
								<span className="font-mono text-primary font-bold">{formData.temperature}</span>
							</div>
							<input
								type="range"
								min="0"
								max="2"
								step="0.05"
								value={formData.temperature}
								onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
								className="w-full accent-primary cursor-pointer"
							/>
							<p className="text-[8px] text-muted-foreground">
								Higher = more creative & diverse. Lower = deterministic & focused.
							</p>
						</div>

						<div className="surface-panel rounded-xl p-3.5 border-border/80">
							<div className="flex justify-between items-center">
								<label className="font-semibold text-foreground">Top-P (Nucleus Sampling)</label>
								<span className="font-mono text-primary font-bold">{formData.topP}</span>
							</div>
							<input
								type="range"
								min="0.1"
								max="1.0"
								step="0.05"
								value={formData.topP}
								onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
								className="w-full accent-primary cursor-pointer"
							/>
							<p className="text-[8px] text-muted-foreground">
								Considers cumulative probability cutoff for token selection.
							</p>
						</div>

						<div className="surface-panel rounded-xl p-3.5 border-border/80">
							<div className="flex justify-between items-center">
								<label className="font-semibold text-foreground">Context Window (Tokens)</label>
								<span className="font-mono text-primary font-bold">{formData.contextWindow}</span>
							</div>
							<select
								value={formData.contextWindow}
								onChange={(e) => setFormData({ ...formData, contextWindow: parseInt(e.target.value) })}
								className="surface-input w-full rounded-lg p-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value={4096}>4,096 (Standard)</option>
								<option value={8192}>8,192 (Medium)</option>
								<option value={16384}>16,384 (Large)</option>
								<option value={32768}>32,768 (Extended)</option>
								<option value={65536}>65,536 (Ultra)</option>
								<option value={131072}>131,072 (128k)</option>
								<option value={262144}>262,144 (256k — qwen3.5)</option>
							</select>
							<p className="text-[8px] text-muted-foreground">
								Sent to Ollama as <code className="font-mono text-muted-foreground">num_ctx</code> on each request.
								Match your Ollama / model limit (e.g. 256k).
							</p>
						</div>

						<div className="surface-panel rounded-xl p-3.5 border-border/80">
							<div className="flex justify-between items-center">
								<label className="font-semibold text-foreground">Max Generation Tokens</label>
								<span className="font-mono text-primary font-bold">{formData.maxTokens}</span>
							</div>
							<select
								value={formData.maxTokens}
								onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
								className="surface-input w-full rounded-lg p-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							>
								<option value={1024}>1,024 Tokens</option>
								<option value={2048}>2,048 Tokens</option>
								<option value={4096}>4,096 Tokens</option>
								<option value={8192}>8,192 Tokens</option>
							</select>
						</div>
					</div>

					{endpointKind !== 'vite-proxy' && (
						<p className="text-[9px] text-muted-foreground">
							Endpoint type: <span className="text-foreground">{getEndpointLabel(endpointKind)}</span>
						</p>
					)}
					</div>

					<div className="app-header-glass shrink-0 flex items-center justify-between border-t border-border/40 p-4">
					<button
						type="button"
						onClick={handleReset}
						className="btn-ghost flex items-center gap-1.5 rounded-xl px-3 py-2"
					>
						<RotateCcw className="w-3.5 h-3.5" />
						<span>Reset Defaults</span>
					</button>

					<div className="flex gap-2">
						<button
							type="button"
							onClick={onClose}
							className="btn-ghost rounded-xl px-4 py-2"
						>
							Cancel
						</button>
						<button
							type="submit"
							onClick={(e) => {
								e.preventDefault()
								handleSave(e)
							}}
							className="btn-primary flex items-center gap-2 rounded-xl px-5 py-2 font-semibold transition-all"
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
