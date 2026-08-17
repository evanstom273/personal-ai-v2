export const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

export function extractWikiLinkTitles(content: string): string[] {
	const titles: string[] = []
	const seen = new Set<string>()
	let match: RegExpExecArray | null

	WIKI_LINK_PATTERN.lastIndex = 0
	while ((match = WIKI_LINK_PATTERN.exec(content)) !== null) {
		const title = match[1].trim()
		if (!title) continue
		const key = title.toLowerCase()
		if (seen.has(key)) continue
		seen.add(key)
		titles.push(title)
	}

	return titles
}

export function wikiLinksToMarkdownHtml(content: string): string {
	return content.replace(WIKI_LINK_PATTERN, (_match, title: string, alias?: string) => {
		const label = (alias?.trim() || title.trim()).replace(/"/g, '&quot;')
		const target = title.trim().replace(/"/g, '&quot;')
		return `<a data-wiki-link="${target}" class="wiki-link">${label}</a>`
	})
}

export function markdownHtmlWikiLinksToMarkdown(html: string): string {
	if (!html.includes('data-wiki-link')) {
		return html
	}

	const doc = new DOMParser().parseFromString(html, 'text/html')
	for (const anchor of Array.from(doc.querySelectorAll('a[data-wiki-link]'))) {
		const target = anchor.getAttribute('data-wiki-link')?.trim()
		if (!target) continue
		const label = anchor.textContent?.trim() ?? target
		const wiki =
			label.toLowerCase() === target.toLowerCase()
				? `[[${target}]]`
				: `[[${target}|${label}]]`
		anchor.replaceWith(doc.createTextNode(wiki))
	}

	return doc.body.innerHTML
}
