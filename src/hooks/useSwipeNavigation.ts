import { useEffect } from 'react'

const SWIPE_DISTANCE_PX = 72
const SWIPE_RATIO = 1.5

function isSwipeLockedTarget(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) {
		return false
	}

	return Boolean(
		target.closest(
			'[data-swipe-lock], [data-horizontal-scroll], input, textarea, select, button, a, [contenteditable="true"]',
		),
	)
}

function isHorizontallyScrollable(element: Element): boolean {
	const scrollable = element.closest('[data-horizontal-scroll]')
	if (!(scrollable instanceof HTMLElement)) {
		return false
	}

	return scrollable.scrollWidth > scrollable.clientWidth + 4
}

export function useSwipeNavigation({
	enabled,
	onSwipeLeft,
	onSwipeRight,
}: {
	enabled: boolean
	onSwipeLeft: () => void
	onSwipeRight: () => void
}): void {
	useEffect(() => {
		if (!enabled) {
			return
		}

		let startX = 0
		let startY = 0
		let tracking = false

		function handleTouchStart(event: TouchEvent): void {
			if (event.touches.length !== 1 || isSwipeLockedTarget(event.target)) {
				tracking = false
				return
			}

			const touch = event.touches[0]
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
			const deltaY = touch.clientY - startY

			if (Math.abs(deltaY) > Math.abs(deltaX)) {
				tracking = false
			}
		}

		function handleTouchEnd(event: TouchEvent): void {
			if (!tracking) {
				return
			}

			tracking = false
			const touch = event.changedTouches[0]
			const deltaX = touch.clientX - startX
			const deltaY = touch.clientY - startY

			if (Math.abs(deltaX) < SWIPE_DISTANCE_PX) {
				return
			}

			if (Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_RATIO) {
				return
			}

			if (isSwipeLockedTarget(event.target)) {
				return
			}

			if (event.target instanceof Element && isHorizontallyScrollable(event.target)) {
				return
			}

			if (deltaX > 0) {
				onSwipeRight()
				return
			}

			onSwipeLeft()
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
	}, [enabled, onSwipeLeft, onSwipeRight])
}
