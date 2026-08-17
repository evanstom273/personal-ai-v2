export interface GroundingChunk {
	web?: {
		uri?: string
		title?: string
	}
}

export interface GroundingMetadata {
	webSearchQueries?: string[]
	groundingChunks?: GroundingChunk[]
	groundingSupports?: Array<{
		segment?: {
			startIndex?: number
			endIndex?: number
			text?: string
		}
		groundingChunkIndices?: number[]
	}>
}

export function extractGroundingMetadata(candidate: {
	groundingMetadata?: GroundingMetadata
}): GroundingMetadata | undefined {
	return candidate.groundingMetadata
}

export function formatGroundedResponseText(
	text: string,
	metadata: GroundingMetadata | undefined,
): string {
	if (!metadata?.groundingChunks?.length) {
		return text
	}

	const sources = metadata.groundingChunks
		.map((chunk) => chunk.web)
		.filter((web): web is NonNullable<typeof web> => Boolean(web?.uri))
		.map((web) => ({
			title: web.title?.trim() || safeHostname(web.uri!),
			uri: web.uri!,
		}))

	const uniqueSources = sources.filter(
		(source, index, array) =>
			array.findIndex((entry) => entry.uri === source.uri) === index,
	)

	if (uniqueSources.length === 0) {
		return text
	}

	const queries = metadata.webSearchQueries?.filter(Boolean) ?? []
	const queryLine =
		queries.length > 0
			? `\n\n_Searched: ${queries.map((query) => `"${query}"`).join(', ')}_`
			: ''

	const sourceLines = uniqueSources
		.map((source) => `- [${source.title}](${source.uri})`)
		.join('\n')

	return `${text.trim()}\n\n---\n**Sources**${queryLine}\n${sourceLines}`
}

function safeHostname(uri: string): string {
	try {
		return new URL(uri).hostname
	} catch {
		return 'Source'
	}
}
