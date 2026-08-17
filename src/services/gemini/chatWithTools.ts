import { executeDocumentToolCall } from '@/services/gemini/documentTools'
import {
	executeCodebaseToolCall,
	isCodebaseToolName,
} from '@/services/gemini/codebaseTools'
import { buildChatTools } from '@/services/gemini/executeAppToolCall'
import {
	executeHomeTodoToolCall,
	isHomeTodoToolName,
} from '@/services/home/homeTodoTools'
import {
	executeProjectToolCall,
	isProjectToolName,
} from '@/services/projects/projectTools'
import {
	executeReminderToolCall,
	isReminderToolName,
} from '@/services/reminders/reminderTools'
import { buildFullSystemInstruction } from '@/services/gemini/documentContext'
import {
	MAX_CHAT_OUTPUT_TOKENS,
	MAX_TOOL_ITERATIONS,
} from '@/services/gemini/constants'
import {
	extractGroundingMetadata,
	formatGroundedResponseText,
	type GroundingMetadata,
} from '@/services/gemini/grounding'
import type { ChatMessageInput } from '@/services/gemini/generate'
import { applySafetySettingsToRequestBody } from '@/services/gemini/safetySettings'
import { geminiStreamGenerateContent } from '@/services/gemini/stream'
import type { MessageMedia, PendingDeleteConfirmation, UserPreferences } from '@/storage/types'
import type { MessageDocumentLink } from '@/storage/types'
import { formatMessageForModel } from '@/utils/dateTime'
import {
	extractDocumentLinkFromToolResult,
	mergeDocumentLinks,
} from '@/utils/messageAttachments'

interface GeminiPart {
	text?: string
	thoughtSignature?: string
	functionCall?: {
		name: string
		args?: Record<string, unknown>
	}
	functionResponse?: {
		name: string
		response: Record<string, unknown>
	}
	inlineData?: {
		mimeType: string
		data: string
	}
}

interface GeminiContent {
	role?: string
	parts: GeminiPart[]
}

export interface ChatWithToolsResult {
	text: string
	media: MessageMedia[]
	documentLinks: MessageDocumentLink[]
	pendingDeleteConfirmation?: PendingDeleteConfirmation
}

const MAX_TOOL_ITERATIONS_LIMIT = MAX_TOOL_ITERATIONS

function estimateRequestInputChars(
	systemInstruction: string,
	contents: GeminiContent[],
): number {
	let total = systemInstruction.length
	for (const content of contents) {
		for (const part of content.parts) {
			if (part.text) {
				total += part.text.length
			}
			if (part.functionResponse) {
				total += JSON.stringify(part.functionResponse.response).length
			}
			if (part.functionCall) {
				total += JSON.stringify(part.functionCall).length
			}
			if (part.inlineData?.data) {
				total += part.inlineData.data.length
			}
		}
	}
	return total
}

export async function generateChatWithTools(
	apiKey: string,
	modelId: string,
	messages: ChatMessageInput[],
	preferences: UserPreferences,
	options?: {
		useWebSearch?: boolean
		signal?: AbortSignal
		onTextDelta?: (delta: string) => void
		onToolActivity?: () => void
	},
): Promise<ChatWithToolsResult> {
	const contents: GeminiContent[] = messages.map((message) => ({
		role: message.role === 'assistant' ? 'model' : 'user',
		parts: buildMessageParts(message),
	}))

	let pendingDeleteConfirmation: PendingDeleteConfirmation | undefined
	let documentLinks: MessageDocumentLink[] = []
	const useWebSearch = options?.useWebSearch ?? false
	const systemInstruction = await buildFullSystemInstruction(preferences)

	if (import.meta.env.DEV) {
		console.debug(
			'[gemini] chat system instruction chars:',
			systemInstruction.length,
		)
	}

	for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS_LIMIT; iteration += 1) {
		if (options?.signal?.aborted) {
			throw new DOMException('Generation aborted', 'AbortError')
		}

		const requestBody: Record<string, unknown> = applySafetySettingsToRequestBody(
			{
				systemInstruction: {
					parts: [{ text: systemInstruction }],
				},
				tools: buildChatTools(useWebSearch, preferences.allowCodebaseInspection ?? false),
				contents,
				generationConfig: {
					maxOutputTokens: MAX_CHAT_OUTPUT_TOKENS,
				},
			},
			preferences.allowMatureContent ?? true,
		)

		if (import.meta.env.DEV) {
			console.debug(
				'[gemini] chat request input chars (est.):',
				estimateRequestInputChars(systemInstruction, contents),
				`iteration ${iteration + 1}`,
			)
		}

		if (useWebSearch) {
			requestBody.toolConfig = {
				includeServerSideToolInvocations: true,
			}
		}

		const streamed = await geminiStreamGenerateContent(
			apiKey,
			modelId,
			requestBody,
			{
				signal: options?.signal,
				onTextDelta: options?.onTextDelta,
			},
		)

		const parts = streamed.parts
		const functionCallParts = parts.filter((part) => part.functionCall?.name)

		if (functionCallParts.length > 0) {
			options?.onToolActivity?.()

			contents.push({
				role: streamed.role ?? 'model',
				parts,
			})

			const functionResponseParts: GeminiPart[] = []

			for (const part of functionCallParts) {
				const functionCall = part.functionCall!

				if (isCodebaseToolName(functionCall.name)) {
					const toolResult = executeCodebaseToolCall(
						functionCall.name,
						functionCall.args ?? {},
					)
					functionResponseParts.push({
						functionResponse: {
							name: toolResult.name,
							response: toolResult.response,
						},
					})
					continue
				}

				if (isReminderToolName(functionCall.name)) {
					const toolResult = await executeReminderToolCall(
						functionCall.name,
						functionCall.args ?? {},
					)
					functionResponseParts.push({
						functionResponse: {
							name: toolResult.name,
							response: toolResult.response,
						},
					})
					continue
				}

				if (isProjectToolName(functionCall.name)) {
					const toolResult = await executeProjectToolCall(
						functionCall.name,
						functionCall.args ?? {},
					)
					functionResponseParts.push({
						functionResponse: {
							name: toolResult.name,
							response: toolResult.response,
						},
					})
					continue
				}

				if (isHomeTodoToolName(functionCall.name)) {
					const toolResult = await executeHomeTodoToolCall(
						functionCall.name,
						functionCall.args ?? {},
					)
					functionResponseParts.push({
						functionResponse: {
							name: toolResult.name,
							response: toolResult.response,
						},
					})
					continue
				}

				const toolResult = await executeDocumentToolCall(
					functionCall.name,
					functionCall.args ?? {},
				)

				if (toolResult.pendingDeleteConfirmation) {
					pendingDeleteConfirmation = toolResult.pendingDeleteConfirmation
				}

				const documentLink = extractDocumentLinkFromToolResult(
					functionCall.name,
					toolResult.response,
				)
				if (documentLink) {
					documentLinks = mergeDocumentLinks(documentLinks, [documentLink])
				}

				functionResponseParts.push({
					functionResponse: {
						name: toolResult.name,
						response: toolResult.response,
					},
				})
			}

			contents.push({
				role: 'user',
				parts: functionResponseParts,
			})

			continue
		}

		const text = parts
			.map((part) => part.text ?? '')
			.join('\n')
			.trim()

		const groundedText = formatGroundedResponseText(
			text || 'Done.',
			extractGroundingMetadata({
				groundingMetadata: streamed.groundingMetadata as GroundingMetadata | undefined,
			}),
		)

		return {
			text: groundedText,
			media: [],
			documentLinks,
			pendingDeleteConfirmation,
		}
	}

	return {
		text: 'I completed the requested document actions.',
		media: [],
		documentLinks,
		pendingDeleteConfirmation,
	}
}

function buildMessageParts(message: ChatMessageInput): GeminiPart[] {
	const parts: GeminiPart[] = []
	const body =
		typeof message.createdAt === 'number'
			? formatMessageForModel(message.content, message.createdAt, message.role)
			: message.content

	if (body.trim()) {
		parts.push({ text: body })
	}

	for (const item of message.media ?? []) {
		if (item.type !== 'image') {
			continue
		}

		const base64 = item.dataUrl.split(',')[1]
		if (!base64) {
			continue
		}

		parts.push({
			inlineData: {
				mimeType: item.mimeType,
				data: base64,
			},
		})
	}

	if (parts.length === 0) {
		parts.push({ text: body || ' ' })
	}

	return parts
}
