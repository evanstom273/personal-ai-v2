const SCROLL_KEY = 'gemini-chat-scroll-top'

export function saveChatScrollTop(scrollTop: number): void {
	try {
		sessionStorage.setItem(SCROLL_KEY, String(scrollTop))
	} catch {
		// ignore storage failures
	}
}

export function readChatScrollTop(): number | null {
	try {
		const raw = sessionStorage.getItem(SCROLL_KEY)
		if (raw === null) {
			return null
		}

		const value = Number(raw)
		return Number.isFinite(value) ? value : null
	} catch {
		return null
	}
}
