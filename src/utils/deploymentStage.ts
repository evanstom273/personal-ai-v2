export type DeploymentStage = 'local-dev' | 'preview' | 'github-pages' | 'production'

export interface DeploymentStageInfo {
	stage: DeploymentStage
	label: string
	description: string
}

const STAGE_CONFIG: Record<DeploymentStage, Omit<DeploymentStageInfo, 'stage'>> = {
	'local-dev': {
		label: 'Local Dev',
		description: 'Vite dev server — Ollama proxied at /api',
	},
	preview: {
		label: 'Preview',
		description: 'Local production build preview',
	},
	'github-pages': {
		label: 'GitHub Pages',
		description: 'Deployed at evanstom273.github.io/personal-ai-v2',
	},
	production: {
		label: 'Production',
		description: 'Hosted deployment',
	},
}

export function getDeploymentStage(): DeploymentStageInfo {
	const { hostname } = window.location

	if (hostname.endsWith('github.io')) {
		return { stage: 'github-pages', ...STAGE_CONFIG['github-pages'] }
	}

	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		const stage: DeploymentStage = import.meta.env.DEV ? 'local-dev' : 'preview'
		return { stage, ...STAGE_CONFIG[stage] }
	}

	return { stage: 'production', ...STAGE_CONFIG.production }
}
