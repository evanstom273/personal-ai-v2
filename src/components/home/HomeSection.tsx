import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface HomeSectionProps {
	title: string
	icon: LucideIcon
	href?: string
	action?: ReactNode
	children: ReactNode
	className?: string
}

export function HomeSection({
	title,
	icon: Icon,
	href,
	action,
	children,
	className,
}: HomeSectionProps) {
	const titleContent = href ? (
		<Link
			to={href}
			className="truncate text-sm font-medium hover:text-primary hover:underline underline-offset-4"
		>
			{title}
		</Link>
	) : (
		<h2 className="truncate text-sm font-medium">{title}</h2>
	)

	return (
		<section
			className={cn(
				'surface-panel home-placeholder-card rounded-[1.35rem] p-4 md:p-5',
				className,
			)}
		>
			<div className="mb-3 flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2.5">
					<div className="home-hero-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary">
						<Icon className="h-4 w-4" />
					</div>
					{titleContent}
				</div>
				{action ? <div className="shrink-0">{action}</div> : null}
			</div>
			{children}
		</section>
	)
}

export function HomeEmptyState({ children }: { children: ReactNode }) {
	return <p className="text-sm text-muted-foreground">{children}</p>
}
