import { KanbanSquare } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HomeEmptyState, HomeSection } from '@/components/home/HomeSection'
import type { ProjectRecord } from '@/storage/types'

interface HomeActiveProjectsProps {
	projects: ProjectRecord[]
	isLoading: boolean
}

function countActiveTasks(project: ProjectRecord): number {
	return project.tasks.filter((task) => task.status !== 'done').length
}

export function HomeActiveProjects({
	projects,
	isLoading,
}: HomeActiveProjectsProps) {
	const active = projects
		.map((project) => ({
			project,
			activeCount: countActiveTasks(project),
		}))
		.filter((entry) => entry.activeCount > 0)
		.slice(0, 4)

	return (
		<HomeSection title="Ongoing projects" icon={KanbanSquare} href="/library?section=projects">
			{isLoading ? (
				<HomeEmptyState>Loading projects…</HomeEmptyState>
			) : active.length === 0 ? (
				<HomeEmptyState>No active project tasks. Open Projects to add some.</HomeEmptyState>
			) : (
				<ul className="space-y-2">
					{active.map(({ project, activeCount }) => (
						<li key={project.id}>
							<Link
								to={`/library/projects/${project.id}`}
								className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/50"
							>
								<span className="min-w-0 truncate text-sm">{project.title}</span>
								<span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
									{activeCount} active
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</HomeSection>
	)
}
