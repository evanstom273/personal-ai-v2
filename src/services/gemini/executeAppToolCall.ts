import { executeDocumentToolCall, DOCUMENT_TOOL_DECLARATIONS } from '@/services/gemini/documentTools'
import {
	CODEBASE_TOOL_DECLARATIONS,
	executeCodebaseToolCall,
	isCodebaseToolName,
} from '@/services/gemini/codebaseTools'
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

export function buildChatTools(
	useWebSearch: boolean,
	allowCodebaseInspection: boolean,
): Array<Record<string, unknown>> {
	const declarations = [
		...DOCUMENT_TOOL_DECLARATIONS,
		...PROJECT_TOOL_DECLARATIONS,
		...REMINDER_TOOL_DECLARATIONS,
		...HOME_TODO_TOOL_DECLARATIONS,
		...(allowCodebaseInspection ? CODEBASE_TOOL_DECLARATIONS : []),
	]

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
	if (isCodebaseToolName(name)) {
		const toolResult = executeCodebaseToolCall(name, args)
		return {
			name: toolResult.name,
			response: toolResult.response,
		}
	}

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

	const toolResult = await executeDocumentToolCall(name, args)
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
