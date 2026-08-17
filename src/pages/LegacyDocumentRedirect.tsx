import { Navigate, useParams } from 'react-router-dom'

export function LegacyDocumentRedirect() {
	const { documentId } = useParams<{ documentId: string }>()
	return <Navigate to={`/library/documents/${documentId ?? ''}`} replace />
}
