import { createDocument } from '@/services/documents/documentService'
import type { DocumentRecord } from '@/storage/types'
import { ingestUploadedDocumentContent } from '@/utils/documentContent'
import {
	getFileBaseName,
	isUploadableDocumentFile,
	readDocumentFileContent,
} from '@/utils/fileAttachments'

export interface DocumentUploadResult {
	documents: DocumentRecord[]
	errors: string[]
}

export async function uploadDocumentsFromFiles(
	files: File[],
): Promise<DocumentUploadResult> {
	const documents: DocumentRecord[] = []
	const errors: string[] = []

	if (files.length === 0) {
		return { documents, errors }
	}

	const results = await Promise.allSettled(
		files.map(async (file) => {
			if (!isUploadableDocumentFile(file)) {
				throw new Error(
					`${file.name} is not supported. Try .txt, .md, .html, .pdf, or .docx.`,
				)
			}

			const raw = await readDocumentFileContent(file)
			const { content, contentFormat } = ingestUploadedDocumentContent(file, raw)
			const title = getFileBaseName(file.name) || 'Uploaded document'

			return createDocument(title, content, {
				source: 'upload',
				contentFormat,
			})
		}),
	)

	for (const result of results) {
		if (result.status === 'fulfilled') {
			documents.push(result.value)
			continue
		}

		errors.push(
			result.reason instanceof Error
				? result.reason.message
				: 'Could not upload one of the documents.',
		)
	}

	return { documents, errors }
}
