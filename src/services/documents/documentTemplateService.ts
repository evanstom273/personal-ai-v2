import { BUILT_IN_DOCUMENT_TEMPLATES, type DocumentTemplate } from '@/data/documentTemplates'
import { getValue, setValue } from '@/storage/storageService'

const CACHE_KEY = 'document-templates'

const listeners = new Set<() => void>()

function notifyTemplatesChanged(): void {
	for (const listener of listeners) {
		listener()
	}
}

export function subscribeDocumentTemplatesChanged(listener: () => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

async function getCustomTemplates(): Promise<DocumentTemplate[]> {
	const stored = await getValue<DocumentTemplate[]>('cache', CACHE_KEY)
	if (!Array.isArray(stored)) {
		return []
	}

	return stored.filter(
		(template) =>
			template &&
			typeof template.id === 'string' &&
			typeof template.name === 'string' &&
			typeof template.content === 'string',
	)
}

export async function listDocumentTemplates(): Promise<DocumentTemplate[]> {
	const custom = await getCustomTemplates()
	return [...BUILT_IN_DOCUMENT_TEMPLATES, ...custom]
}

export async function saveDocumentAsTemplate(input: {
	name: string
	content: string
	description?: string
}): Promise<DocumentTemplate> {
	const name = input.name.trim()
	if (!name) {
		throw new Error('Template name is required.')
	}

	const content = input.content.trim()
	if (!content) {
		throw new Error('Template content is required.')
	}

	const template: DocumentTemplate = {
		id: crypto.randomUUID(),
		name,
		description: input.description?.trim() || 'Custom template',
		content,
		isBuiltIn: false,
	}

	const custom = await getCustomTemplates()
	await setValue('cache', CACHE_KEY, [...custom, template])
	notifyTemplatesChanged()
	return template
}

export async function deleteCustomDocumentTemplate(id: string): Promise<boolean> {
	const custom = await getCustomTemplates()
	const next = custom.filter((template) => template.id !== id)
	if (next.length === custom.length) {
		return false
	}

	await setValue('cache', CACHE_KEY, next)
	notifyTemplatesChanged()
	return true
}
