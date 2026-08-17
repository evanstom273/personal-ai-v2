import React from 'react'
import { Globe, Laptop, MonitorPlay, Server } from 'lucide-react'
import { getDeploymentStage, type DeploymentStage } from '../utils/deploymentStage'

const STAGE_STYLES: Record<
	DeploymentStage,
	{ icon: React.ReactNode; badge: string; dot: string }
> = {
	'local-dev': {
		icon: <Laptop className="w-3.5 h-3.5" />,
		badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
		dot: 'bg-amber-400',
	},
	preview: {
		icon: <MonitorPlay className="w-3.5 h-3.5" />,
		badge: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
		dot: 'bg-sky-400',
	},
	'github-pages': {
		icon: <Globe className="w-3.5 h-3.5" />,
		badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
		dot: 'bg-emerald-400',
	},
	production: {
		icon: <Server className="w-3.5 h-3.5" />,
		badge: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
		dot: 'bg-violet-400',
	},
}

export const DeploymentStageBadge: React.FC = () => {
	const { stage, label, description } = getDeploymentStage()
	const styles = STAGE_STYLES[stage]

	return (
		<div
			className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${styles.badge}`}
			title={description}
		>
			<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
			<span className="hidden md:inline-flex items-center gap-1.5">
				{styles.icon}
				<span>{label}</span>
			</span>
			<span className="md:hidden">{label}</span>
		</div>
	)
}
