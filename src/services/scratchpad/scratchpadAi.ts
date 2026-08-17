import { geminiFetch } from '@/services/gemini/client'
import { applySafetySettingsToRequestBody } from '@/services/gemini/safetySettings'
import {
	buildSystemInstruction,
	getConfiguredUserName,
} from '@/services/gemini/systemInstruction'
import { MAX_MEMORY_ARCHIVE_OUTPUT_TOKENS } from '@/services/gemini/constants'
import type { UserPreferences } from '@/storage/types'

interface GenerateContentResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{ text?: string }>
		}
	}>
}

export interface OrganizedScratchpadDocument {
	title: string
	content: string
}

export interface ExtractedScratchpadTasks {
	projectTitle: string
	tasks: Array<{ title: string; note?: string }>
}

function extractResponseText(response: GenerateContentResponse): string {
	return (
		response.candidates?.[0]?.content?.parts
			?.map((part) => part.text ?? '')
			.join('')
			.trim() ?? ''
	)
}

function parseJsonFromModelText<T>(text: string): T | null {
	const trimmed = text.trim()
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
	const jsonText = fenced?.[1]?.trim() ?? trimmed

	try {
		return JSON.parse(jsonText) as T
	} catch {
		return null
	}
}

async function generateScratchpadJson<T>(
	request: {
		apiKey: string
		modelId: string
		preferences: UserPreferences
		prompt: string
	},
): Promise<T> {
	const systemInstruction = [
		buildSystemInstruction(request.preferences),
		`You help ${getConfiguredUserName(request.preferences)} organize quick-capture scratchpad notes.`,
		'Respond with valid JSON only. No markdown fences or commentary.',
	].join('\n\n')

	const body = applySafetySettingsToRequestBody(
		{
			systemInstruction: {
				parts: [{ text: systemInstruction }],
			},
			contents: [
				{
					role: 'user',
					parts: [{ text: request.prompt }],
				},
			],
			generationConfig: {
				temperature: 0.4,
				maxOutputTokens: MAX_MEMORY_ARCHIVE_OUTPUT_TOKENS,
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

	const text = extractResponseText(response)
	if (!text) {
		throw new Error('Gemini returned an empty response.')
	}

	const parsed = parseJsonFromModelText<T>(text)
	if (!parsed) {
		throw new Error('Could not parse the AI response.')
	}

	return parsed
}

export async function organizeScratchpadIntoDocument(request: {
	apiKey: string
	modelId: string
	preferences: UserPreferences
	rawText: string
}): Promise<OrganizedScratchpadDocument> {
	const rawText = request.rawText.trim()
	if (!rawText) {
		throw new Error('Scratchpad is empty.')
	}

	const prompt = [
		'Turn the following raw scratchpad notes into a structured Markdown document.',
		'Use clear headings, bullet lists, and short paragraphs where appropriate.',
		'Preserve all important details; do not invent facts.',
		'Return JSON: { "title": string, "content": string }',
		'The content field must be Markdown only.',
		'',
		'Scratchpad notes:',
		rawText,
	].join('\n')

	const parsed = await generateScratchpadJson<{
		title?: string
		content?: string
	}>({
		apiKey: request.apiKey,
		modelId: request.modelId,
		preferences: request.preferences,
		prompt,
	})

	const title = parsed.title?.trim() || 'Organized notes'
	const content = parsed.content?.trim()
	if (!content) {
		throw new Error('AI did not return document content.')
	}

	return { title, content }
}

export async function extractScratchpadTasks(request: {
	apiKey: string
	modelId: string
	preferences: UserPreferences
	rawText: string
}): Promise<ExtractedScratchpadTasks> {
	const rawText = request.rawText.trim()
	if (!rawText) {
		throw new Error('Scratchpad is empty.')
	}

	const prompt = [
		'Extract actionable tasks from the following scratchpad notes.',
		'Infer a short project title that groups these tasks.',
		'Return JSON: { "projectTitle": string, "tasks": [{ "title": string, "note"?: string }] }',
		'Each task title should be a concise action item.',
		'Include at least one task when any action is implied.',
		'',
		'Scratchpad notes:',
		rawText,
	].join('\n')

	const parsed = await generateScratchpadJson<{
		projectTitle?: string
		tasks?: Array<{ title?: string; note?: string }>
	}>({
		apiKey: request.apiKey,
		modelId: request.modelId,
		preferences: request.preferences,
		prompt,
	})

	const tasks = (parsed.tasks ?? [])
		.map((task) => ({
			title: task.title?.trim() ?? '',
			note: task.note?.trim() || undefined,
		}))
		.filter((task) => task.title.length > 0)

	if (tasks.length === 0) {
		throw new Error('No tasks could be extracted from the scratchpad.')
	}

	return {
		projectTitle: parsed.projectTitle?.trim() || 'Scratchpad tasks',
		tasks,
	}
}
