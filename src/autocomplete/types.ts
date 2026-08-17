export type AutocompleteEntityType = 'note' | 'project' | 'memory' | 'reminder'

export interface AutocompleteItem {
	id: string
	title: string
	subtitle?: string
	entityType: AutocompleteEntityType
	entityLabel: string
	payload?: Record<string, unknown>
}

export interface AutocompleteTriggerMatch {
	trigger: string
	start: number
	end: number
	query: string
}

export interface AutocompleteProvider {
	id: string
	entityType: AutocompleteEntityType
	entityLabel: string
	search: (query: string, limit?: number) => Promise<AutocompleteItem[]>
}

export interface AutocompleteCreateOption {
	label: string
	value: string
	entityType: AutocompleteEntityType
}
