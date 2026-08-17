import { marked } from 'marked'
import type {
	DocumentContentFormat,
	DocumentRecord,
	DocumentSource,
} from '@/storage/types'

marked.setOptions({
	gfm: true,
	breaks: true,
})

export function htmlToPlainText(html: string): string {
	if (!html.trim()) {
		return ''
	}

	const doc = new DOMParser().parseFromString(html, 'text/html')
	return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

export function htmlToPlainTextMultiline(html: string): string {
	if (!html.trim()) {
		return ''
	}

	const doc = new DOMParser().parseFromString(html, 'text/html')
	const blocks: string[] = []

	for (const node of Array.from(doc.body.childNodes)) {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			continue
		}

		const element = node as HTMLElement
		const text = element.textContent?.trim() ?? ''
		if (!text) {
			continue
		}

		blocks.push(text)
	}

	if (blocks.length === 0) {
		return doc.body.textContent?.trim() ?? ''
	}

	return blocks.join('\n\n')
}

export function htmlToMarkdown(html: string): string {
	if (!html.trim()) {
		return ''
	}

	const doc = new DOMParser().parseFromString(html, 'text/html')
	return serializeMarkdownNode(doc.body).trim()
}

function serializeMarkdownNode(node: ParentNode): string {
	const parts: string[] = []

	for (const child of Array.from(node.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE) {
			const text = child.textContent?.trim()
			if (text) {
				parts.push(text)
			}
			continue
		}

		if (child.nodeType !== Node.ELEMENT_NODE) {
			continue
		}

		const element = child as HTMLElement
		const tag = element.tagName

		switch (tag) {
			case 'H1':
				parts.push(headingMarkdown(element, 1))
				break
			case 'H2':
				parts.push(headingMarkdown(element, 2))
				break
			case 'H3':
				parts.push(headingMarkdown(element, 3))
				break
			case 'H4':
				parts.push(headingMarkdown(element, 4))
				break
			case 'HR':
				parts.push('---')
				break
			case 'P':
				parts.push(blockMarkdown(element, 'p'))
				break
			case 'BLOCKQUOTE':
				parts.push(
					`> ${element.textContent?.trim().split('\n').join('\n> ') ?? ''}`,
				)
				break
			case 'UL':
				for (const item of Array.from(element.children)) {
					if (item.tagName === 'LI') {
						parts.push(`- ${item.textContent?.trim() ?? ''}`)
					}
				}
				break
			case 'OL': {
				let index = 1
				for (const item of Array.from(element.children)) {
					if (item.tagName === 'LI') {
						parts.push(`${index}. ${item.textContent?.trim() ?? ''}`)
						index += 1
					}
				}
				break
			}
			case 'PRE':
			case 'CODE':
				parts.push(`\`\`\`\n${element.textContent ?? ''}\n\`\`\``)
				break
			default:
				parts.push(serializeMarkdownNode(element))
		}
	}

	return parts.filter(Boolean).join('\n\n')
}

function headingMarkdown(element: HTMLElement, level: number): string {
	const prefix = '#'.repeat(level)
	const align = element.style.textAlign
	const text = inlineMarkdown(element)
	if (align && align !== 'left' && align !== 'start') {
		return `<h${level} style="text-align: ${align}">${text}</h${level}>`
	}
	return `${prefix} ${text}`
}

function blockMarkdown(element: HTMLElement, tag: string): string {
	const align = element.style.textAlign
	const content = inlineMarkdown(element)
	if (align && align !== 'left' && align !== 'start') {
		return `<${tag} style="text-align: ${align}">${content}</${tag}>`
	}
	return content
}

function inlineMarkdown(element: HTMLElement): string {
	let result = ''

	for (const child of Array.from(element.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE) {
			result += child.textContent ?? ''
			continue
		}

		if (child.nodeType !== Node.ELEMENT_NODE) {
			continue
		}

		const el = child as HTMLElement
		const text = el.textContent ?? ''

		if (el.tagName === 'STRONG' || el.tagName === 'B') {
			result += `**${serializeInlineChildren(el)}**`
		} else if (el.tagName === 'EM' || el.tagName === 'I') {
			result += `*${serializeInlineChildren(el)}*`
		} else if (el.tagName === 'A') {
			const href = el.getAttribute('href') ?? ''
			const linkText = serializeInlineChildren(el)
			result += href ? `[${linkText}](${href})` : linkText
		} else if (el.tagName === 'CODE') {
			result += `\`${text}\``
		} else if (el.tagName === 'SPAN') {
			const color = el.style.color
			const inner = serializeInlineChildren(el)
			if (color) {
				result += `<span style="color: ${color}">${inner}</span>`
			} else {
				result += inner
			}
		} else if (el.tagName === 'MARK') {
			const bg = el.style.backgroundColor
			const inner = serializeInlineChildren(el)
			if (bg) {
				result += `<mark style="background-color: ${bg}">${inner}</mark>`
			} else {
				result += `<mark>${inner}</mark>`
			}
		} else {
			result += serializeInlineChildren(el)
		}
	}

	return result.trim()
}

function serializeInlineChildren(element: HTMLElement): string {
	let result = ''

	for (const child of Array.from(element.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE) {
			result += child.textContent ?? ''
			continue
		}

		if (child.nodeType !== Node.ELEMENT_NODE) {
			continue
		}

		const el = child as HTMLElement
		const text = el.textContent ?? ''

		if (el.tagName === 'STRONG' || el.tagName === 'B') {
			result += `**${serializeInlineChildren(el)}**`
		} else if (el.tagName === 'EM' || el.tagName === 'I') {
			result += `*${serializeInlineChildren(el)}*`
		} else if (el.tagName === 'A') {
			const href = el.getAttribute('href') ?? ''
			const linkText = serializeInlineChildren(el)
			result += href ? `[${linkText}](${href})` : linkText
		} else if (el.tagName === 'CODE') {
			result += `\`${text}\``
		} else if (el.tagName === 'SPAN') {
			const color = el.style.color
			const inner = serializeInlineChildren(el)
			if (color) {
				result += `<span style="color: ${color}">${inner}</span>`
			} else {
				result += inner
			}
		} else if (el.tagName === 'MARK') {
			const bg = el.style.backgroundColor
			const inner = serializeInlineChildren(el)
			if (bg) {
				result += `<mark style="background-color: ${bg}">${inner}</mark>`
			} else {
				result += `<mark>${inner}</mark>`
			}
		} else {
			result += text
		}
	}

	return result
}

export function markdownToHtml(markdown: string): string {
	const trimmed = markdown.trim()
	if (!trimmed) {
		return '<p></p>'
	}

	return marked.parse(trimmed, { async: false }) as string
}

export function normalizeMarkdownContent(content: string): string {
	return content.trim()
}

export function normalizeDocumentRecord(document: DocumentRecord): DocumentRecord {
	const source = document.source ?? 'user'
	const contentFormat =
		document.contentFormat ??
		(/<[a-z][\s\S]*>/i.test(document.content) ? 'html' : 'markdown')

	return {
		...document,
		source,
		contentFormat,
		readOnly: source === 'upload' ? false : (document.readOnly ?? false),
	}
}

export function isDocumentReadOnly(document: DocumentRecord): boolean {
	return normalizeDocumentRecord(document).readOnly
}

export function documentContentToEditorHtml(
	document: Pick<DocumentRecord, 'content' | 'contentFormat'>,
): string {
	if (document.contentFormat === 'markdown') {
		return markdownToHtml(document.content)
	}

	return document.content.trim() || '<p></p>'
}

export function editorHtmlToDocumentContent(
	html: string,
	format: DocumentContentFormat,
): string {
	if (format === 'markdown') {
		return htmlToMarkdown(html)
	}

	return html.trim() || '<p></p>'
}

export function documentContentForExport(
	document: Pick<DocumentRecord, 'content' | 'contentFormat'>,
	format: 'txt' | 'md',
): string {
	if (format === 'md') {
		return document.contentFormat === 'markdown'
			? document.content
			: htmlToMarkdown(document.content)
	}

	return document.contentFormat === 'markdown'
		? document.content
		: htmlToPlainTextMultiline(document.content)
}

export function ingestUploadedDocumentContent(
	file: File,
	raw: string,
): { content: string; contentFormat: DocumentContentFormat } {
	const trimmed = raw.trim()
	const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

	if (extension === 'html' || extension === 'htm') {
		return { content: trimmed, contentFormat: 'html' }
	}

	return { content: trimmed, contentFormat: 'markdown' }
}

/** @deprecated Use normalizeMarkdownContent or ingestUploadedDocumentContent */
export function normalizeDocumentContent(content: string): string {
	const trimmed = content.trim()
	if (!trimmed) {
		return ''
	}

	if (/<[a-z][\s\S]*>/i.test(trimmed)) {
		return htmlToMarkdown(trimmed)
	}

	return trimmed
}

export function formatTimestamp(timestamp: number): string {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(timestamp))
}

export interface CreateDocumentDefaults {
	source?: DocumentSource
	contentFormat?: DocumentContentFormat
	readOnly?: boolean
}

export function resolveCreateDocumentDefaults(
	options: CreateDocumentDefaults = {},
): Required<CreateDocumentDefaults> {
	const source = options.source ?? 'user'
	return {
		source,
		contentFormat: options.contentFormat ?? 'markdown',
		readOnly: options.readOnly ?? false,
	}
}
