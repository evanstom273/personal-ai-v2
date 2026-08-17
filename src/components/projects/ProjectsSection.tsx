import { FolderKanban, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProjects } from '@/hooks/useProjects'
import { formatTimestamp } from '@/utils/documentContent'

export function ProjectsSection() {
	const { projects, isLoading, addProject, saveProject, removeProject } =
		useProjects()
	const [showForm, setShowForm] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [formError, setFormError] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)

	const sortedProjects = useMemo(
		() => [...projects].sort((a, b) => b.updatedAt - a.updatedAt),
		[projects],
	)

	function resetForm(): void {
		setEditingId(null)
		setTitle('')
		setDescription('')
		setFormError(null)
	}

	function startCreate(): void {
		resetForm()
		setShowForm(true)
	}

	function startEdit(project: (typeof projects)[number]): void {
		setEditingId(project.id)
		setTitle(project.title)
		setDescription(project.description ?? '')
		setFormError(null)
		setShowForm(true)
	}

	async function handleSubmit(event: FormEvent): Promise<void> {
		event.preventDefault()
		setFormError(null)

		if (!title.trim()) {
			setFormError('Title is required.')
			return
		}

		setIsSaving(true)
		try {
			if (editingId) {
				await saveProject(editingId, {
					title: title.trim(),
					description: description.trim() || undefined,
				})
			} else {
				await addProject({
					title: title.trim(),
					description: description.trim() || undefined,
				})
			}

			resetForm()
			setShowForm(false)
		} catch (error) {
			setFormError(
				error instanceof Error ? error.message : 'Could not save project.',
			)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-sm text-muted-foreground">
						Track work on kanban boards with todo, doing, and done columns. Ask in{' '}
						<Link
							to="/chat"
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							chat
						</Link>{' '}
						to set up a project from a document or break work into tasks.
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Projects are separate from documents. Tasks can link to documents and
						reminders.
					</p>
				</div>
				<Button
					type="button"
					size="sm"
					onClick={() => (showForm ? (resetForm(), setShowForm(false)) : startCreate())}
				>
					{showForm ? null : <Plus className="h-4 w-4" />}
					{showForm ? 'Cancel' : 'New project'}
				</Button>
			</div>

			{showForm ? (
				<form
					onSubmit={(event) => void handleSubmit(event)}
					className="surface-panel space-y-4 rounded-xl p-5"
				>
					<h3 className="text-sm font-medium">
						{editingId ? 'Edit project' : 'Create project'}
					</h3>
					<div className="space-y-2">
						<label htmlFor="project-title" className="text-sm font-medium">
							Title
						</label>
						<input
							id="project-title"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="Kitchen renovation"
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="project-description" className="text-sm font-medium">
							Description{' '}
							<span className="text-muted-foreground">(optional)</span>
						</label>
						<textarea
							id="project-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							rows={3}
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>
					{formError ? (
						<p className="text-sm text-destructive">{formError}</p>
					) : null}
					<Button type="submit" disabled={isSaving}>
						{isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add project'}
					</Button>
				</form>
			) : null}

			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading projects…</p>
			) : sortedProjects.length === 0 ? (
				<div className="library-placeholder rounded-2xl px-6 py-12 text-center">
					<FolderKanban className="mx-auto h-8 w-8 text-primary" />
					<p className="mt-3 text-sm font-medium">No projects yet</p>
					<p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
						Create one above or ask your assistant to set up a board from your
						notes.
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{sortedProjects.map((project) => {
						const todoCount = project.tasks.filter(
							(task) => task.status === 'todo',
						).length
						const doingCount = project.tasks.filter(
							(task) => task.status === 'doing',
						).length
						const doneCount = project.tasks.filter(
							(task) => task.status === 'done',
						).length

						return (
							<div
								key={project.id}
								className="surface-panel flex items-start gap-3 rounded-xl px-4 py-3"
							>
								<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
									<FolderKanban className="h-4 w-4" />
								</div>
								<div className="min-w-0 flex-1">
									<Link
										to={`/library/projects/${project.id}`}
										className="block font-medium hover:underline"
									>
										{project.title}
									</Link>
									{project.description ? (
										<p className="mt-1 text-sm text-muted-foreground">
											{project.description}
										</p>
									) : null}
									<p className="mt-2 text-xs text-muted-foreground">
										{todoCount} todo · {doingCount} doing · {doneCount} done ·
										Updated {formatTimestamp(project.updatedAt)}
									</p>
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger
										hideChevron
										className="h-9 w-9 shrink-0 justify-center px-0"
										aria-label="Project actions"
									>
										<MoreHorizontal className="h-4 w-4" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem asChild>
											<Link to={`/library/projects/${project.id}`}>Open board</Link>
										</DropdownMenuItem>
										<DropdownMenuItem onSelect={() => startEdit(project)}>
											<Pencil className="h-4 w-4" />
											Edit
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-destructive"
											onSelect={() => {
												if (
													window.confirm(`Delete "${project.title}" and all tasks?`)
												) {
													void removeProject(project.id)
												}
											}}
										>
											<Trash2 className="h-4 w-4" />
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
