import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layout/AppShell'
import { ChatPage } from '@/pages/ChatPage'
import { DocumentEditorPage } from '@/pages/DocumentEditorPage'
import { HomePage } from '@/pages/HomePage'
import { LegacyDocumentRedirect } from '@/pages/LegacyDocumentRedirect'
import { LibraryPage } from '@/pages/LibraryPage'
import { MemoryPage } from '@/pages/MemoryPage'
import { ProjectBoardPage } from '@/pages/ProjectBoardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ChatProvider } from '@/providers/ChatProvider'
import { FoldablePaneProvider } from '@/providers/FoldablePaneProvider'
import { ScratchpadProvider } from '@/providers/ScratchpadProvider'

export function App() {
	const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

	return (
		<BrowserRouter basename={routerBasename || undefined}>
			<ChatProvider>
				<ScratchpadProvider>
					<FoldablePaneProvider>
						<Routes>
							<Route element={<AppShell />}>
								<Route index element={<Navigate to="/home" replace />} />
								<Route path="home" element={<HomePage />} />
								<Route path="chat" element={<ChatPage />} />
								<Route path="library" element={<LibraryPage />} />
								<Route path="library/projects/:projectId" element={<ProjectBoardPage />} />
								<Route path="library/documents/:documentId" element={<DocumentEditorPage />} />
								<Route path="memory" element={<MemoryPage />} />
								<Route path="documents" element={<Navigate to="/library" replace />} />
								<Route path="documents/:documentId" element={<LegacyDocumentRedirect />} />
								<Route path="settings" element={<SettingsPage />} />
							</Route>
							<Route path="*" element={<Navigate to="/home" replace />} />
						</Routes>
					</FoldablePaneProvider>
				</ScratchpadProvider>
			</ChatProvider>
		</BrowserRouter>
	)
}
