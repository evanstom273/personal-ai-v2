import { useEffect } from 'react'

interface UseEdgeSwipeToOpenDrawerOptions {
	enabled: boolean
	onOpen: () => void
	edgeWidth?: number
	openThreshold?: number
}

export function useEdgeSwipeToOpenDrawer({
	enabled,
	onOpen,
	edgeWidth = 28,
	openThreshold = 64,
}: UseEdgeSwipeToOpenDrawerOptions): void {
	useEffect(() => {
		if (!enabled) {
			return
		}

		let startX = 0
		let startY = 0
		let tracking = false

		function handleTouchStart(event: TouchEvent): void {
			if (event.touches.length !== 1) {
				return
			}

			const touch = event.touches[0]
			if (touch.clientX > edgeWidth) {
				return
			}

			startX = touch.clientX
			startY = touch.clientY
			tracking = true
		}

		function handleTouchMove(event: TouchEvent): void {
			if (!tracking || event.touches.length !== 1) {
				return
			}

			const touch = event.touches[0]
			const deltaX = touch.clientX - startX
			const deltaY = Math.abs(touch.clientY - startY)

			if (deltaY > 48) {
				tracking = false
				return
			}

			if (deltaX >= openThreshold) {
				tracking = false
				onOpen()
			}
		}

		function handleTouchEnd(): void {
			tracking = false
		}

		document.addEventListener('touchstart', handleTouchStart, { passive: true })
		document.addEventListener('touchmove', handleTouchMove, { passive: true })
		document.addEventListener('touchend', handleTouchEnd, { passive: true })
		document.addEventListener('touchcancel', handleTouchEnd, { passive: true })

		return () => {
			document.removeEventListener('touchstart', handleTouchStart)
			document.removeEventListener('touchmove', handleTouchMove)
			document.removeEventListener('touchend', handleTouchEnd)
			document.removeEventListener('touchcancel', handleTouchEnd)
		}
	}, [edgeWidth, enabled, onOpen, openThreshold])
}
