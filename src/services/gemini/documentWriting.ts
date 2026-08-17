import { geminiFetch } from '@/services/gemini/client'
import { applySafetySettingsToRequestBody } from '@/services/gemini/safetySettings'
import {
	buildSystemInstruction,
	getConfiguredAiName,
	getConfiguredUserName,
} from '@/services/gemini/systemInstruction'
import { MAX_CHAT_OUTPUT_TOKENS } from '@/services/gemini/constants'
import type { UserPreferences } from '@/storage/types'

export type DocumentWritingAction =
	| 'expand'
	| 'rewrite'
	| 'shorten'
	| 'clarify'
	| 'continue'
	| 'custom'

export interface DocumentWritingRequest {
	apiKey: string
	modelId: string
	preferences: UserPreferences
	documentTitle: string
	selectedText: string
	contextBefore: string
	contextAfter: string
	action: DocumentWritingAction
	customInstruction?: string
}

interface GenerateContentResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>
		}
	}>
}

function buildActionInstruction(
	action: DocumentWritingAction,
	customInstruction?: string,
): string {
	switch (action) {
		case 'expand':
			return 'Expand the focus text with additional useful detail while preserving its original meaning, tone, and context.'
		case 'rewrite':
			return 'Rewrite the focus text while preserving its intended meaning and tone.'
		case 'shorten':
			return 'Make the focus text more concise without losing important information.'
		case 'clarify':
			return 'Improve clarity and readability while preserving the original content and facts.'
		case 'continue':
			return 'Continue writing naturally from the preceding document content. Do not repeat what already exists. Write only the new continuation text.'
		case 'custom':
			return customInstruction?.trim() || 'Improve the focus text.'
		default:
			return 'Improve the focus text.'
	}
}

function buildDocumentWritingPrompt(request: DocumentWritingRequest): string {
	const actionInstruction = buildActionInstruction(
		request.action,
		request.customInstruction,
	)

	const sections = [
		`Document title: ${request.documentTitle}`,
		request.contextBefore
			? `Content before the focus:\n${request.contextBefore}`
			: 'Content before the focus: (start of document)',
		request.action === 'continue'
			? 'Focus: continue from the end of the preceding content.'
			: request.selectedText
				? `Focus text to edit:\n${request.selectedText}`
				: 'Focus text: (cursor position — continue writing)',
		request.contextAfter && request.action !== 'continue'
			? `Content after the focus:\n${request.contextAfter}`
			: null,
		`Instruction: ${actionInstruction}`,
		'Return only the replacement or continuation text.',
		'Do not include explanations, labels, quotes, markdown code fences, or commentary.',
		'Match the document tone and formatting style.',
		request.action === 'continue'
			? 'Output only the new text to append.'
			: 'Output only the revised version of the focus text.',
	]

	return sections.filter(Boolean).join('\n\n')
}

export async function generateDocumentWritingSuggestion(
	request: DocumentWritingRequest,
): Promise<string> {
	const systemInstruction = [
		buildSystemInstruction(request.preferences),
		`You are helping ${getConfiguredUserName(request.preferences)} edit a document titled "${request.documentTitle}".`,
		`${getConfiguredAiName(request.preferences)} writing assistant mode: produce direct document text only.`,
	].join('\n\n')

	const body = applySafetySettingsToRequestBody(
		{
			systemInstruction: {
				parts: [{ text: systemInstruction }],
			},
			contents: [
				{
					role: 'user',
					parts: [{ text: buildDocumentWritingPrompt(request) }],
				},
			],
			generationConfig: {
				temperature: 0.7,
				maxOutputTokens: MAX_CHAT_OUTPUT_TOKENS,
			},
		},
		request.preferences.allowMatureContent ?? true,
	)

	const response = await geminiFetch<GenerateContentResponse>(
		request.apiKey,
		`/models/${request.modelId}:generateContent`,
		{
			method: 'POST',
			body: JSON.stringify(body),
		},
	)

	const text = response.candidates?.[0]?.content?.parts
		?.map((part) => part.text ?? '')
		.join('')
		.trim()

	if (!text) {
		throw new Error('Gemini returned an empty writing suggestion.')
	}

	return text.replace(/^```[\w]*\n?|\n?```$/g, '').trim()
}

export function extractDocumentContextSlices(
	fullText: string,
	selectionStart: number,
	selectionEnd: number,
	maxBefore = 4000,
	maxAfter = 1200,
): {
	selectedText: string
	contextBefore: string
	contextAfter: string
} {
	const selectedText = fullText.slice(selectionStart, selectionEnd).trim()
	const before = fullText.slice(0, selectionStart).trim()
	const after = fullText.slice(selectionEnd).trim()

	return {
		selectedText,
		contextBefore: before.length > maxBefore ? before.slice(-maxBefore) : before,
		contextAfter: after.length > maxAfter ? after.slice(0, maxAfter) : after,
	}
}
