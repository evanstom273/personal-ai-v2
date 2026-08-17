import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export function Sheet(props: ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root {...props} />
}

export function SheetTrigger(
	props: ComponentProps<typeof DialogPrimitive.Trigger>,
) {
	return <DialogPrimitive.Trigger {...props} />
}

export function SheetClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close {...props} />
}

export function SheetPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal {...props} />
}

export function SheetOverlay({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			className={cn(
				'fixed inset-0 z-[70] bg-black/60 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
				className,
			)}
			{...props}
		/>
	)
}

export function SheetContent({
	className,
	children,
	side = 'left',
	hideCloseButton = false,
	...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
	side?: 'left' | 'right'
	hideCloseButton?: boolean
}) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<DialogPrimitive.Content
				className={cn(
					'fixed z-[70] flex h-full flex-col bg-sidebar text-sidebar-foreground shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-300',
					side === 'left'
						? 'inset-y-0 left-0 w-[min(18rem,85vw)] border-r border-sidebar-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left'
						: 'inset-y-0 right-0 w-[min(18rem,85vw)] border-l border-sidebar-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
					className,
				)}
				{...props}
			>
				{children}
				{hideCloseButton ? null : (
					<DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-none">
						<X className="h-4 w-4" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</SheetPortal>
	)
}
