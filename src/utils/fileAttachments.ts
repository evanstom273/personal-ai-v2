import mammoth from 'mammoth'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { FileAttachment } from '../types/serverChat'

export async function readTextFile(file: File): Promise<string> {
	return file.text()
}

export async function readFileAsDataUrl(
	file: File,
): Promise<{ dataUrl: string; mimeType: string }> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			if (typeof reader.result !== 'string') {
				reject(new Error('Failed to read file'))
				return
			}

			resolve({
				dataUrl: reader.result,
				mimeType: file.type || 'application/octet-stream',
			})
		}
		reader.onerror = () => reject(new Error('Failed to read file'))
		reader.readAsDataURL(file)
	})
}

export function getFileBaseName(filename: string): string {
	const trimmed = filename.trim()
	const index = trimmed.lastIndexOf('.')
	if (index <= 0) {
		return trimmed
	}

	return trimmed.slice(0, index)
}

export function isPdfFile(file: File): boolean {
	return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

export function isTextDocumentFile(file: File): boolean {
	if (file.type.startsWith('text/')) {
		return true
	}

	return /\.(txt|md|markdown|html|htm|json|csv|xml|yml|yaml)$/i.test(file.name)
}

export function isUploadableDocumentFile(file: File): boolean {
	return (
		isTextDocumentFile(file) ||
		isPdfFile(file) ||
		file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
		/\.docx$/i.test(file.name)
	)
}

export async function readUploadableDocumentContent(file: File): Promise<string> {
	if (isPdfFile(file)) {
		const { extractPdfText } = await import('@/utils/pdfText')
		return extractPdfText(file)
	}

	if (
		file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
		/\.docx$/i.test(file.name)
	) {
		return extractDocxText(file)
	}

	return readTextFile(file)
}

/** Read text from a library or chat document upload (pdf, docx, text, markdown, etc.). */
export async function readDocumentFileContent(file: File): Promise<string> {
	if (isUploadableDocumentFile(file)) {
		return readUploadableDocumentContent(file)
	}

	throw new Error(getUnsupportedFileMessage(file))
}

export function isImageFile(file: File): boolean {
	return file.type.startsWith('image/')
}

GlobalWorkerOptions.workerSrc = new URL(
	'pdfjs-dist/build/pdf.worker.min.mjs',
	import.meta.url
).toString()

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

const TEXT_EXTENSIONS =
	/\.(txt|md|markdown|json|csv|xml|html|htm|css|js|mjs|cjs|ts|tsx|jsx|py|yaml|yml|log|sql|sh|env|ini|toml|rs|go|java|c|cpp|h|hpp|cs|rb|php|swift|kt|vue|svelte|graphql|tex|rst|adoc)$/i

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp)$/i

const DOCUMENT_EXTENSIONS = /\.(pdf|docx)$/i

type AttachmentCategory = 'image' | 'text' | 'document'

function getAttachmentCategory(file: File): AttachmentCategory | null {
	const name = file.name.toLowerCase()

	if (file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(name)) {
		return 'image'
	}

	if (
		file.type === 'application/pdf' ||
		file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
		DOCUMENT_EXTENSIONS.test(name)
	) {
		return 'document'
	}

	if (
		file.type.startsWith('text/') ||
		file.type === 'application/json' ||
		file.type === 'application/xml' ||
		file.type === 'application/javascript' ||
		TEXT_EXTENSIONS.test(name)
	) {
		return 'text'
	}

	return null
}

export function getUnsupportedFileMessage(file: File): string {
	return `${file.name} isn't supported. Try images (PNG, JPG, WEBP), text/code (.md, .json, .txt), PDF, or DOCX.`
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = reader.result
			if (result instanceof ArrayBuffer) {
				resolve(result)
				return
			}
			reject(new Error('Failed to read file bytes'))
		}
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
		reader.readAsArrayBuffer(file)
	})
}

function readFileAsDataUrlString(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result ?? ''))
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
		reader.readAsDataURL(file)
	})
}

function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result ?? ''))
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
		reader.readAsText(file)
	})
}

async function extractPdfText(file: File): Promise<string> {
	const data = await readFileAsArrayBuffer(file)
	const pdf = await getDocument({ data }).promise
	const pages: string[] = []

	for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
		const page = await pdf.getPage(pageNum)
		const textContent = await page.getTextContent()
		const pageText = textContent.items
			.map((item) => ('str' in item ? item.str : ''))
			.join(' ')
			.trim()
		if (pageText) {
			pages.push(pageText)
		}
	}

	const combined = pages.join('\n\n').trim()
	if (!combined) {
		throw new Error(`${file.name} has no extractable text. It may be a scanned PDF — try a screenshot instead.`)
	}

	return combined
}

async function extractDocxText(file: File): Promise<string> {
	const arrayBuffer = await readFileAsArrayBuffer(file)
	const result = await mammoth.extractRawText({ arrayBuffer })
	const text = result.value.trim()

	if (!text) {
		throw new Error(`${file.name} appears empty or could not be parsed.`)
	}

	return text
}

async function extractDocumentText(file: File): Promise<string> {
	const name = file.name.toLowerCase()
	if (name.endsWith('.pdf') || file.type === 'application/pdf') {
		return extractPdfText(file)
	}
	if (
		name.endsWith('.docx') ||
		file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	) {
		return extractDocxText(file)
	}
	throw new Error(getUnsupportedFileMessage(file))
}

export async function readFileAsAttachment(file: File): Promise<FileAttachment> {
	if (file.size > MAX_ATTACHMENT_BYTES) {
		throw new Error(`${file.name} is too large (max ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB).`)
	}

	const category = getAttachmentCategory(file)
	if (!category) {
		throw new Error(getUnsupportedFileMessage(file))
	}

	if (category === 'image') {
		const dataUrl = await readFileAsDataUrlString(file)
		const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
		return {
			name: file.name,
			size: file.size,
			type: file.type || 'image/png',
			content: base64,
			kind: 'image',
		}
	}

	if (category === 'document') {
		const extracted = await extractDocumentText(file)
		return {
			name: file.name,
			size: file.size,
			type: file.type || 'application/octet-stream',
			content: extracted,
			kind: 'text',
		}
	}

	const text = await readFileAsText(file)
	return {
		name: file.name,
		size: file.size,
		type: file.type || 'text/plain',
		content: text,
		kind: 'text',
	}
}

export function imageAttachmentToDataUrl(attachment: FileAttachment): string {
	if (attachment.kind !== 'image') return ''
	return `data:${attachment.type || 'image/png'};base64,${attachment.content}`
}

export function isExtractedDocumentName(name: string): boolean {
	return /\.(pdf|docx)$/i.test(name)
}
