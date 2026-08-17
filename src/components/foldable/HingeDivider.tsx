import { GripVertical, ArrowLeftRight, RotateCcw } from 'lucide-react'
import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from '@/utils/cn'

interface HingeDividerProps {
	splitRatio: number;
	onRatioChange: (ratio: number) => void;
	onSwapPanes?: () => void;
	hingeGap?: number;
	isHardwareFoldable?: boolean;
}

export function HingeDivider({
	splitRatio,
	onRatioChange,
	onSwapPanes,
	hingeGap = 0,
	isHardwareFoldable = false,
}: HingeDividerProps) {
	const [isDragging, setIsDragging] = useState(false)
	const [showPresets, setShowPresets] = useState(false)
	const dividerRef = useRef<HTMLDivElement>(null)

	const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0 && event.pointerType === 'mouse') return
		setIsDragging(true)
		;(event.target as HTMLElement).setPointerCapture(event.pointerId)
	}

	const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
		if (!isDragging) return
		const parent = dividerRef.current?.parentElement
		if (!parent) return

		const rect = parent.getBoundingClientRect()
		const clientX = event.clientX
		const relativeX = clientX - rect.left
		const newRatio = (relativeX / rect.width) * 100

		onRatioChange(newRatio)
	}

	const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
		if (isDragging) {
			setIsDragging(false)
			try {
				;(event.target as HTMLElement).releasePointerCapture(event.pointerId)
			} catch {
				// Ignore capture release errors
			}
		}
	}

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			let delta = 0
			if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
				delta = -5
			} else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
				delta = 5
			} else if (event.key === 'Home') {
				onRatioChange(20)
				return
			} else if (event.key === 'End') {
				onRatioChange(80)
				return
			} else if (event.key === 'Enter' || event.key === ' ') {
				onRatioChange(50)
				return
			}

			if (delta !== 0) {
				event.preventDefault()
				onRatioChange(splitRatio + delta)
			}
		},
		[onRatioChange, splitRatio],
	)

	return (
		<div
			ref={dividerRef}
			role="slider"
			tabIndex={0}
			aria-label="Split Screen Resizable Divider"
			aria-valuenow={splitRatio}
			aria-valuemin={20}
			aria-valuemax={80}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onKeyDown={handleKeyDown}
			onMouseEnter={() => setShowPresets(true)}
			onMouseLeave={() => setShowPresets(false)}
			style={{
				width: isHardwareFoldable && hingeGap > 0 ? `${Math.max(12, hingeGap)}px` : '12px',
			}}
			className={cn(
				'group relative z-30 flex cursor-col-resize select-none flex-col items-center justify-center transition-colors',
				'hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
				isDragging ? 'bg-primary/20' : 'bg-border/40',
			)}
		>
			{/* Hardware fold hinge mask or visual bar */}
			<div
				className={cn(
					'h-full w-[2px] transition-colors',
					isDragging ? 'bg-primary' : 'bg-border group-hover:bg-primary/70',
				)}
			/>

			{/* Center Grab Handle & Presets Bar */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
				<div
					className={cn(
						'flex h-10 w-6 items-center justify-center rounded-full border border-border bg-card shadow-md transition-transform',
						isDragging && 'scale-110 border-primary bg-primary/20 text-primary',
						'group-hover:border-primary/50',
					)}
				>
					<GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
				</div>

				{/* Quick ratio presets popover / tooltip on hover/focus */}
				<div
					className={cn(
						'absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg border border-border bg-popover/95 p-1 text-xs shadow-lg backdrop-blur-md transition-all duration-200',
						showPresets || isDragging ? 'pointer-events-auto opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95',
					)}
				>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onRatioChange(50)
						}}
						className={cn(
							'rounded px-1.5 py-0.5 font-mono text-[11px] hover:bg-accent',
							splitRatio === 50 && 'bg-primary/20 font-semibold text-primary',
						)}
					>
						50/50
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onRatioChange(60)
						}}
						className={cn(
							'rounded px-1.5 py-0.5 font-mono text-[11px] hover:bg-accent',
							splitRatio === 60 && 'bg-primary/20 font-semibold text-primary',
						)}
					>
						60/40
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onRatioChange(40)
						}}
						className={cn(
							'rounded px-1.5 py-0.5 font-mono text-[11px] hover:bg-accent',
							splitRatio === 40 && 'bg-primary/20 font-semibold text-primary',
						)}
					>
						40/60
					</button>
					{onSwapPanes ? (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation()
								onSwapPanes()
							}}
							title="Swap Panes"
							className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
						>
							<ArrowLeftRight className="h-3 w-3" />
						</button>
					) : null}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							onRatioChange(50)
						}}
						title="Reset Split"
						className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
					>
						<RotateCcw className="h-3 w-3" />
					</button>
				</div>
			</div>
		</div>
	)
}
