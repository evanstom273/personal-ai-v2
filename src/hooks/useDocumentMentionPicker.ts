import { useEffect, useMemo, useState } from 'react'
import { listDocuments } from '@/services/documents/documentService'
import { subscribeDocumentsChanged } from '@/services/documents/documentService'
import type { DocumentRecord } from '@/storage/types'
import { getActiveDocumentMention } from '@/utils/documentMentions'

export function useDocumentMentionPicker(
	text: string,
	cursorPosition: number,
	enabled: boolean,
) {
	const [documents, setDocuments] = useState<DocumentRecord[]>([])
	const [selectedIndex, setSelectedIndex] = useState(0)

	const activeMention = useMemo(() => {
		if (!enabled) {
			return null
		}
		return getActiveDocumentMention(text, cursorPosition)
	}, [cursorPosition, enabled, text])

	useEffect(() => {
		let cancelled = false

		async function loadDocuments(): Promise<void> {
			const next = await listDocuments()
			if (!cancelled) {
				setDocuments(next)
			}
		}

		void loadDocuments()
		return subscribeDocumentsChanged(() => {
			void loadDocuments()
		})
	}, [])

	const filteredDocuments = useMemo(() => {
		if (!activeMention) {
			return []
		}

		const query = activeMention.query.trim().toLowerCase()
		if (!query) {
			return documents.slice(0, 8)
		}

		return documents
			.filter((document) => document.title.toLowerCase().includes(query))
			.slice(0, 8)
	}, [activeMention, documents])

	useEffect(() => {
		setSelectedIndex(0)
	}, [activeMention?.query])

	const isOpen = Boolean(activeMention)

	function moveSelection(direction: 1 | -1): void {
		if (filteredDocuments.length === 0) {
			return
		}

		setSelectedIndex((current) => {
			const next = current + direction
			if (next < 0) {
				return filteredDocuments.length - 1
			}
			if (next >= filteredDocuments.length) {
				return 0
			}
			return next
		})
	}

	return {
		isOpen,
		activeMention,
		filteredDocuments,
		selectedIndex,
		moveSelection,
		setSelectedIndex,
	}
}
