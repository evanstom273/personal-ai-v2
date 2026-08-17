import { useCallback, useEffect, useState } from 'react'
import {
	createDocument,
	deleteDocument,
	duplicateDocument,
	listDocuments,
	subscribeDocumentsChanged,
	updateDocument,
} from '@/services/documents/documentService'
import type { DocumentTemplate } from '@/data/documentTemplates'
import type { DocumentRecord } from '@/storage/types'

export function useDocuments() {
	const [documents, setDocuments] = useState<DocumentRecord[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const refreshDocuments = useCallback(async (query?: string) => {
		const next = await listDocuments(query)
		setDocuments(next)
		setIsLoading(false)
		return next
	}, [])

	useEffect(() => {
		void refreshDocuments()
		return subscribeDocumentsChanged(() => {
			void refreshDocuments()
		})
	}, [refreshDocuments])

	const createBlankDocument = useCallback(async () => {
		return createDocument('Untitled document')
	}, [])

	const createDocumentFromTemplate = useCallback(
		async (template: DocumentTemplate | null) => {
			if (!template) {
				return createDocument('Untitled document')
			}

			return createDocument(template.name, template.content, {
				source: 'user',
				contentFormat: 'markdown',
				readOnly: false,
			})
		},
		[],
	)

	const saveDocument = useCallback(
		async (
			id: string,
			updates: Partial<Pick<DocumentRecord, 'title' | 'content'>>,
		) => {
			return updateDocument(id, updates)
		},
		[],
	)

	const removeDocument = useCallback(async (id: string) => {
		await deleteDocument(id)
	}, [])

	const copyDocument = useCallback(async (id: string) => {
		return duplicateDocument(id)
	}, [])

	return {
		documents,
		isLoading,
		refreshDocuments,
		createBlankDocument,
		createDocumentFromTemplate,
		saveDocument,
		removeDocument,
		copyDocument,
	}
}
