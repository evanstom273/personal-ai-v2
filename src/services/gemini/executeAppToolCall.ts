import {
	KNOWLEDGE_TOOL_DECLARATIONS,
	executeKnowledgeToolCall,
} from '@/services/gemini/knowledgeTools'
import {
	executeProjectToolCall,
	isProjectToolName,
	PROJECT_TOOL_DECLARATIONS,
} from '@/services/projects/projectTools'
import {
	executeHomeTodoToolCall,
	HOME_TODO_TOOL_DECLARATIONS,
	isHomeTodoToolName,
} from '@/services/home/homeTodoTools'
import {
	executeReminderToolCall,
	isReminderToolName,
	REMINDER_TOOL_DECLARATIONS,
} from '@/services/reminders/reminderTools'
import type { PendingDeleteConfirmation } from '@/storage/types'
import type { MessageDocumentLink } from '@/storage/types'
import { extractDocumentLinkFromToolResult } from '@/utils/messageAttachments'

export interface AppToolCallResult {
	name: string
	response: Record<string, unknown>
	pendingDeleteConfirmation?: PendingDeleteConfirmation
	documentLink?: MessageDocumentLink
}

interface GeminiToolDeclaration {
	name: string
	description: string
	parameters: {
		type: string
		properties?: Record<string, { type: string; description?: string }>
		required?: readonly string[]
	}
}

function convertGeminiType(type: string): string {
	switch (type) {
		case 'OBJECT':
			return 'object'
		case 'STRING':
			return 'string'
		case 'INTEGER':
			return 'integer'
		case 'BOOLEAN':
			return 'boolean'
		case 'ARRAY':
			return 'array'
		default:
			return type.toLowerCase()
	}
}

function convertDeclarationToOllamaTool(declaration: GeminiToolDeclaration) {
	const properties: Record<string, { type: string; description?: string }> = {}

	for (const [key, value] of Object.entries(
		declaration.parameters.properties ?? {},
	)) {
		properties[key] = {
			type: convertGeminiType(value.type),
			description: value.description,
		}
	}

	return {
		type: 'function' as const,
		function: {
			name: declaration.name,
			description: declaration.description,
			parameters: {
				type: 'object',
				properties,
				required: declaration.parameters.required ?? [],
			},
		},
	}
}

const APP_TOOL_DECLARATIONS = [
	...KNOWLEDGE_TOOL_DECLARATIONS,
	...PROJECT_TOOL_DECLARATIONS,
	...REMINDER_TOOL_DECLARATIONS,
	...HOME_TODO_TOOL_DECLARATIONS,
] as const

export function buildOllamaTools(): ReturnType<typeof convertDeclarationToOllamaTool>[] {
	return APP_TOOL_DECLARATIONS.map((declaration) =>
		convertDeclarationToOllamaTool(declaration),
	)
}

export function buildChatTools(
	useWebSearch: boolean,
): Array<Record<string, unknown>> {
	const declarations = [...APP_TOOL_DECLARATIONS]

	if (useWebSearch) {
		return [
			{
				googleSearch: {},
				functionDeclarations: declarations,
			},
		]
	}

	return [{ functionDeclarations: declarations }]
}

export async function executeAppToolCall(
	name: string,
	args: Record<string, unknown>,
): Promise<AppToolCallResult> {
	if (isReminderToolName(name)) {
		const toolResult = await executeReminderToolCall(name, args)
		return {
			name: toolResult.name,
			response: toolResult.response,
		}
	}

	if (isProjectToolName(name)) {
		const toolResult = await executeProjectToolCall(name, args)
		return {
			name: toolResult.name,
			response: toolResult.response,
		}
	}

	if (isHomeTodoToolName(name)) {
		const toolResult = await executeHomeTodoToolCall(name, args)
		return {
			name: toolResult.name,
			response: toolResult.response,
		}
	}

	const toolResult = await executeKnowledgeToolCall(name, args)
	const documentLink = extractDocumentLinkFromToolResult(
		name,
		toolResult.response,
	)

	return {
		name: toolResult.name,
		response: toolResult.response,
		pendingDeleteConfirmation: toolResult.pendingDeleteConfirmation,
		documentLink: documentLink ?? undefined,
	}
}
