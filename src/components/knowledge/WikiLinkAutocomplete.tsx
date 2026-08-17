import { useCallback, useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { createPortal } from 'react-dom'
import { WIKI_LINK_PROVIDERS } from '@/autocomplete/providers'
import { insertTriggerSelection } from '@/autocomplete/triggers'
import { AutocompleteMenu } from '@/components/autocomplete/AutocompleteMenu'
import { useAutocomplete } from '@/hooks/useAutocomplete'
import { findDocumentByTitle } from '@/services/documents/documentService'

interface WikiLinkAutocompleteProps {
	editor: Editor | null
	enabled: boolean
}

export function WikiLinkAutocomplete({ editor, enabled }: WikiLinkAutocompleteProps) {
	const [cursorPosition, setCursorPosition] = useState(0)
	const [textSnapshot, setTextSnapshot] = useState('')
	const menuRef = useRef<HTMLDivElement | null>(null)
	const [menuStyle, setMenuStyle] = useState<{
		top: number
		left: number
		width: number
	} | null>(null)

	const autocomplete = useAutocomplete({
		text: textSnapshot,
		cursorPosition,
		enabled,
		triggers: ['[['],
		providers: WIKI_LINK_PROVIDERS,
		createOption: (query) => ({
			label: `Create "${query}"`,
			value: query,
			entityType: 'note',
		}),
		limit: 10,
	})

	const refreshEditorState = useCallback(() => {
		if (!editor) return
		const { from } = editor.state.selection
		const textBefore = editor.state.doc.textBetween(0, from, '\n')
		setTextSnapshot(textBefore)
		setCursorPosition(textBefore.length)
	}, [editor])

	useEffect(() => {
		if (!editor) return

		const onUpdate = () => refreshEditorState()
		const onSelection = () => refreshEditorState()

		editor.on('update', onUpdate)
		editor.on('selectionUpdate', onSelection)
		refreshEditorState()

		return () => {
			editor.off('update', onUpdate)
			editor.off('selectionUpdate', onSelection)
		}
	}, [editor, refreshEditorState])

	useEffect(() => {
		if (!autocomplete.isOpen || !editor) {
			setMenuStyle(null)
			return
		}

		const coords = editor.view.coordsAtPos(editor.state.selection.from)
		setMenuStyle({
			top: coords.bottom + 8,
			left: coords.left,
			width: Math.max(240, coords.right - coords.left),
		})
	}, [autocomplete.isOpen, editor, textSnapshot, cursorPosition])

	const applyWikiLink = useCallback(
		(title: string) => {
			if (!editor || !autocomplete.activeMatch) return

			const { text, cursorPosition: nextCursor } = insertTriggerSelection(
				textSnapshot,
				autocomplete.activeMatch,
				`[[${title}]]`,
			)

			const { from } = editor.state.selection
			const deleteFrom = from - autocomplete.activeMatch.query.length - 2
			editor
				.chain()
				.focus()
				.deleteRange({ from: deleteFrom, to: from })
				.insertContent(`[[${title}]]`)
				.run()

			void findDocumentByTitle(title)

			setTextSnapshot(text)
			setCursorPosition(nextCursor)
		},
		[autocomplete.activeMatch, editor, textSnapshot],
	)

	useEffect(() => {
		if (!editor) return

		const onKeyDown = (event: KeyboardEvent) => {
			handleWikiLinkAutocompleteKeyDown(editor, event, autocomplete, applyWikiLink)
		}

		editor.view.dom.addEventListener('keydown', onKeyDown)
		return () => editor.view.dom.removeEventListener('keydown', onKeyDown)
	}, [editor, autocomplete, applyWikiLink])

	return createPortal(
		autocomplete.isOpen && menuStyle ? (
			<div
				ref={menuRef}
				style={{
					position: 'fixed',
					top: menuStyle.top,
					left: menuStyle.left,
					width: menuStyle.width,
					zIndex: 50,
				}}
			>
				<AutocompleteMenu
					heading="Link to note"
					items={autocomplete.items}
					selectedIndex={autocomplete.selectedIndex}
					createOption={autocomplete.createItem}
					onSelect={(item) => applyWikiLink(item.title)}
					onSelectCreate={(option) => applyWikiLink(option.value)}
				/>
			</div>
		) : null,
		document.body,
	)
}

export function handleWikiLinkAutocompleteKeyDown(
	_editor: Editor | null,
	event: KeyboardEvent,
	autocomplete: ReturnType<typeof useAutocomplete>,
	onApply: (title: string) => void,
): boolean {
	if (!autocomplete.isOpen) return false

	if (event.key === 'ArrowDown') {
		event.preventDefault()
		autocomplete.moveSelection(1)
		return true
	}
	if (event.key === 'ArrowUp') {
		event.preventDefault()
		autocomplete.moveSelection(-1)
		return true
	}
	if (event.key === 'Escape') {
		event.preventDefault()
		return true
	}
	if (event.key === 'Enter' || event.key === 'Tab') {
		event.preventDefault()
		const createIndex = autocomplete.items.length
		if (autocomplete.createItem && autocomplete.selectedIndex === createIndex) {
			onApply(autocomplete.createItem.value)
		} else {
			const item = autocomplete.items[autocomplete.selectedIndex]
			if (item) onApply(item.title)
		}
		return true
	}
	return false
}
