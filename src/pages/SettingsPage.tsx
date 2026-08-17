import {
	Bell,
	Brain,
	Columns,
	Mic,
	PlugZap,
	RefreshCw,
	Save,
	Sparkles,
	Trash2,
	UserRound,
	Volume2,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LocalConnectionSettings } from '@/components/settings/LocalConnectionSettings'
import { OllamaModelsList } from '@/components/settings/OllamaModelsList'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePreferencesContext, useTextToSpeechContext, useMainConversationContext, useChatGenerationContext } from '@/providers/ChatProvider'
import {
	requestBackgroundReminderNotificationPermission,
	syncBackgroundReminderNotifications,
} from '@/services/reminders/reminderBackgroundNotifications'
import { canUseNotificationTriggers } from '@/services/reminders/reminderNotificationTriggers'
import { GEMINI_TTS_VOICES } from '@/services/gemini/ttsVoices'
import {
	MEMORY_ARCHIVE_INTERVAL_OPTIONS,
	type MemoryArchiveInterval,
	type TtsReadAloudMode,
} from '@/storage/types'
import {
	getActiveGeminiApiKey,
} from '@/storage/geminiApiKeys'
import {
	canUseNotifications,
	getNotificationPermission,
	isStandaloneDisplayMode,
	requestNotificationPermission,
} from '@/utils/notifications'
import { isCapacitorNativePlatform } from '@/utils/capacitor'
import { cn } from '@/utils/cn'
import { clearAllMemory } from '@/services/memory/memoryService'
import {
	getUnarchivedMessages,
	runManualMemoryArchive,
} from '@/services/memory/memoryArchive'
import {
	resolveSettingsTabFromParams,
	type SettingsTab,
} from '@/navigation/swipeNav'

const SETTINGS_TABS = [
	{ id: 'profile', label: 'Profile', icon: UserRound },
	{ id: 'memory', label: 'Memory', icon: Brain },
	{ id: 'api', label: 'Local', icon: PlugZap },
	{ id: 'voice', label: 'Voice', icon: Volume2 },
	{ id: 'app', label: 'App', icon: Bell },
] as const

const MANUAL_ARCHIVE_CONFIRM_BATCHES = 3

export function SettingsPage() {
	const [searchParams, setSearchParams] = useSearchParams()
	const activeTab = resolveSettingsTabFromParams(searchParams)

	const { preferences, savePreferences, isLoading } = usePreferencesContext()
	const { conversation, saveConversation } = useMainConversationContext()
	const { previewVoice, status: speechStatus } = useTextToSpeechContext()
	const { memoryArchiveError, clearMemoryArchiveError } =
		useChatGenerationContext()
	const [userName, setUserName] = useState('')
	const [aiName, setAiName] = useState('')
	const [aiBehaviorInstructions, setAiBehaviorInstructions] = useState('')
	const [allowMatureContent, setAllowMatureContent] = useState(true)
	const [memoryArchiveInterval, setMemoryArchiveInterval] =
		useState<MemoryArchiveInterval>(20)
	const [ttsReadAloudMode, setTtsReadAloudMode] =
		useState<TtsReadAloudMode>('never')
	const [ttsVoiceName, setTtsVoiceName] = useState('Kore')
	const [savedIdentity, setSavedIdentity] = useState(false)
	const [isSavingIdentity, setIsSavingIdentity] = useState(false)
	const [notificationPermission, setNotificationPermission] = useState(
		getNotificationPermission(),
	)
	const [notificationMessage, setNotificationMessage] = useState<string | null>(
		null,
	)
	const [enableFoldableDualPane, setEnableFoldableDualPane] = useState(true)
	const [forceDualPaneMode, setForceDualPaneMode] = useState(false)
	const [customHingeGap, setCustomHingeGap] = useState(0)
	const [dualPaneMinWidth, setDualPaneMinWidth] = useState(900)
	const [memoryActionMessage, setMemoryActionMessage] = useState<string | null>(
		null,
	)
	const [isClearingMemory, setIsClearingMemory] = useState(false)
	const [isArchivingMemory, setIsArchivingMemory] = useState(false)

	useEffect(() => {
		if (!isLoading) {
			setUserName(preferences.userName)
			setAiName(preferences.aiName)
			setAiBehaviorInstructions(preferences.aiBehaviorInstructions)
			setAllowMatureContent(preferences.allowMatureContent ?? true)
			setMemoryArchiveInterval(preferences.memoryArchiveInterval)
			setTtsReadAloudMode(preferences.ttsReadAloudMode)
			setTtsVoiceName(preferences.ttsVoiceName)
			setEnableFoldableDualPane(preferences.enableFoldableDualPane ?? true)
			setForceDualPaneMode(preferences.forceDualPaneMode ?? false)
			setCustomHingeGap(preferences.customHingeGap ?? 0)
			setDualPaneMinWidth(preferences.dualPaneMinWidth ?? 900)
		}
	}, [isLoading, preferences])

	function setActiveTab(tab: SettingsTab): void {
		setSearchParams(tab === 'profile' ? {} : { tab })
	}

	async function handleSaveIdentity(): Promise<void> {
		setIsSavingIdentity(true)
		setSavedIdentity(false)
		try {
			await savePreferences({
				...preferences,
				userName: userName.trim(),
				aiName: aiName.trim(),
				aiBehaviorInstructions: aiBehaviorInstructions.trim(),
				allowMatureContent,
			})
			setSavedIdentity(true)
		} finally {
			setIsSavingIdentity(false)
		}
	}

	async function handleMemoryIntervalChange(value: number): Promise<void> {
		const interval = MEMORY_ARCHIVE_INTERVAL_OPTIONS.includes(
			value as MemoryArchiveInterval,
		)
			? (value as MemoryArchiveInterval)
			: 20
		setMemoryArchiveInterval(interval)
		await savePreferences({
			...preferences,
			memoryArchiveInterval: interval,
		})
	}

	async function handleTtsReadAloudModeChange(value: TtsReadAloudMode): Promise<void> {
		setTtsReadAloudMode(value)
		await savePreferences({
			...preferences,
			ttsReadAloudMode: value,
		})
	}

	async function handleTtsVoiceChange(value: string): Promise<void> {
		setTtsVoiceName(value)
		await savePreferences({
			...preferences,
			ttsVoiceName: value,
		})
	}

	async function handleFoldablePreferenceChange(
		updates: Partial<{
			enableFoldableDualPane: boolean
			forceDualPaneMode: boolean
			customHingeGap: number
			dualPaneMinWidth: number
		}>,
	): Promise<void> {
		if (updates.enableFoldableDualPane !== undefined) setEnableFoldableDualPane(updates.enableFoldableDualPane)
		if (updates.forceDualPaneMode !== undefined) setForceDualPaneMode(updates.forceDualPaneMode)
		if (updates.customHingeGap !== undefined) setCustomHingeGap(updates.customHingeGap)
		if (updates.dualPaneMinWidth !== undefined) setDualPaneMinWidth(updates.dualPaneMinWidth)

		await savePreferences({
			...preferences,
			...updates,
		})
	}

	async function handleClearMemory(): Promise<void> {
		if (
			!window.confirm(
				'Clear all archived memory? This cannot be undone. Chat messages are not deleted.',
			)
		) {
			return
		}

		setIsClearingMemory(true)
		setMemoryActionMessage(null)
		try {
			await clearAllMemory()
			setMemoryActionMessage('All memory entries cleared.')
		} catch (error) {
			setMemoryActionMessage(
				error instanceof Error ? error.message : 'Could not clear memory.',
			)
		} finally {
			setIsClearingMemory(false)
		}
	}

	async function handleManualMemoryArchive(): Promise<void> {
		if (!conversation) {
			setMemoryActionMessage('No chat history to archive yet.')
			return
		}

		const unarchivedCount = getUnarchivedMessages(conversation).length
		if (unarchivedCount === 0) {
			setMemoryActionMessage('No unarchived chat messages left to process.')
			return
		}

		const batchSize = Math.max(1, memoryArchiveInterval)
		const estimatedBatches = Math.ceil(unarchivedCount / batchSize)
		if (estimatedBatches > MANUAL_ARCHIVE_CONFIRM_BATCHES) {
			const confirmed = window.confirm(
				`Archive now will scan ${unarchivedCount} messages. Continue?`,
			)
			if (!confirmed) {
				return
			}
		}

		setIsArchivingMemory(true)
		setMemoryActionMessage(null)
		clearMemoryArchiveError()
		try {
			const { conversation: updated, result } = await runManualMemoryArchive(
				getActiveGeminiApiKey(preferences),
				conversation,
				preferences,
			)

			if (
				updated.memoryArchiveCursor !== (conversation.memoryArchiveCursor ?? 0)
			) {
				await saveConversation(updated)
			}

			if (result.messagesArchived === 0) {
				setMemoryActionMessage('No chat messages were archived.')
			} else if (result.memoriesAdded === 0) {
				setMemoryActionMessage(
					`Processed ${result.messagesArchived} message${result.messagesArchived === 1 ? '' : 's'} — nothing new worth saving.`,
				)
			} else {
				setMemoryActionMessage(
					`Archived ${result.memoriesAdded} fact${result.memoriesAdded === 1 ? '' : 's'} from ${result.messagesArchived} message${result.messagesArchived === 1 ? '' : 's'}.`,
				)
			}
		} catch (error) {
			setMemoryActionMessage(
				error instanceof Error ? error.message : 'Memory archive failed.',
			)
		} finally {
			setIsArchivingMemory(false)
		}
	}

	async function handleEnableNotifications(): Promise<void> {
		setNotificationMessage(null)

		if (isCapacitorNativePlatform()) {
			const granted = await requestBackgroundReminderNotificationPermission()
			setNotificationPermission(granted ? 'granted' : 'denied')

			if (granted) {
				await syncBackgroundReminderNotifications(preferences)
				setNotificationMessage(
					'Notifications enabled. Scheduled reminders can alert you while the Android app is closed.',
				)
				return
			}

			setNotificationMessage(
				'Notifications are blocked. Enable them in Android settings for PersonalAI.',
			)
			return
		}

		if (!canUseNotifications()) {
			setNotificationMessage('Notifications are not supported in this browser.')
			return
		}

		const permission = await requestNotificationPermission()
		setNotificationPermission(permission)

		if (permission === 'granted') {
			await syncBackgroundReminderNotifications(preferences)
			setNotificationMessage(
				canUseNotificationTriggers() && isStandaloneDisplayMode()
					? 'Notifications enabled. Chat replies and scheduled reminders can alert you while the app is closed on this Android install.'
					: 'Notifications enabled. You will get system alerts when a reply finishes in the background.',
			)
			return
		}

		if (permission === 'denied') {
			setNotificationMessage(
				'Notifications are blocked. Enable them in Android app settings for this PWA or Chrome.',
			)
			return
		}

		setNotificationMessage('Notification permission was not granted.')
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<header className="shrink-0 border-b border-border/80 px-4 py-3 md:px-6">
				<div className="library-section-tabs flex gap-1 overflow-x-auto rounded-xl p-1">
					{SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							type="button"
							onClick={() => setActiveTab(id)}
							className={cn(
								'inline-flex min-w-[4.5rem] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:text-sm',
								activeTab === id
									? 'surface-tab-active text-foreground'
									: 'text-muted-foreground hover:text-foreground',
							)}
						>
							<Icon className="h-4 w-4 shrink-0" />
							<span className="truncate">{label}</span>
						</button>
					))}
				</div>
			</header>

			<ScrollArea className="min-h-0 flex-1">
				<div className="mx-auto w-full max-w-2xl px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-6 md:py-6">
					{activeTab === 'profile' ? (
						<ProfileTab
							userName={userName}
							aiName={aiName}
							aiBehaviorInstructions={aiBehaviorInstructions}
							allowMatureContent={allowMatureContent}
							savedIdentity={savedIdentity}
							isSavingIdentity={isSavingIdentity}
							onUserNameChange={(value) => {
								setUserName(value)
								setSavedIdentity(false)
							}}
							onAiNameChange={(value) => {
								setAiName(value)
								setSavedIdentity(false)
							}}
							onBehaviorChange={(value) => {
								setAiBehaviorInstructions(value)
								setSavedIdentity(false)
							}}
							onAllowMatureContentChange={(value) => {
								setAllowMatureContent(value)
								setSavedIdentity(false)
							}}
							onSave={() => void handleSaveIdentity()}
						/>
					) : null}

					{activeTab === 'memory' ? (
						<MemoryTab
							memoryArchiveInterval={memoryArchiveInterval}
							unarchivedMessageCount={
								conversation ? getUnarchivedMessages(conversation).length : 0
							}
							hasApiKey={false}
							isClearingMemory={isClearingMemory}
							isArchivingMemory={isArchivingMemory}
							actionMessage={memoryActionMessage}
							memoryArchiveError={memoryArchiveError}
							onDismissArchiveError={clearMemoryArchiveError}
							onIntervalChange={(value) => void handleMemoryIntervalChange(value)}
							onClearMemory={() => void handleClearMemory()}
							onManualArchive={() => void handleManualMemoryArchive()}
						/>
					) : null}

					{activeTab === 'api' ? (
						<LocalTab />
					) : null}

					{activeTab === 'voice' ? (
						<VoiceTab
							ttsReadAloudMode={ttsReadAloudMode}
							ttsVoiceName={ttsVoiceName}
							hasApiKey={false}
							speechStatus={speechStatus}
							onReadAloudModeChange={(value) =>
								void handleTtsReadAloudModeChange(value)
							}
							onVoiceChange={(value) => void handleTtsVoiceChange(value)}
							onPreview={() => void previewVoice(ttsVoiceName)}
						/>
					) : null}

					{activeTab === 'app' ? (
						<AppTab
							notificationPermission={notificationPermission}
							notificationMessage={notificationMessage}
							enableFoldableDualPane={enableFoldableDualPane}
							forceDualPaneMode={forceDualPaneMode}
							customHingeGap={customHingeGap}
							dualPaneMinWidth={dualPaneMinWidth}
							onEnableNotifications={() => void handleEnableNotifications()}
							onFoldableChange={(updates) =>
								void handleFoldablePreferenceChange(updates)
							}
						/>
					) : null}
				</div>
			</ScrollArea>
		</div>
	)
}

function ProfileTab({
	userName,
	aiName,
	aiBehaviorInstructions,
	allowMatureContent,
	savedIdentity,
	isSavingIdentity,
	onUserNameChange,
	onAiNameChange,
	onBehaviorChange,
	onAllowMatureContentChange,
	onSave,
}: {
	userName: string
	aiName: string
	aiBehaviorInstructions: string
	allowMatureContent: boolean
	savedIdentity: boolean
	isSavingIdentity: boolean
	onUserNameChange: (value: string) => void
	onAiNameChange: (value: string) => void
	onBehaviorChange: (value: string) => void
	onAllowMatureContentChange: (value: boolean) => void
	onSave: () => void
}) {
	return (
		<div className="space-y-5">
			<TabIntro
				title="Profile & personality"
				description="How you and your assistant are named, and how replies should feel."
			/>

			<section className="surface-panel space-y-5 rounded-xl p-5">
				<div className="grid gap-5 sm:grid-cols-2">
					<FieldGroup
						icon={UserRound}
						label="Your name"
						hint="What the assistant should call you."
					>
						<input
							value={userName}
							onChange={(event) => onUserNameChange(event.target.value)}
							placeholder="Your name"
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</FieldGroup>

					<FieldGroup
						icon={Sparkles}
						label="AI name"
						hint="Shown in the app header and chat."
					>
						<input
							value={aiName}
							onChange={(event) => onAiNameChange(event.target.value)}
							placeholder="Assistant"
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</FieldGroup>
				</div>

				<FieldGroup
					label="How should your AI respond?"
					hint='Traits like "Warm, witty, direct, British English" — or a longer custom prompt.'
				>
					<textarea
						value={aiBehaviorInstructions}
						onChange={(event) => onBehaviorChange(event.target.value)}
						rows={6}
						placeholder="Warm, conversational, witty, direct, British English"
						className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
					/>
				</FieldGroup>

				<label className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm">
					<input
						type="checkbox"
						checked={allowMatureContent}
						onChange={(event) => onAllowMatureContentChange(event.target.checked)}
						className="mt-0.5"
					/>
					<span>
						<span className="block font-medium">Allow mature content</span>
						<span className="mt-1 block text-muted-foreground">
							Matches your tone (including swearing) in the local model system prompt.
							Turn off for stricter filtering in generated images and documents.
						</span>
					</span>
				</label>

				<div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
					<Button onClick={onSave} disabled={isSavingIdentity}>
						<Save className="h-4 w-4" />
						{isSavingIdentity ? 'Saving…' : 'Save profile'}
					</Button>
					{savedIdentity ? (
						<span className="text-sm text-primary">Profile saved</span>
					) : null}
				</div>
			</section>
		</div>
	)
}

function MemoryTab({
	memoryArchiveInterval,
	unarchivedMessageCount,
	hasApiKey,
	isClearingMemory,
	isArchivingMemory,
	actionMessage,
	memoryArchiveError,
	onDismissArchiveError,
	onIntervalChange,
	onClearMemory,
	onManualArchive,
}: {
	memoryArchiveInterval: MemoryArchiveInterval
	unarchivedMessageCount: number
	hasApiKey: boolean
	isClearingMemory: boolean
	isArchivingMemory: boolean
	actionMessage: string | null
	memoryArchiveError: string | null
	onDismissArchiveError: () => void
	onIntervalChange: (value: number) => void
	onClearMemory: () => void
	onManualArchive: () => void
}) {
	return (
		<div className="space-y-5">
			<TabIntro
				title="Memory"
				description="Control how often chat facts get archived for future conversations."
			/>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<p className="text-sm text-muted-foreground">
					Memory archival from chat is not enabled in local-only mode.
				</p>

				<div className="space-y-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Archive every</span>
						<span className="font-medium">{memoryArchiveInterval} messages</span>
					</div>
					<input
						type="range"
						min={0}
						max={MEMORY_ARCHIVE_INTERVAL_OPTIONS.length - 1}
						step={1}
						value={Math.max(
							0,
							MEMORY_ARCHIVE_INTERVAL_OPTIONS.indexOf(memoryArchiveInterval),
						)}
						onChange={(event) => {
							const index = Number(event.target.value)
							const next = MEMORY_ARCHIVE_INTERVAL_OPTIONS[index] ?? 20
							onIntervalChange(next)
						}}
						className="w-full accent-primary"
					/>
					<div className="flex justify-between text-xs text-muted-foreground">
						{MEMORY_ARCHIVE_INTERVAL_OPTIONS.map((option) => (
							<span key={option}>{option}</span>
						))}
					</div>
				</div>
			</section>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<h3 className="text-sm font-medium">Manual actions</h3>
				<p className="text-sm text-muted-foreground">
					{unarchivedMessageCount > 0
						? `${unarchivedMessageCount} chat message${unarchivedMessageCount === 1 ? '' : 's'} not yet scanned for memory.`
						: 'All chat messages have already been scanned.'}
				</p>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={onManualArchive}
						disabled={isArchivingMemory || !hasApiKey || unarchivedMessageCount === 0}
					>
						<RefreshCw
							className={cn('h-4 w-4', isArchivingMemory && 'animate-spin')}
						/>
						{isArchivingMemory ? 'Archiving…' : 'Archive now'}
					</Button>
					<Button
						type="button"
						variant="outline"
						className="text-destructive hover:text-destructive"
						onClick={onClearMemory}
						disabled={isClearingMemory}
					>
						<Trash2 className="h-4 w-4" />
						{isClearingMemory ? 'Clearing…' : 'Clear memory'}
					</Button>
				</div>
					<p className="text-xs text-muted-foreground">
						Memory archival from chat is unavailable without a cloud AI provider.
					</p>
				{actionMessage ? (
					<p className="text-sm text-muted-foreground">{actionMessage}</p>
				) : null}
				{memoryArchiveError ? (
					<div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
						<p>Automatic memory archival failed: {memoryArchiveError}</p>
						<p className="mt-1 text-muted-foreground">
							Chat history may be growing larger until this succeeds. Try Archive
							now or check your API key and quota.
						</p>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="mt-2 h-7 px-2 text-destructive"
							onClick={onDismissArchiveError}
						>
							Dismiss
						</Button>
					</div>
				) : null}
			</section>

			<section className="surface-panel rounded-xl p-5">
				<p className="text-sm text-muted-foreground">
					<Link
						to="/memory"
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						Open Memory
					</Link>{' '}
					to browse archived facts from chat.
				</p>
			</section>
		</div>
	)
}

function LocalTab() {
	return (
		<div className="space-y-5">
			<TabIntro
				title="Local models & server"
				description="Ollama on your machine, synced through the PersonalAI backend."
			/>
			<LocalConnectionSettings />
			<OllamaModelsList />
		</div>
	)
}


function VoiceTab({
	ttsReadAloudMode,
	ttsVoiceName,
	hasApiKey,
	speechStatus,
	onReadAloudModeChange,
	onVoiceChange,
	onPreview,
}: {
	ttsReadAloudMode: TtsReadAloudMode
	ttsVoiceName: string
	hasApiKey: boolean
	speechStatus: string
	onReadAloudModeChange: (value: TtsReadAloudMode) => void
	onVoiceChange: (value: string) => void
	onPreview: () => void
}) {
	return (
		<div className="space-y-5">
			<TabIntro
				title="Voice"
				description="Speech-to-text input and text-to-speech playback for assistant replies."
			/>

			<section className="surface-panel space-y-3 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Mic className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">Voice input</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					On Android, voice input is not configured for local-only chat yet.
				</p>
				<p className="text-sm text-muted-foreground">
					Tap the mic, speak, then tap Continue. If voice input fails in an
					installed app, try opening the site in Chrome instead of the home-screen
					shortcut.
				</p>
			</section>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Volume2 className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">Voice output</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					Read-aloud for assistant replies is not enabled in local-only mode.
				</p>

				<div className="space-y-2">
					<label htmlFor="tts-read-aloud-mode" className="text-sm font-medium">
						Read responses aloud
					</label>
					<select
						id="tts-read-aloud-mode"
						value={ttsReadAloudMode}
						onChange={(event) => {
							onReadAloudModeChange(event.target.value as TtsReadAloudMode)
						}}
						className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
					>
						<option value="never">Never</option>
						<option value="after_speech">When I use the microphone</option>
						<option value="always">Always</option>
					</select>
					{ttsReadAloudMode === 'always' ? (
						<p className="text-xs text-muted-foreground">
							Always read aloud uses browser speech when available.
						</p>
					) : null}
				</div>

				<div className="space-y-2">
					<label htmlFor="tts-voice-name" className="text-sm font-medium">
						Speaking voice
					</label>
					<div className="flex flex-wrap items-center gap-3">
						<select
							id="tts-voice-name"
							value={ttsVoiceName}
							onChange={(event) => onVoiceChange(event.target.value)}
							className="min-w-0 flex-1 rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						>
							{GEMINI_TTS_VOICES.map((voice) => (
								<option key={voice.name} value={voice.name}>
									{voice.name} — {voice.description}
								</option>
							))}
						</select>
						<Button
							type="button"
							variant="outline"
							disabled={
								!hasApiKey ||
								speechStatus === 'loading' ||
								speechStatus === 'playing'
							}
							onClick={onPreview}
						>
							<Volume2 className="h-4 w-4" />
							{speechStatus === 'loading' ? 'Loading…' : 'Preview'}
						</Button>
					</div>
					<p className="text-sm text-muted-foreground">
						Preview uses browser speech synthesis when available.
					</p>
				</div>
			</section>

			<section className="surface-panel space-y-3 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Mic className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">Voice conversation</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					In chat, tap the phone icon next to your assistant&apos;s name for
					Conversation Mode. A short explanation appears before you start.
				</p>
			</section>
		</div>
	)
}

function AppTab({
	notificationPermission,
	notificationMessage,
	enableFoldableDualPane,
	forceDualPaneMode,
	customHingeGap,
	dualPaneMinWidth,
	onEnableNotifications,
	onFoldableChange,
}: {
	notificationPermission: NotificationPermission
	notificationMessage: string | null
	enableFoldableDualPane: boolean
	forceDualPaneMode: boolean
	customHingeGap: number
	dualPaneMinWidth: number
	onEnableNotifications: () => void
	onFoldableChange: (updates: Partial<{
		enableFoldableDualPane: boolean
		forceDualPaneMode: boolean
		customHingeGap: number
		dualPaneMinWidth: number
	}>) => void
}) {
	return (
		<div className="space-y-5">
			<TabIntro
				title="App behaviour"
				description="Notifications, Dual-Pane & Foldables, and background settings."
			/>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Columns className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">Foldable & Split Screen Dual-Pane View</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					Enables dynamic side-by-side multi-pane layouts on wide screens, foldable screens (Galaxy Z Fold, Surface Duo, Pixel Fold), and tablets.
				</p>

				<div className="space-y-3">
					<label className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm">
						<input
							type="checkbox"
							checked={enableFoldableDualPane}
							onChange={(e) => onFoldableChange({ enableFoldableDualPane: e.target.checked })}
							className="mt-0.5"
						/>
						<span>
							<span className="block font-medium">Auto-enable Dual-Pane View</span>
							<span className="mt-1 block text-muted-foreground">
								Automatically switch to split view when on foldable screens or screens wider than the min-width threshold.
							</span>
						</span>
					</label>

					<label className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-3 text-sm">
						<input
							type="checkbox"
							checked={forceDualPaneMode}
							onChange={(e) => onFoldableChange({ forceDualPaneMode: e.target.checked })}
							className="mt-0.5"
						/>
						<span>
							<span className="block font-medium">Force Dual-Pane Mode</span>
							<span className="mt-1 block text-muted-foreground">
								Always split the screen regardless of device size or viewport orientation (ideal for testing multi-pane).
							</span>
						</span>
					</label>

					<div className="space-y-2 pt-2">
						<div className="flex items-center justify-between text-sm">
							<span className="font-medium">Min-Width Activation Threshold</span>
							<span className="font-mono text-xs text-muted-foreground">{dualPaneMinWidth}px</span>
						</div>
						<input
							type="range"
							min={600}
							max={1400}
							step={50}
							value={dualPaneMinWidth}
							onChange={(e) => onFoldableChange({ dualPaneMinWidth: Number(e.target.value) })}
							className="w-full accent-primary"
						/>
					</div>

					<div className="space-y-2 pt-2">
						<div className="flex items-center justify-between text-sm">
							<span className="font-medium">Custom Physical Hinge Gap Offset</span>
							<span className="font-mono text-xs text-muted-foreground">{customHingeGap}px</span>
						</div>
						<input
							type="range"
							min={0}
							max={40}
							step={2}
							value={customHingeGap}
							onChange={(e) => onFoldableChange({ customHingeGap: Number(e.target.value) })}
							className="w-full accent-primary"
						/>
					</div>
				</div>
			</section>

			<section className="surface-panel space-y-4 rounded-xl p-5">
				<div className="flex items-center gap-2">
					<Bell className="h-5 w-5 text-primary" />
					<h3 className="text-sm font-medium">System notifications</h3>
				</div>
				<p className="text-sm text-muted-foreground">
					Get a phone notification when a chat reply finishes while you are in
					another app or browsing elsewhere in the PWA. Tap it to jump back to
					chat.
				</p>
				<p className="text-sm text-muted-foreground">
					Status:{' '}
					<span className="font-medium text-foreground">
						{notificationPermission === 'granted'
							? 'Enabled'
							: notificationPermission === 'denied'
								? 'Blocked'
								: 'Not enabled yet'}
					</span>
				</p>
				{notificationPermission !== 'granted' ? (
					<Button variant="outline" onClick={onEnableNotifications}>
						<Bell className="h-4 w-4" />
						Enable notifications
					</Button>
				) : null}
				{notificationMessage ? (
					<p className="text-sm text-muted-foreground">{notificationMessage}</p>
				) : null}
			</section>

			<section className="surface-panel space-y-3 rounded-xl p-5">
				<h3 className="text-sm font-medium">Scheduled reminders</h3>
				<p className="text-sm text-muted-foreground">
					Library → Schedule stores reminders on this device. When one is due,
					the assistant posts a chat message and can show a system notification.
				</p>
				<p className="text-sm text-muted-foreground">
					{isCapacitorNativePlatform()
						? notificationPermission === 'granted'
							? 'The Android app can fire reminder alerts while it is closed. Tap the notification to open chat and deliver the message.'
							: 'Enable notifications above so scheduled reminders can alert you while the app is closed.'
						: canUseNotificationTriggers() && isStandaloneDisplayMode()
							? notificationPermission === 'granted'
								? 'This Android install can fire reminder alerts while the PWA is closed. Tap the notification or reopen the app to deliver the chat message.'
								: 'Enable notifications above to schedule background reminder alerts on Android.'
							: 'For reliable background reminders, install the Android app (Capacitor). In the browser, keep the app open for on-time delivery.'}
				</p>
			</section>

			<section className="surface-panel space-y-3 rounded-xl p-5">
				<h3 className="text-sm font-medium">Background replies</h3>
				<p className="text-sm text-muted-foreground">
					Chat keeps generating if you switch tabs. You will see an in-app banner
					while a reply is in progress. With notifications enabled, Android also
					shows a system tray alert when the reply is ready.
				</p>
			</section>
		</div>
	)
}

function TabIntro({
	title,
	description,
}: {
	title: string
	description: string
}) {
	return (
		<div>
			<h2 className="text-lg font-semibold">{title}</h2>
			<p className="mt-1 text-sm text-muted-foreground">{description}</p>
		</div>
	)
}

function FieldGroup({
	icon: Icon,
	label,
	hint,
	children,
}: {
	icon?: typeof UserRound
	label: string
	hint?: ReactNode
	children: ReactNode
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				{Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
				<label className="text-sm font-medium">{label}</label>
			</div>
			{hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
			{children}
		</div>
	)
}
