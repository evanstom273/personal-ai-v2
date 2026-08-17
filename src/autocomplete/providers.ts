import type { AutocompleteItem, AutocompleteProvider } from '@/autocomplete/types'
import { fuzzyScore } from '@/autocomplete/triggers'
import { listDocuments } from '@/services/documents/documentService'
import { listMemoryEntries } from '@/services/memory/memoryService'
import { listProjects } from '@/services/projects/projectService'
import { listReminders } from '@/services/reminders/reminderService'

function rankItems(query: string, items: AutocompleteItem[], limit = 12): AutocompleteItem[] {
	const scored = items
		.map((item) => ({
			item,
			score: Math.max(
				fuzzyScore(query, item.title),
				item.subtitle ? fuzzyScore(query, item.subtitle) : 0,
			),
		}))
		.filter((entry) => entry.score > 0 || !query.trim())
		.sort((a, b) => b.score - a.score)

	if (!query.trim()) {
		return scored.slice(0, limit).map((entry) => entry.item)
	}

	return scored.slice(0, limit).map((entry) => entry.item)
}

export const noteAutocompleteProvider: AutocompleteProvider = {
	id: 'notes',
	entityType: 'note',
	entityLabel: 'Note',
	async search(query, limit = 12) {
		const notes = await listDocuments(query)
		return rankItems(
			query,
			notes.map((note) => ({
				id: note.id,
				title: note.title,
				subtitle: note.tags?.join(', '),
				entityType: 'note',
				entityLabel: 'Note',
			})),
			limit,
		)
	},
}

export const projectAutocompleteProvider: AutocompleteProvider = {
	id: 'projects',
	entityType: 'project',
	entityLabel: 'Project',
	async search(query, limit = 12) {
		const projects = await listProjects(query)
		return rankItems(
			query,
			projects.map((project) => ({
				id: project.id,
				title: project.title,
				subtitle: project.description,
				entityType: 'project',
				entityLabel: 'Project',
			})),
			limit,
		)
	},
}

export const memoryAutocompleteProvider: AutocompleteProvider = {
	id: 'memories',
	entityType: 'memory',
	entityLabel: 'Memory',
	async search(query, limit = 12) {
		const memories = await listMemoryEntries()
		const filtered = memories.filter((memory) => {
			if (!query.trim()) return true
			const q = query.toLowerCase()
			return (
				memory.content.toLowerCase().includes(q) ||
				memory.category.toLowerCase().includes(q)
			)
		})

		return rankItems(
			query,
			filtered.slice(0, 40).map((memory) => ({
				id: memory.id,
				title: memory.content.slice(0, 80),
				subtitle: memory.category,
				entityType: 'memory',
				entityLabel: 'Memory',
			})),
			limit,
		)
	},
}

export const reminderAutocompleteProvider: AutocompleteProvider = {
	id: 'reminders',
	entityType: 'reminder',
	entityLabel: 'Reminder',
	async search(query, limit = 12) {
		const reminders = await listReminders(query)
		return rankItems(
			query,
			reminders.map((reminder) => ({
				id: reminder.id,
				title: reminder.title,
				subtitle: reminder.note,
				entityType: 'reminder',
				entityLabel: 'Reminder',
			})),
			limit,
		)
	},
}

export const CHAT_MENTION_PROVIDERS: AutocompleteProvider[] = [
	noteAutocompleteProvider,
	projectAutocompleteProvider,
	memoryAutocompleteProvider,
]

export const WIKI_LINK_PROVIDERS: AutocompleteProvider[] = [noteAutocompleteProvider]
