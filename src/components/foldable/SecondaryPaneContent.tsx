import { useMemo } from 'react'
import { Navigate, Route, Routes, type Location } from 'react-router-dom'
import { DocumentEditorPage } from '@/pages/DocumentEditorPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { MemoryPage } from '@/pages/MemoryPage'
import { ProjectBoardPage } from '@/pages/ProjectBoardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ScratchpadPanel } from '@/components/scratchpad/ScratchpadPanel'

interface SecondaryPaneContentProps {
	route: string
}

function buildSecondaryLocation(route: string): Location {
	const trimmed = route.trim() || '/library'
	const queryIndex = trimmed.indexOf('?')
	const pathname = queryIndex >= 0 ? trimmed.slice(0, queryIndex) : trimmed
	const search = queryIndex >= 0 ? trimmed.slice(queryIndex) : ''

	return {
		pathname: pathname || '/library',
		search,
		hash: '',
		state: null,
		key: 'secondary-pane',
	}
}

export function SecondaryPaneContent({ route }: SecondaryPaneContentProps) {
	const secondaryLocation = useMemo(() => buildSecondaryLocation(route), [route])

	return (
		<div className="h-full w-full overflow-hidden bg-background">
			<Routes location={secondaryLocation}>
				<Route path="/library/documents/:documentId" element={<DocumentEditorPage />} />
				<Route path="/library/projects/:projectId" element={<ProjectBoardPage />} />
				<Route path="/library" element={<LibraryPage />} />
				<Route path="/memory" element={<MemoryPage />} />
				<Route path="/settings" element={<SettingsPage />} />
				<Route path="/scratchpad" element={<ScratchpadPanel embedMode />} />
				<Route path="*" element={<Navigate to="/library" replace />} />
			</Routes>
		</div>
	)
}
