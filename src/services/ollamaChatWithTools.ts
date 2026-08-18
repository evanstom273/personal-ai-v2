import { MAX_TOOL_ITERATIONS } from '@/services/gemini/constants'
import { buildFullSystemInstruction } from '@/services/gemini/documentContext'
import {
	buildOllamaTools,
	executeAppToolCall,
} from '@/services/gemini/executeAppToolCall'
import { parseThoughtAndContent } from '@/services/ollamaService'
import type { ChatMessage, ChatSettings } from '@/types/serverChat'
import type {
	MessageDocumentLink,
	PendingDeleteConfirmation,
	UserPreferences,
} from '@/storage/types'
import { buildMentionedDocumentsContext } from '@/utils/documentMentionContext'
import { mergeDocumentLinks } from '@/utils/messageAttachments'
import { buildOllamaApiUrl } from '@/utils/ollamaEndpoint'
import { getEffectiveOllamaHost } from '@/utils/personalaiEndpoint'

interface OllamaToolCall {
	function?: {
		name?: string
		arguments?: Record<string, unknown> | string
	}
}

interface OllamaChatMessage {
	role: string
	content?: string
	thinking?: string
	images?: string[]
	tool_calls?: OllamaToolCall[]
	tool_name?: string
}

export interface OllamaChatWithToolsResult {
	text: string
	documentLinks: MessageDocumentLink[]
	pendingDeleteConfirmation?: PendingDeleteConfirmation
}

function formatMessagesForOllama(messages: ChatMessage[]): OllamaChatMessage[] {
	const formatted: OllamaChatMessage[] = []

	for (const msg of messages) {
		let content = msg.content
		const images: string[] = []

		if (msg.fileAttachments && msg.fileAttachments.length > 0) {
			for (const file of msg.fileAttachments) {
				if (file.kind === 'image') {
					images.push(file.content)
				} else {
					const block = `--- File: ${file.name} ---\n${file.content}\n--- End File ---`
					content = content.trim() ? `${content}\n${block}` : block
				}
			}
		}

		if (images.length > 0 && !content.trim()) {
			content = 'Describe the attached image(s).'
		}

		const entry: OllamaChatMessage = {
			role: msg.role,
			content,
		}
		if (images.length > 0) {
			entry.images = images
		}
		formatted.push(entry)
	}

	return formatted
}

function parseToolArguments(
	args: Record<string, unknown> | string | undefined,
): Record<string, unknown> {
	if (!args) {
		return {}
	}

	if (typeof args === 'string') {
		try {
			return JSON.parse(args) as Record<string, unknown>
		} catch {
			return {}
		}
	}

	return args
}

async function streamOllamaRound(
	endpoint: string,
	model: string,
	settings: ChatSettings,
	messages: OllamaChatMessage[],
	tools: ReturnType<typeof buildOllamaTools>,
	options: {
		signal?: AbortSignal
		onTextDelta?: (delta: string, fullMainText: string) => void
		onThinkingDelta?: (delta: string, fullThinkingText: string) => void
		onActivityChange?: (phase: 'starting' | 'thinking' | 'writing') => void
	},
): Promise<OllamaChatMessage> {
	options.onActivityChange?.('starting')
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model,
			messages,
			tools,
			stream: true,
			think: settings.enableThinking !== false,
			options: {
				temperature: settings.temperature,
				top_p: settings.topP,
				num_ctx: settings.contextWindow || 4096,
				num_predict: settings.maxTokens || 4096,
			},
		}),
		signal: options.signal,
	})

	if (!response.ok) {
		const errorText = await response.text().catch(() => '')
		throw new Error(
			`Ollama server error (${response.status}): ${errorText || response.statusText}`,
		)
	}

	if (!response.body) {
		throw new Error('Response body is null')
	}

	const reader = response.body.getReader()
	const decoder = new TextDecoder('utf-8')
	let rawAccumulatedContent = ''
	let rawAccumulatedThinking = ''
	let previousMainLength = 0
	let previousThinkingLength = 0
	let assistantMessage: OllamaChatMessage = { role: 'assistant', content: '' }

	while (true) {
		const { done, value } = await reader.read()
		if (done) {
			break
		}

		const chunk = decoder.decode(value, { stream: true })
		const lines = chunk.split('\n').filter((line) => line.trim())

		for (const line of lines) {
			const json = JSON.parse(line) as {
				message?: OllamaChatMessage
				done?: boolean
			}

			if (json.message?.thinking) {
				rawAccumulatedThinking += json.message.thinking
				const parsed = parseThoughtAndContent(rawAccumulatedContent)
				const combinedThinking = [
					rawAccumulatedThinking.trim(),
					parsed.thinking.trim(),
				]
					.filter(Boolean)
					.join('\n\n')

				if (combinedThinking.length > previousThinkingLength) {
					options.onThinkingDelta?.(
						combinedThinking.slice(previousThinkingLength),
						combinedThinking,
					)
					previousThinkingLength = combinedThinking.length
				}

				options.onActivityChange?.('thinking')
			}

			if (json.message?.content) {
				rawAccumulatedContent += json.message.content
				const parsed = parseThoughtAndContent(rawAccumulatedContent)
				const mainText = parsed.main

				if (mainText.length > previousMainLength) {
					options.onTextDelta?.(
						mainText.slice(previousMainLength),
						mainText,
					)
					previousMainLength = mainText.length
				}

				if (mainText.trim()) {
					options.onActivityChange?.('writing')
				}
			}

			if (json.message?.tool_calls) {
				assistantMessage.tool_calls = json.message.tool_calls
			}

			if (json.done) {
				assistantMessage = {
					role: json.message?.role ?? 'assistant',
					content: rawAccumulatedContent,
					thinking: rawAccumulatedThinking || json.message?.thinking,
					tool_calls: json.message?.tool_calls ?? assistantMessage.tool_calls,
				}
			}
		}
	}

	return assistantMessage
}

export async function generateOllamaChatWithTools(
	model: string,
	messages: ChatMessage[],
	settings: ChatSettings,
	preferences: UserPreferences,
	options: {
		signal?: AbortSignal
		onTextDelta?: (delta: string, fullMainText: string) => void
		onThinkingDelta?: (delta: string, fullThinkingText: string) => void
		onActivityChange?: (phase: 'starting' | 'thinking' | 'writing') => void
		onToolActivity?: (toolNames: string[]) => void
		userMessageText?: string
	},
): Promise<OllamaChatWithToolsResult> {
	const ollamaHost = getEffectiveOllamaHost(
		settings.ollamaHost,
		settings.personalaiHost,
	)
	const endpoint = buildOllamaApiUrl(ollamaHost, '/api/chat')

	const suffixSections: string[] = []

	if (options.userMessageText) {
		const mentionContext = await buildMentionedDocumentsContext(
			options.userMessageText,
		)
		if (mentionContext) {
			suffixSections.push(mentionContext)
		}
	}

	if (!settings.enableThinking) {
		suffixSections.push(
			'Do not output internal reasoning or redacted_thinking tags.',
		)
	}

	const systemPrompt = await buildFullSystemInstruction(preferences, {
		suffixSections,
	})

	const formattedMessages: OllamaChatMessage[] = []
	if (systemPrompt.trim()) {
		formattedMessages.push({ role: 'system', content: systemPrompt })
	}
	formattedMessages.push(...formatMessagesForOllama(messages))

	const tools = buildOllamaTools()
	let documentLinks: MessageDocumentLink[] = []
	let pendingDeleteConfirmation: PendingDeleteConfirmation | undefined

	for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
		if (options.signal?.aborted) {
			throw new DOMException('Generation aborted', 'AbortError')
		}

		const assistantMessage = await streamOllamaRound(
			endpoint,
			model,
			settings,
			formattedMessages,
			tools,
			{
				signal: options.signal,
				onTextDelta: options.onTextDelta,
				onThinkingDelta: options.onThinkingDelta,
				onActivityChange: options.onActivityChange,
			},
		)

		if (assistantMessage.tool_calls?.length) {
			const toolNames = assistantMessage.tool_calls
				.map((call) => call.function?.name ?? '')
				.filter(Boolean)
			options.onToolActivity?.(toolNames)
			formattedMessages.push(assistantMessage)

			for (const call of assistantMessage.tool_calls) {
				const name = call.function?.name ?? ''
				const args = parseToolArguments(call.function?.arguments)
				const result = await executeAppToolCall(name, args)

				if (result.pendingDeleteConfirmation) {
					pendingDeleteConfirmation = result.pendingDeleteConfirmation
				}

				if (result.documentLink) {
					documentLinks = mergeDocumentLinks(documentLinks, [
						result.documentLink,
					])
				}

				formattedMessages.push({
					role: 'tool',
					content: JSON.stringify(result.response),
					tool_name: name,
				})
			}

			if (pendingDeleteConfirmation) {
				return {
					text: `To permanently delete "${pendingDeleteConfirmation.documentTitle}", confirm below. Nothing has been deleted yet.`,
					documentLinks,
					pendingDeleteConfirmation,
				}
			}

			continue
		}

		const rawContent = assistantMessage.content ?? ''
		const parsed = parseThoughtAndContent(rawContent)

		return {
			text: parsed.main.trim() || rawContent.trim() || 'Done.',
			documentLinks,
			pendingDeleteConfirmation,
		}
	}

	return {
		text: 'I completed the requested actions.',
		documentLinks,
		pendingDeleteConfirmation,
	}
}
