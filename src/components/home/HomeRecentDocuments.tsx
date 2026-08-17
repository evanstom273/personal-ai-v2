import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HomeEmptyState, HomeSection } from '@/components/home/HomeSection'
import type { DocumentRecord } from '@/storage/types'
import { formatMessageTime } from '@/utils/dateTime'

interface HomeRecentDocumentsProps {
	documents: DocumentRecord[]
	isLoading: boolean
}

export function HomeRecentDocuments({
	documents,
	isLoading,
}: HomeRecentDocumentsProps) {
	const recent = documents.slice(0, 5)

	return (
		<HomeSection title="Recent documents" icon={FileText} href="/library">
			{isLoading ? (
				<HomeEmptyState>Loading documents…</HomeEmptyState>
			) : recent.length === 0 ? (
				<HomeEmptyState>No documents yet. Create one from Library.</HomeEmptyState>
			) : (
				<ul className="space-y-2">
					{recent.map((document) => (
						<li key={document.id}>
							<Link
								to={`/library/documents/${document.id}`}
								className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
							>
								<span className="min-w-0 truncate text-sm">{document.title}</span>
								<span className="shrink-0 text-xs text-muted-foreground">
									{formatMessageTime(document.updatedAt)}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</HomeSection>
	)
}
