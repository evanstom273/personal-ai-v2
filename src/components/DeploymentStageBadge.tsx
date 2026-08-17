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
			className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-semibold ${styles.badge}`}
			title={description}
		>
			<span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
			<span className="hidden sm:inline truncate">{label}</span>
		</div>
	)
}
