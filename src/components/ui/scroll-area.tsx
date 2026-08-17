import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import type { ComponentProps, Ref } from 'react'
import { cn } from '@/utils/cn'

export function ScrollArea({
	className,
	children,
	viewportRef,
	...props
}: ComponentProps<typeof ScrollAreaPrimitive.Root> & {
	viewportRef?: Ref<HTMLDivElement>
}) {
	return (
		<ScrollAreaPrimitive.Root
			className={cn('relative min-w-0 overflow-hidden', className)}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				ref={viewportRef}
				className="h-full w-full max-w-full overflow-x-hidden rounded-[inherit] [&>div]:!block [&>div]:max-w-full [&>div]:min-w-0"
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			<ScrollAreaPrimitive.Scrollbar
				className="flex touch-none select-none p-0.5 transition-colors"
				orientation="vertical"
			>
				<ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
			</ScrollAreaPrimitive.Scrollbar>
		</ScrollAreaPrimitive.Root>
	)
}
