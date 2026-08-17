import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export function useSwipePageTransition() {
	const navigate = useNavigate()

	const navigateWithFade = useCallback(
		(target: { pathname: string; search: string }) => {
			navigate({
				pathname: target.pathname,
				search: target.search,
			})
		},
		[navigate],
	)

	return {
		navigateWithFade,
		contentClassName: 'min-h-0 flex-1 flex flex-col overflow-hidden',
	}
}
