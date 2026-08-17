import {
	ArrowDown,
	Bot,
	ExternalLink,
	FileText,
	Loader2,
	Music,
	User,
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChatMarkdown } from '@/components/chat/ChatMarkdown'
import { MessageActions } from '@/components/chat/MessageActions'
import { MediaLightbox } from '@/components/media/MediaLightbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFoldablePane } from '@/hooks/useFoldablePane'
import type { MessageDocumentLink, StoredMessage } from '@/storage/types'
import type { TtsPlaybackStatus } from '@/hooks/useTextToSpeech'
import { formatMessageTime } from '@/utils/dateTime'
import { readChatScrollTop, saveChatScrollTop } from '@/utils/chatScrollState'
import { cn } from '@/utils/cn'

const BOTTOM_THRESHOLD_PX = 80

interface ChatMessagesProps {
	messages: StoredMessage[]
	streamingAssistant?: {
		id: string
		content: string
	} | null
	isGenerating: boolean
	aiName: string
	editingMessageId?: string | null
	onEditUserMessage?: (message: StoredMessage) => void
	onConfirmDelete: (
		messageId: string,
		documentId: string,
		documentTitle: string,
	) => void
	onCancelDelete: (messageId: string) => void
	activeSpeechMessageId?: string | null
	speechStatus?: TtsPlaybackStatus
	onSpeakMessage?: (message: StoredMessage) => void
	onStopSpeech?: () => void
	speechDisabled?: boolean
	streamingSlot?: ReactNode
}

export function ChatMessages({
	messages,
	streamingAssistant,
	isGenerating,
	aiName,
	editingMessageId = null,
	onEditUserMessage,
	onConfirmDelete,
	onCancelDelete,
	activeSpeechMessageId = null,
	speechStatus = 'idle',
	onSpeakMessage,
	onStopSpeech,
	speechDisabled = false,
	streamingSlot,
}: ChatMessagesProps) {
	const viewportRef = useRef<HTMLDivElement>(null)
	const previousMessageCountRef = useRef(messages.length)
	const hasRestoredScrollRef = useRef(false)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)

	const isNearBottom = useCallback((viewport: HTMLElement): boolean => {
		return (
			viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <=
			BOTTOM_THRESHOLD_PX
		)
	}, [])

	const updateScrollButtonVisibility = useCallback(() => {
		const viewport = viewportRef.current
		if (!viewport) {
			return
		}

		setShowScrollToBottom(!isNearBottom(viewport))
	}, [isNearBottom])

	const scrollToBottom = useCallback(
		(behavior: ScrollBehavior = 'smooth') => {
			const viewport = viewportRef.current
			if (!viewport) {
				return
			}

			viewport.scrollTo({
				top: viewport.scrollHeight,
				behavior,
			})
			saveChatScrollTop(viewport.scrollHeight)
			setShowScrollToBottom(false)
		},
		[],
	)

	useLayoutEffect(() => {
		if (hasRestoredScrollRef.current) {
			return
		}

		const viewport = viewportRef.current
		if (!viewport) {
			return
		}

		const savedScrollTop = readChatScrollTop()
		if (savedScrollTop !== null) {
			viewport.scrollTop = savedScrollTop
			updateScrollButtonVisibility()
			hasRestoredScrollRef.current = true
			return
		}

		if (messages.length > 0 || streamingAssistant || isGenerating) {
			viewport.scrollTop = viewport.scrollHeight
			updateScrollButtonVisibility()
		}

		hasRestoredScrollRef.current = true
	}, [
		isGenerating,
		messages.length,
		streamingAssistant,
		updateScrollButtonVisibility,
	])

	useEffect(() => {
		const viewport = viewportRef.current
		if (!viewport) {
			return
		}

		function handleScroll(): void {
			saveChatScrollTop(viewport!.scrollTop)
			updateScrollButtonVisibility()
		}

		viewport.addEventListener('scroll', handleScroll, { passive: true })
		return () => {
			viewport.removeEventListener('scroll', handleScroll)
		}
	}, [updateScrollButtonVisibility])

	useEffect(() => {
		return () => {
			const viewport = viewportRef.current
			if (viewport) {
				saveChatScrollTop(viewport.scrollTop)
			}
		}
	}, [])

	useEffect(() => {
		if (messages.length <= previousMessageCountRef.current) {
			previousMessageCountRef.current = messages.length
			return
		}

		const lastMessage = messages[messages.length - 1]
		previousMessageCountRef.current = messages.length

		if (lastMessage?.role === 'user') {
			scrollToBottom('smooth')
		}
	}, [messages, scrollToBottom])

	useEffect(() => {
		updateScrollButtonVisibility()
	}, [isGenerating, streamingAssistant?.content, updateScrollButtonVisibility])

	if (messages.length === 0 && !isGenerating) {
		return (
			<div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6 text-center">
				<div className="max-w-md space-y-3">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
						<Bot className="h-7 w-7" />
					</div>
					<h2 className="text-lg font-semibold">Your conversation</h2>
					<p className="text-sm text-muted-foreground">
						One continuous thread with {aiName}. Switch between Gemini 3.6
						Flash and 3.1 Pro, ask for document help, or try phrases like
						&quot;generate an image of…&quot; or &quot;generate music&quot;.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
			<ScrollArea viewportRef={viewportRef} className="h-full w-full max-w-full">
				<div className="mx-auto box-border w-full min-w-0 max-w-3xl px-4 py-2 md:px-6">
					{messages.map((message) => (
						<MessageRow
							key={message.id}
							message={message}
							aiName={aiName}
							isEditing={editingMessageId === message.id}
							onEditUserMessage={onEditUserMessage}
							editDisabled={isGenerating}
							onConfirmDelete={onConfirmDelete}
							onCancelDelete={onCancelDelete}
							activeSpeechMessageId={activeSpeechMessageId}
							speechStatus={speechStatus}
							onSpeakMessage={onSpeakMessage}
							onStopSpeech={onStopSpeech}
							speechDisabled={speechDisabled}
						/>
					))}
					{streamingAssistant ? (
						<MessageRow
							message={{
								id: streamingAssistant.id,
								role: 'assistant',
								content: streamingAssistant.content,
								createdAt: Date.now(),
							}}
							aiName={aiName}
							onConfirmDelete={onConfirmDelete}
							onCancelDelete={onCancelDelete}
							isStreaming
							streamingSlot={streamingSlot}
						/>
					) : null}
					{isGenerating && !streamingAssistant ? (
						<div className="flex items-center gap-3 border-t border-border/40 py-6 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							{aiName} is thinking…
						</div>
					) : null}
				</div>
			</ScrollArea>

			{showScrollToBottom ? (
				<div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
					<Button
						type="button"
						size="icon"
						variant="secondary"
						className="pointer-events-auto h-10 w-10 rounded-full shadow-lg ring-1 ring-border"
						onClick={() => scrollToBottom('smooth')}
						aria-label="Scroll to latest message"
					>
						<ArrowDown className="h-4 w-4" />
					</Button>
				</div>
			) : null}
		</div>
	)
}

function MessageRow({
	message,
	aiName,
	onEditUserMessage,
	editDisabled = false,
	isEditing = false,
	onConfirmDelete,
	onCancelDelete,
	activeSpeechMessageId = null,
	speechStatus = 'idle',
	onSpeakMessage,
	onStopSpeech,
	speechDisabled = false,
	isStreaming = false,
	streamingSlot,
}: {
	message: StoredMessage
	aiName: string
	onEditUserMessage?: (message: StoredMessage) => void
	editDisabled?: boolean
	isEditing?: boolean
	onConfirmDelete: ChatMessagesProps['onConfirmDelete']
	onCancelDelete: ChatMessagesProps['onCancelDelete']
	activeSpeechMessageId?: string | null
	speechStatus?: TtsPlaybackStatus
	onSpeakMessage?: (message: StoredMessage) => void
	onStopSpeech?: () => void
	speechDisabled?: boolean
	isStreaming?: boolean
	streamingSlot?: ReactNode
}) {
	const contentRef = useRef<HTMLDivElement>(null)
	const isUser = message.role === 'user'
	const hasMedia = (message.media?.length ?? 0) > 0
	const showMediaFirst = !isUser && hasMedia
	const messageSpeechStatus =
		activeSpeechMessageId === message.id ? speechStatus : 'idle'

	return (
		<article
			className={cn(
				'min-w-0 max-w-full overflow-hidden border-b border-border/40 py-5 last:border-b-0',
				isUser ? 'flex justify-end' : 'flex justify-start',
			)}
		>
			<div
				className={cn(
					'flex min-w-0 max-w-full gap-3 md:gap-4',
					isUser ? 'w-full max-w-[88%] flex-row-reverse' : 'w-full',
				)}
			>
				<MessageAvatar isUser={isUser} aiName={aiName} />

				<div className={cn('min-w-0 flex-1', isUser && 'flex flex-col items-end')}>
					<div
						className={cn(
							'mb-1.5 flex flex-wrap items-center gap-2',
							isUser && 'justify-end',
						)}
					>
						<p className="text-xs font-medium text-muted-foreground">
							{isUser ? 'You' : aiName}
						</p>
						<span className="text-xs text-muted-foreground/80">
							{isStreaming ? 'Now' : formatMessageTime(message.createdAt)}
						</span>
					</div>

					<div
						className={cn(
							'min-w-0 max-w-full overflow-hidden',
							isUser &&
								'rounded-[1.25rem] bg-secondary px-4 py-3 ring-1 ring-border/60',
							isUser && isEditing && 'ring-2 ring-primary/50',
						)}
					>
						{showMediaFirst
							? message.media
									?.filter(
										(item): item is Extract<typeof item, { type: 'image' | 'audio' }> =>
											item.type === 'image' || item.type === 'audio',
									)
									.map((media, index) => (
									<MediaPreview
										key={`${message.id}-media-${index}`}
										media={media}
										className={index === 0 ? '' : 'mt-3'}
									/>
								))
							: null}

						<div
							ref={contentRef}
							tabIndex={-1}
							className={cn(
								'chat-message-content outline-none',
								isUser
									? 'text-sm leading-relaxed whitespace-pre-wrap'
									: 'text-[0.9375rem] leading-7',
								showMediaFirst && message.content.trim() ? 'mt-4' : '',
								isUser && hasMedia && message.content.trim() ? 'mb-3' : '',
							)}
						>
							{isUser ? (
								message.content
							) : streamingSlot && isStreaming ? (
								<div className="space-y-3">
									{streamingSlot}
									{message.content ? (
										<ChatMarkdown content={message.content} />
									) : null}
								</div>
							) : message.content ? (
								<ChatMarkdown content={message.content} />
							) : isStreaming ? (
								<span className="inline-flex items-center gap-2 text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Thinking…
								</span>
							) : null}
						</div>

						{!showMediaFirst
							? message.media
									?.filter(
										(item): item is Extract<typeof item, { type: 'image' | 'audio' }> =>
											item.type === 'image' || item.type === 'audio',
									)
									.map((media, index) => (
									<MediaPreview
										key={`${message.id}-media-${index}`}
										media={media}
										className={index === 0 ? (isUser ? '' : 'mt-4') : 'mt-3'}
									/>
								))
							: null}

						{message.documentLinks?.map((link) => (
							<DocumentLinkCard
								key={`${message.id}-doc-${link.id}`}
								link={link}
							/>
						))}

						{message.pendingDeleteConfirmation ? (
							<div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
								<p className="text-sm">
									Confirm deletion of &quot;
									{message.pendingDeleteConfirmation.documentTitle}&quot;?
								</p>
								<div className="mt-3 flex flex-wrap gap-2">
									<Button
										size="sm"
										variant="destructive"
										onClick={() =>
											onConfirmDelete(
												message.id,
												message.pendingDeleteConfirmation!.documentId,
												message.pendingDeleteConfirmation!.documentTitle,
											)
										}
									>
										Delete document
									</Button>
									<Button
										size="sm"
										variant="outline"
										onClick={() => onCancelDelete(message.id)}
									>
										Cancel
									</Button>
								</div>
							</div>
						) : null}
					</div>

					{!isStreaming ? (
						<MessageActions
							contentRef={contentRef}
							text={message.content}
							className={cn('mt-2', isUser && 'justify-end')}
							onEdit={
								isUser && onEditUserMessage
									? () => onEditUserMessage(message)
									: undefined
							}
							editDisabled={editDisabled}
							onSpeak={
								!isUser && onSpeakMessage && message.content.trim()
									? () => onSpeakMessage(message)
									: undefined
							}
							onStopSpeak={onStopSpeech}
							speakStatus={messageSpeechStatus}
							speakDisabled={speechDisabled}
						/>
					) : null}
				</div>
			</div>
		</article>
	)
}

function MessageAvatar({
	isUser,
	aiName,
}: {
	isUser: boolean
	aiName: string
}) {
	return (
		<div
			className={cn(
				'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
				isUser
					? 'bg-secondary text-secondary-foreground ring-1 ring-border'
					: 'bg-primary/15 text-primary',
			)}
			aria-hidden
			title={isUser ? 'You' : aiName}
		>
			{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
		</div>
	)
}

function DocumentLinkCard({
	link,
	className,
}: {
	link: MessageDocumentLink
	className?: string
}) {
	const { isDualPaneActive, openInSecondaryPane } = useFoldablePane()
	const targetRoute = `/library/documents/${link.id}`

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if (isDualPaneActive) {
			e.preventDefault()
			openInSecondaryPane(targetRoute)
		}
	}

	return (
		<Link
			to={targetRoute}
			onClick={handleClick}
			className={cn(
				'mt-3 flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-secondary/40 px-4 py-3 transition-colors hover:bg-secondary/70',
				className,
			)}
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
				<FileText className="h-5 w-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{link.title}</p>
				<p className="text-xs text-muted-foreground">
					Document {link.action === 'created' ? 'created' : 'updated'}
				</p>
			</div>
			<span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
				Open
				<ExternalLink className="h-3.5 w-3.5" />
			</span>
		</Link>
	)
}

function MediaPreview({
	media,
	className,
}: {
	media: NonNullable<StoredMessage['media']>[number]
	className?: string
}) {
	const label = media.type === 'image' ? 'Image' : 'Music'
	const Icon = media.type === 'audio' ? Music : null

	return (
		<div className={cn('min-w-0 overflow-hidden rounded-xl ring-1 ring-border', className)}>
			<div className="flex items-center gap-2 border-b border-border/60 bg-secondary/40 px-3 py-2 text-xs font-medium text-muted-foreground">
				{Icon ? <Icon className="h-3.5 w-3.5" /> : null}
				{label}
			</div>
			<div className="min-w-0 overflow-hidden bg-background p-2">
				{media.type === 'image' ? (
					<MediaLightbox
						src={media.dataUrl}
						alt="Generated image"
						className="ring-0"
					/>
				) : (
					<audio controls src={media.dataUrl} className="w-full max-w-full" />
				)}
			</div>
		</div>
	)
}
