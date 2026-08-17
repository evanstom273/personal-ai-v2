import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { usePreferencesContext } from '@/providers/ChatProvider'

const AUTOSAVE_MS = 400
const UNDO_MS = 8000

interface ScratchpadContextValue {
	isOpen: boolean
	content: string
	undoContent: string | null
	isBusy: boolean
	busyLabel: string | null
	error: string | null
	openScratchpad: () => void
	closeScratchpad: () => void
	toggleScratchpad: () => void
	setContent: (next: string) => void
	clearScratchpad: () => void
	undoClear: () => void
	dismissUndo: () => void
	setBusy: (busy: boolean, label?: string | null) => void
	setError: (message: string | null) => void
}

const ScratchpadContext = createContext<ScratchpadContextValue | null>(null)

export function ScratchpadProvider({ children }: { children: ReactNode }) {
	const { preferences, savePreferences } = usePreferencesContext()
	const [isOpen, setIsOpen] = useState(false)
	const [content, setContentState] = useState(preferences.scratchpadContent)
	const [undoContent, setUndoContent] = useState<string | null>(null)
	const [isBusy, setIsBusy] = useState(false)
	const [busyLabel, setBusyLabel] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const saveTimerRef = useRef<number | null>(null)
	const undoTimerRef = useRef<number | null>(null)
	const contentRef = useRef(content)

	useEffect(() => {
		contentRef.current = content
	}, [content])

	useEffect(() => {
		setContentState(preferences.scratchpadContent)
	}, [preferences.scratchpadContent])

	const persistContent = useCallback(
		async (next: string) => {
			await savePreferences({
				...preferences,
				scratchpadContent: next,
			})
		},
		[preferences, savePreferences],
	)

	const setContent = useCallback(
		(next: string) => {
			setContentState(next)
			setError(null)

			if (saveTimerRef.current) {
				window.clearTimeout(saveTimerRef.current)
			}

			saveTimerRef.current = window.setTimeout(() => {
				void persistContent(next)
			}, AUTOSAVE_MS)
		},
		[persistContent],
	)

	const dismissUndo = useCallback(() => {
		if (undoTimerRef.current) {
			window.clearTimeout(undoTimerRef.current)
			undoTimerRef.current = null
		}
		setUndoContent(null)
	}, [])

	const clearScratchpad = useCallback(() => {
		const previous = contentRef.current
		if (!previous.trim()) {
			return
		}

		setUndoContent(previous)
		setContent('')

		if (undoTimerRef.current) {
			window.clearTimeout(undoTimerRef.current)
		}

		undoTimerRef.current = window.setTimeout(() => {
			setUndoContent(null)
			undoTimerRef.current = null
		}, UNDO_MS)
	}, [setContent])

	const undoClear = useCallback(() => {
		if (!undoContent) {
			return
		}

		setContent(undoContent)
		dismissUndo()
	}, [dismissUndo, setContent, undoContent])

	const openScratchpad = useCallback(() => {
		setIsOpen(true)
		setError(null)
	}, [])

	const closeScratchpad = useCallback(() => {
		setIsOpen(false)
		setError(null)
		void persistContent(contentRef.current)
	}, [persistContent])

	const toggleScratchpad = useCallback(() => {
		if (isOpen) {
			closeScratchpad()
			return
		}
		openScratchpad()
	}, [closeScratchpad, isOpen, openScratchpad])

	const setBusy = useCallback((busy: boolean, label: string | null = null) => {
		setIsBusy(busy)
		setBusyLabel(label)
	}, [])

	useEffect(() => {
		return () => {
			if (saveTimerRef.current) {
				window.clearTimeout(saveTimerRef.current)
			}
			if (undoTimerRef.current) {
				window.clearTimeout(undoTimerRef.current)
			}
		}
	}, [])

	const value = useMemo(
		(): ScratchpadContextValue => ({
			isOpen,
			content,
			undoContent,
			isBusy,
			busyLabel,
			error,
			openScratchpad,
			closeScratchpad,
			toggleScratchpad,
			setContent,
			clearScratchpad,
			undoClear,
			dismissUndo,
			setBusy,
			setError,
		}),
		[
			busyLabel,
			clearScratchpad,
			closeScratchpad,
			content,
			error,
			isBusy,
			isOpen,
			openScratchpad,
			setBusy,
			setContent,
			toggleScratchpad,
			undoClear,
			undoContent,
			dismissUndo,
		],
	)

	return (
		<ScratchpadContext.Provider value={value}>
			{children}
		</ScratchpadContext.Provider>
	)
}

export function useScratchpad(): ScratchpadContextValue {
	const context = useContext(ScratchpadContext)
	if (!context) {
		throw new Error('useScratchpad must be used within ScratchpadProvider')
	}
	return context
}
