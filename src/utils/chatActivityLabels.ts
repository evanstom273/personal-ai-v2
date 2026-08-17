export type ChatGenerationPhase = 'starting' | 'thinking' | 'writing' | 'tool'

export interface ChatGenerationActivity {
	phase: ChatGenerationPhase
	toolName?: string
}

const TOOL_ACTIVITY_LABELS: Record<string, string> = {
	list_documents: 'Listing documents',
	read_document: 'Reading document',
	create_document: 'Creating document',
	update_document: 'Updating document',
	rename_document: 'Renaming document',
	delete_document: 'Preparing note deletion',
	search_knowledge: 'Searching knowledge',
	list_notes: 'Listing notes',
	read_note: 'Reading note',
	create_note: 'Creating note',
	update_note: 'Updating note',
	rename_note: 'Renaming note',
	move_note: 'Moving note',
	add_tags: 'Tagging note',
	link_notes: 'Linking notes',
	get_backlinks: 'Loading backlinks',
	archive_note: 'Archiving note',
	delete_note: 'Preparing note deletion',
	list_projects: 'Listing projects',
	get_project: 'Loading project',
	create_project: 'Creating project',
	update_project: 'Updating project',
	delete_project: 'Deleting project',
	create_task: 'Adding task',
	update_task: 'Updating task',
	move_task: 'Moving task',
	delete_task: 'Deleting task',
	list_reminders: 'Listing reminders',
	create_reminder: 'Creating reminder',
	update_reminder: 'Updating reminder',
	delete_reminder: 'Deleting reminder',
	list_home_todos: 'Listing todos',
	add_home_todo: 'Adding todo',
	update_home_todo: 'Updating todo',
	remove_home_todo: 'Removing todo',
	set_home_todos: 'Updating todos',
	clear_completed_home_todos: 'Clearing completed todos',
}

export function formatToolActivityLabel(toolName: string): string {
	return TOOL_ACTIVITY_LABELS[toolName] ?? 'Working'
}

export function formatGenerationStatusLabel(
	activity: ChatGenerationActivity | null | undefined,
	aiName: string,
): string {
	if (!activity) {
		return `${aiName} is working…`
	}

	switch (activity.phase) {
		case 'starting':
			return `${aiName} is preparing…`
		case 'thinking':
			return `${aiName} is reasoning…`
		case 'writing':
			return `${aiName} is writing…`
		case 'tool':
			const toolLabel = formatToolActivityLabel(activity.toolName ?? '')
			return `${aiName} is ${toolLabel.toLowerCase()}…`
		default:
			return `${aiName} is working…`
	}
}
