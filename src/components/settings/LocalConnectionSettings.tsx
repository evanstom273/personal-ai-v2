import { useEffect, useState } from 'react'
import {
	Check,
	Database,
	HardDrive,
	Link2,
	Loader2,
	Network,
	Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DEFAULT_SETTINGS,
	testOllamaConnection,
} from '@/services/ollamaService'
import {
	cachePersonalaiHost,
	fetchServerSettings,
	loadCachedPersonalaiHost,
	saveServerSettings,
	testPersonalaiConnection,
} from '@/services/personalaiApi'
import type { ChatSettings } from '@/types/serverChat'
import {
	buildTailscaleServeUrl,
	classifyOllamaHost,
	getEndpointLabel,
	isTailscaleServeUrl,
	parseTailscaleServeUrl,
} from '@/utils/ollamaEndpoint'

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

export function LocalConnectionSettings() {
	const [formData, setFormData] = useState<ChatSettings>(DEFAULT_SETTINGS)
	const [saved, setSaved] = useState(false)
	const [testStatus, setTestStatus] = useState<TestStatus>('idle')
	const [testMessage, setTestMessage] = useState('')
	const [testHint, setTestHint] = useState('')
	const [serverTestStatus, setServerTestStatus] = useState<TestStatus>('idle')
	const [serverTestMessage, setServerTestMessage] = useState('')
	const [serverTestHint, setServerTestHint] = useState('')

	useEffect(() => {
		const host = loadCachedPersonalaiHost()
		void fetchServerSettings(host).then((settings) => {
			setFormData({ ...DEFAULT_SETTINGS, ...settings })
		})
	}, [])

	const endpointKind = classifyOllamaHost(formData.ollamaHost)
	const isTailscale = isTailscaleServeUrl(formData.ollamaHost)

	const handleSave = async () => {
		const host = formData.personalaiHost || loadCachedPersonalaiHost()
		await saveServerSettings(host, formData)
		if (formData.personalaiHost) cachePersonalaiHost(formData.personalaiHost)
		setSaved(true)
		setTimeout(() => setSaved(false), 2000)
	}

	const handleApplyTailscaleUrl = () => {
		try {
			const url = buildTailscaleServeUrl(
				formData.tailscaleMachine,
				formData.tailscaleTailnet,
			)
			setFormData({ ...formData, personalaiHost: url, ollamaHost: '' })
			setServerTestStatus('idle')
			setTestStatus('idle')
			setServerTestHint(
				'Tailscale Serve URL applied. Start serve on port 3847, then test.',
			)
		} catch (err) {
			setServerTestStatus('error')
			setServerTestMessage(
				err instanceof Error ? err.message : 'Invalid Tailscale settings',
			)
		}
	}

	const handleTestServerConnection = async () => {
		setServerTestStatus('testing')
		setServerTestMessage('')
		setServerTestHint('')
		const result = await testPersonalaiConnection(formData.personalaiHost)
		if (result.ok) {
			setServerTestStatus('success')
			setServerTestMessage(
				`PersonalAI online · ${result.latencyMs}ms${result.ollama ? ' · Ollama reachable' : ''}`,
			)
		} else {
			setServerTestStatus('error')
			setServerTestMessage(result.error || 'Server connection failed')
			setServerTestHint('Start the PersonalAI backend and verify Tailscale Serve.')
		}
	}

	const handleTestConnection = async () => {
		setTestStatus('testing')
		setTestMessage('')
		setTestHint('')
		const result = await testOllamaConnection(formData.ollamaHost)
		if (result.ok) {
			setTestStatus('success')
			setTestMessage(
				`Connected (${result.endpointLabel}) · ${result.latencyMs}ms · ${result.modelCount ?? 0} model(s)`,
			)
			if (result.modelNames?.length) {
				setTestHint(
					`Models: ${result.modelNames.slice(0, 4).join(', ')}${result.modelNames.length > 4 ? '…' : ''}`,
				)
			}
		} else {
			setTestStatus('error')
			setTestMessage(result.error || 'Connection failed')
			setTestHint(result.hint || '')
		}
	}

	return (
		<section className="surface-panel space-y-4 rounded-xl p-5">
			<div>
				<h3 className="text-sm font-medium">Local Ollama & PersonalAI server</h3>
				<p className="text-sm text-muted-foreground">
					Chat uses your local Ollama models through the PersonalAI backend (SQLite on your machine).
				</p>
			</div>

			<div className="space-y-3">
				<label className="text-xs font-medium text-muted-foreground">
					PersonalAI server host
				</label>
				<input
					value={formData.personalaiHost}
					onChange={(e) =>
						setFormData({
							...formData,
							personalaiHost: e.target.value,
							tailscaleMachine:
								parseTailscaleServeUrl(e.target.value)?.machine ??
								formData.tailscaleMachine,
							tailscaleTailnet:
								parseTailscaleServeUrl(e.target.value)?.tailnet ??
								formData.tailscaleTailnet,
						})
					}
					placeholder="https://your-machine.tailnet.ts.net or leave empty for same-origin"
					className="surface-input w-full rounded-lg px-3 py-2 text-sm"
				/>
				<div className="grid gap-2 sm:grid-cols-2">
					<input
						value={formData.tailscaleMachine}
						onChange={(e) =>
							setFormData({ ...formData, tailscaleMachine: e.target.value })
						}
						placeholder="Tailscale machine name"
						className="surface-input rounded-lg px-3 py-2 text-sm"
					/>
					<input
						value={formData.tailscaleTailnet}
						onChange={(e) =>
							setFormData({ ...formData, tailscaleTailnet: e.target.value })
						}
						placeholder="Tailnet (e.g. tail12345.ts.net)"
						className="surface-input rounded-lg px-3 py-2 text-sm"
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" size="sm" onClick={handleApplyTailscaleUrl}>
						<Link2 className="h-4 w-4" />
						Apply Tailscale URL
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void handleTestServerConnection()}
					>
						{serverTestStatus === 'testing' ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Server className="h-4 w-4" />
						)}
						Test server
					</Button>
				</div>
				{serverTestMessage ? (
					<p
						className={`text-xs ${serverTestStatus === 'error' ? 'text-destructive' : 'text-emerald-400'}`}
					>
						{serverTestMessage}
					</p>
				) : null}
				{serverTestHint ? (
					<p className="text-xs text-muted-foreground">{serverTestHint}</p>
				) : null}
			</div>

			<div className="space-y-3 border-t border-border/60 pt-4">
				<label className="text-xs font-medium text-muted-foreground">
					Direct Ollama host (optional override)
				</label>
				<input
					value={formData.ollamaHost}
					onChange={(e) => setFormData({ ...formData, ollamaHost: e.target.value })}
					placeholder="Leave empty to use server proxy"
					className="surface-input w-full rounded-lg px-3 py-2 text-sm"
				/>
				<p className="text-xs text-muted-foreground">
					{getEndpointLabel(endpointKind)}
					{isTailscale ? ' · Tailscale Serve detected' : ''}
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void handleTestConnection()}
				>
					{testStatus === 'testing' ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Network className="h-4 w-4" />
					)}
					Test Ollama
				</Button>
				{testMessage ? (
					<p
						className={`text-xs ${testStatus === 'error' ? 'text-destructive' : 'text-emerald-400'}`}
					>
						{testMessage}
					</p>
				) : null}
				{testHint ? <p className="text-xs text-muted-foreground">{testHint}</p> : null}
			</div>

			<div className="grid gap-3 sm:grid-cols-2 border-t border-border/60 pt-4">
				<div>
					<label className="text-xs text-muted-foreground">Temperature</label>
					<input
						type="number"
						min={0}
						max={2}
						step={0.1}
						value={formData.temperature}
						onChange={(e) =>
							setFormData({ ...formData, temperature: Number(e.target.value) })
						}
						className="surface-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label className="text-xs text-muted-foreground">Context window</label>
					<input
						type="number"
						value={formData.contextWindow}
						onChange={(e) =>
							setFormData({ ...formData, contextWindow: Number(e.target.value) })
						}
						className="surface-input mt-1 w-full rounded-lg px-3 py-2 text-sm"
					/>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Button type="button" size="sm" onClick={() => void handleSave()}>
					{saved ? <Check className="h-4 w-4" /> : <Database className="h-4 w-4" />}
					{saved ? 'Saved' : 'Save local settings'}
				</Button>
				{saved ? (
					<span className="text-xs text-emerald-400">Settings saved to server</span>
				) : null}
			</div>

			<div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
				<HardDrive className="mt-0.5 h-4 w-4 shrink-0" />
				<p>Chat uses local Ollama models only. Documents and other features may use on-device storage.</p>
			</div>
		</section>
	)
}
