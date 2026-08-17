import type { ReactNode } from 'react'
import { DualPaneHeader } from '@/components/foldable/DualPaneHeader'
import { HingeDivider } from '@/components/foldable/HingeDivider'
import { SecondaryPaneContent } from '@/components/foldable/SecondaryPaneContent'
import { useFoldablePane } from '@/hooks/useFoldablePane'

interface FoldableDualPaneLayoutProps {
	children: ReactNode
}

export function FoldableDualPaneLayout({ children }: FoldableDualPaneLayoutProps) {
	const {
		foldableInfo,
		isDualPaneActive,
		pane2Route,
		splitRatio,
		setSplitRatio,
		swapPanes,
	} = useFoldablePane()

	if (!isDualPaneActive || !pane2Route) {
		return <>{children}</>
	}

	return (
		<div className="flex h-full w-full flex-col overflow-hidden bg-background">
			{/* Dual Pane Top Header */}
			<DualPaneHeader />

			{/* Main Split Screen Body */}
			<div className="relative flex min-h-0 flex-1 w-full overflow-hidden">
				{/* Pane 1 (Primary / Router Outlet Content) */}
				<div
					style={{ width: `${splitRatio}%` }}
					className="flex min-w-0 flex-col overflow-hidden border-r border-border/40"
				>
					<div className="h-full w-full overflow-y-auto">
						{children}
					</div>
				</div>

				{/* Resizable Hinge Divider */}
				<HingeDivider
					splitRatio={splitRatio}
					onRatioChange={setSplitRatio}
					onSwapPanes={swapPanes}
					hingeGap={foldableInfo.hingeGap}
					isHardwareFoldable={foldableInfo.isHardwareFoldable}
				/>

				{/* Pane 2 (Secondary View) */}
				<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
					<div className="h-full w-full overflow-y-auto">
						<SecondaryPaneContent route={pane2Route} />
					</div>
				</div>
			</div>
		</div>
	)
}
