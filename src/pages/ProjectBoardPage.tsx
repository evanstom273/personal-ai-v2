import {
	DndContext,
	DragOverlay,
	PointerSensor,
	TouchSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
	ArrowLeft,
	ChevronDown,
	FileText,
	GripVertical,
	MoreHorizontal,
	Plus,
	Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDocuments } from '@/hooks/useDocuments'
import { useProjects } from '@/hooks/useProjects'
import { getProject, subscribeProjectsChanged } from '@/services/projects/projectService'
import type {
	ProjectChecklistItem,
	ProjectRecord,
	ProjectTaskRecord,
	ProjectTaskStatus,
} from '@/storage/types'
import { cn } from '@/utils/cn'

const COLUMNS: Array<{ id: ProjectTaskStatus; label: string }> = [
	{ id: 'todo', label: 'To do' },
	{ id: 'doing', label: 'Doing' },
	{ id: 'done', label: 'Done' },
]

const DEFAULT_COLLAPSED: Record<ProjectTaskStatus, boolean> = {
	todo: false,
	doing: false,
	done: false,
}

export function ProjectBoardPage() {
	const { projectId = '' } = useParams()
	const navigate = useNavigate()
	const { saveTask, addTask, changeTaskStatus, removeTask } = useProjects()
	const [project, setProject] = useState<ProjectRecord | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [editingTask, setEditingTask] = useState<ProjectTaskRecord | null>(null)
	const editingTaskRef = useRef<ProjectTaskRecord | null>(null)
	const [collapsed, setCollapsed] =
		useState<Record<ProjectTaskStatus, boolean>>(DEFAULT_COLLAPSED)
	const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 180, tolerance: 6 },
		}),
	)

	const refreshProject = useCallback(async (): Promise<void> => {
		if (!projectId) {
			setProject(null)
			setIsLoading(false)
			return
		}

		const next = await getProject(projectId)
		setProject(next ?? null)
		setIsLoading(false)
	}, [projectId])

	useEffect(() => {
		void refreshProject()
	}, [refreshProject])

	useEffect(() => {
		editingTaskRef.current = editingTask
	}, [editingTask])

	useEffect(() => {
		return subscribeProjectsChanged(() => {
			if (editingTaskRef.current) {
				return
			}

			void refreshProject()
		})
	}, [refreshProject])

	const columns = useMemo(() => {
		if (!project) {
			return {
				todo: [] as ProjectTaskRecord[],
				doing: [] as ProjectTaskRecord[],
				done: [] as ProjectTaskRecord[],
			}
		}

		return {
			todo: project.tasks.filter((task) => task.status === 'todo'),
			doing: project.tasks.filter((task) => task.status === 'doing'),
			done: project.tasks.filter((task) => task.status === 'done'),
		}
	}, [project])

	const activeTask = useMemo(() => {
		if (!project || !activeTaskId) {
			return null
		}

		return project.tasks.find((task) => task.id === activeTaskId) ?? null
	}, [activeTaskId, project])

	function handleDragStart(event: DragStartEvent): void {
		setActiveTaskId(String(event.active.id))
	}

	function handleDragEnd(event: DragEndEvent): void {
		setActiveTaskId(null)

		if (!project) {
			return
		}

		const taskId = String(event.active.id)
		const overId = event.over?.id
		if (!overId) {
			return
		}

		const nextStatus = String(overId) as ProjectTaskStatus
		if (!COLUMNS.some((column) => column.id === nextStatus)) {
			return
		}

		const task = project.tasks.find((item) => item.id === taskId)
		if (!task || task.status === nextStatus) {
			return
		}

		void changeTaskStatus(project.id, taskId, nextStatus)
	}

	async function handleAddTask(status: ProjectTaskStatus): Promise<void> {
		if (!project) {
			return
		}

		const task = await addTask(project.id, {
			title: 'New task',
			status,
		})

		if (task) {
			setEditingTask(task)
		}
	}

	function toggleColumn(status: ProjectTaskStatus): void {
		setCollapsed((current) => ({
			...current,
			[status]: !current[status],
		}))
	}

	async function handleToggleChecklistItem(
		task: ProjectTaskRecord,
		itemId: string,
		checked: boolean,
	): Promise<void> {
		if (!project) {
			return
		}

		const checklist = task.checklist.map((item) =>
			item.id === itemId ? { ...item, checked } : item,
		)

		setProject((current) =>
			current
				? {
						...current,
						tasks: current.tasks.map((entry) =>
							entry.id === task.id ? { ...entry, checklist } : entry,
						),
					}
				: current,
		)

		await saveTask(project.id, task.id, { checklist })
	}

	if (isLoading) {
		return <p className="px-4 py-6 text-sm text-muted-foreground">Loading board…</p>
	}

	if (!project) {
		return (
			<div className="px-4 py-10 text-center">
				<p className="text-sm text-muted-foreground">Project not found.</p>
				<Button className="mt-4" variant="outline" asChild>
					<Link to="/library?section=projects">Back to projects</Link>
				</Button>
			</div>
		)
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="shrink-0 border-b border-border/80 px-4 py-3 md:px-6">
				<div className="flex items-center gap-3">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="px-2"
						onClick={() => navigate('/library?section=projects')}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="min-w-0 flex-1">
						<h2 className="truncate text-base font-semibold">{project.title}</h2>
						{project.description ? (
							<p className="truncate text-xs text-muted-foreground">
								{project.description}
							</p>
						) : null}
					</div>
				</div>
			</div>

			<DndContext
				sensors={sensors}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
					<div className="space-y-4">
						{COLUMNS.map((column) => (
							<BoardColumn
								key={column.id}
								column={column}
								tasks={columns[column.id]}
								isCollapsed={collapsed[column.id]}
								onToggle={() => toggleColumn(column.id)}
								onAddTask={() => {
									void handleAddTask(column.id)
								}}
								onEditTask={setEditingTask}
								onMoveTask={(task, status) => {
									void changeTaskStatus(project.id, task.id, status)
								}}
								onDeleteTask={(task) => {
									if (window.confirm(`Delete "${task.title}"?`)) {
										void removeTask(project.id, task.id)
									}
								}}
								onToggleChecklistItem={(task, itemId, checked) => {
									void handleToggleChecklistItem(task, itemId, checked)
								}}
							/>
						))}
					</div>
				</div>

				<DragOverlay dropAnimation={null}>
					{activeTask ? (
						<TaskCardPreview task={activeTask} isDragging />
					) : null}
				</DragOverlay>
			</DndContext>

			<TaskEditorDialog
				open={editingTask !== null}
				task={editingTask ?? undefined}
				onOpenChange={(open) => {
					if (!open) {
						setEditingTask(null)
						void refreshProject()
					}
				}}
				onPersist={async (input) => {
					if (!editingTask || !project) {
						return
					}

					const updated = await saveTask(project.id, editingTask.id, input)
					if (!updated) {
						return
					}

					setProject((current) =>
						current
							? {
									...current,
									tasks: current.tasks.map((entry) =>
										entry.id === updated.id ? updated : entry,
									),
									updatedAt: Date.now(),
								}
							: current,
					)
					setEditingTask(updated)
				}}
			/>
		</div>
	)
}

function BoardColumn({
	column,
	tasks,
	isCollapsed,
	onToggle,
	onAddTask,
	onEditTask,
	onMoveTask,
	onDeleteTask,
	onToggleChecklistItem,
}: {
	column: (typeof COLUMNS)[number]
	tasks: ProjectTaskRecord[]
	isCollapsed: boolean
	onToggle: () => void
	onAddTask: () => void
	onEditTask: (task: ProjectTaskRecord) => void
	onMoveTask: (task: ProjectTaskRecord, status: ProjectTaskStatus) => void
	onDeleteTask: (task: ProjectTaskRecord) => void
	onToggleChecklistItem: (
		task: ProjectTaskRecord,
		itemId: string,
		checked: boolean,
	) => void
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: column.id,
	})

	return (
		<section
			ref={setNodeRef}
			className={cn(
				'rounded-xl border border-border/70 bg-card/40 transition-colors',
				isOver && 'border-primary/40 bg-primary/5',
			)}
		>
			<div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
				<button
					type="button"
					onClick={onToggle}
					className="inline-flex min-w-0 flex-1 items-center gap-2 text-left"
					aria-expanded={!isCollapsed}
				>
					<ChevronDown
						className={cn(
							'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
							isCollapsed && '-rotate-90',
						)}
					/>
					<h3 className="truncate text-sm font-medium">{column.label}</h3>
					<span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
						{tasks.length}
					</span>
				</button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="h-8 w-8 shrink-0 px-0"
					onClick={onAddTask}
					aria-label={`Add task to ${column.label}`}
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>

			{!isCollapsed ? (
				<div className="space-y-2 p-3">
					{tasks.length === 0 ? (
						<p className="px-1 py-2 text-xs text-muted-foreground">
							No cards yet. Add one or drag a card here.
						</p>
					) : (
						tasks.map((task) => (
							<DraggableTaskCard
								key={task.id}
								task={task}
								onEdit={() => onEditTask(task)}
								onMove={(status) => onMoveTask(task, status)}
								onDelete={() => onDeleteTask(task)}
								onToggleChecklistItem={(itemId, checked) => {
									onToggleChecklistItem(task, itemId, checked)
								}}
							/>
						))
					)}
				</div>
			) : null}
		</section>
	)
}

function DraggableTaskCard({
	task,
	onEdit,
	onMove,
	onDelete,
	onToggleChecklistItem,
}: {
	task: ProjectTaskRecord
	onEdit: () => void
	onMove: (status: ProjectTaskStatus) => void
	onDelete: () => void
	onToggleChecklistItem: (itemId: string, checked: boolean) => void
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: task.id,
	})

	const style = {
		transform: CSS.Translate.toString(transform),
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(isDragging && 'opacity-40')}
		>
			<TaskCardPreview
				task={task}
				dragHandleProps={{ attributes, listeners }}
				onEdit={onEdit}
				onMove={onMove}
				onDelete={onDelete}
				onToggleChecklistItem={onToggleChecklistItem}
			/>
		</div>
	)
}

function TaskCardPreview({
	task,
	isDragging,
	dragHandleProps,
	onEdit,
	onMove,
	onDelete,
	onToggleChecklistItem,
}: {
	task: ProjectTaskRecord
	isDragging?: boolean
	dragHandleProps?: Pick<ReturnType<typeof useDraggable>, 'attributes' | 'listeners'>
	onEdit?: () => void
	onMove?: (status: ProjectTaskStatus) => void
	onDelete?: () => void
	onToggleChecklistItem?: (itemId: string, checked: boolean) => void
}) {
	return (
		<div
			className={cn(
				'surface-panel rounded-lg p-3',
				isDragging && 'shadow-lg ring-1 ring-primary/30',
			)}
		>
			<div className="flex items-start gap-2">
				<button
					type="button"
					className="mt-0.5 shrink-0 touch-none text-muted-foreground hover:text-foreground"
					aria-label="Drag task"
					{...dragHandleProps?.attributes}
					{...dragHandleProps?.listeners}
				>
					<GripVertical className="h-4 w-4" />
				</button>

				<div className="min-w-0 flex-1">
					<button
						type="button"
						onClick={onEdit}
						className="w-full text-left"
					>
						<p className="font-medium">{task.title}</p>
						{task.note ? (
							<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
								{task.note}
							</p>
						) : null}
					</button>

					{task.checklist.length > 0 ? (
						<ul className="mt-3 space-y-1.5">
							{task.checklist.map((item) => (
								<li key={item.id}>
									<label className="flex items-start gap-2 text-xs">
										<input
											type="checkbox"
											className="mt-0.5"
											checked={item.checked}
											onChange={(event) => {
												event.stopPropagation()
												onToggleChecklistItem?.(item.id, event.target.checked)
											}}
											onClick={(event) => event.stopPropagation()}
										/>
										<span
											className={cn(
												'min-w-0 flex-1',
												item.checked && 'line-through opacity-70',
											)}
										>
											{item.label}
										</span>
									</label>
								</li>
							))}
						</ul>
					) : null}

					{task.documentIds.length > 0 ? (
						<p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
							<FileText className="h-3.5 w-3.5" />
							{task.documentIds.length} linked
						</p>
					) : null}
				</div>

				{onEdit && onMove && onDelete ? (
					<DropdownMenu>
						<DropdownMenuTrigger
							hideChevron
							className="h-8 w-8 shrink-0 justify-center px-0"
							aria-label="Task actions"
						>
							<MoreHorizontal className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
							{COLUMNS.filter((column) => column.id !== task.status).map((column) => (
								<DropdownMenuItem
									key={column.id}
									onSelect={() => onMove(column.id)}
								>
									Move to {column.label}
								</DropdownMenuItem>
							))}
							<DropdownMenuItem className="text-destructive" onSelect={onDelete}>
								<Trash2 className="h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
		</div>
	)
}

function TaskEditorDialog({
	open,
	task,
	onOpenChange,
	onPersist,
}: {
	open: boolean
	task?: ProjectTaskRecord
	onOpenChange: (open: boolean) => void
	onPersist: (input: {
		title: string
		note?: string
		status?: ProjectTaskStatus
		checklist: ProjectChecklistItem[]
		documentIds: string[]
		reminderId?: string
	}) => Promise<void>
}) {
	const { documents } = useDocuments()
	const [title, setTitle] = useState('')
	const [note, setNote] = useState('')
	const [taskStatus, setTaskStatus] = useState<ProjectTaskStatus>('todo')
	const [checklist, setChecklist] = useState<ProjectChecklistItem[]>([])
	const [newChecklistItem, setNewChecklistItem] = useState('')
	const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
	const [reminderId, setReminderId] = useState('')
	const [formError, setFormError] = useState<string | null>(null)
	const skipNextPersistRef = useRef(false)
	const persistTimerRef = useRef<number | null>(null)

	useEffect(() => {
		if (!open || !task) {
			return
		}

		skipNextPersistRef.current = true
		setTitle(task.title)
		setNote(task.note ?? '')
		setTaskStatus(task.status)
		setChecklist(task.checklist)
		setSelectedDocumentIds(task.documentIds)
		setReminderId(task.reminderId ?? '')
		setNewChecklistItem('')
		setFormError(null)
	}, [open, task])

	const persistNow = useCallback(
		async (overrides?: Partial<{
			title: string
			note: string
			taskStatus: ProjectTaskStatus
			checklist: ProjectChecklistItem[]
			selectedDocumentIds: string[]
			reminderId: string
		}>) => {
			const nextTitle = (overrides?.title ?? title).trim()
			if (!nextTitle) {
				setFormError('Title is required.')
				return
			}

			setFormError(null)

			try {
				await onPersist({
					title: nextTitle,
					note: (overrides?.note ?? note).trim() || undefined,
					status: overrides?.taskStatus ?? taskStatus,
					checklist: overrides?.checklist ?? checklist,
					documentIds: overrides?.selectedDocumentIds ?? selectedDocumentIds,
					reminderId: (overrides?.reminderId ?? reminderId).trim() || undefined,
				})
			} catch (error) {
				setFormError(
					error instanceof Error ? error.message : 'Could not save task.',
				)
			}
		},
		[
			checklist,
			note,
			onPersist,
			reminderId,
			selectedDocumentIds,
			taskStatus,
			title,
		],
	)

	const schedulePersist = useCallback(
		(overrides?: Parameters<typeof persistNow>[0]) => {
			if (persistTimerRef.current !== null) {
				window.clearTimeout(persistTimerRef.current)
			}

			persistTimerRef.current = window.setTimeout(() => {
				persistTimerRef.current = null
				void persistNow(overrides)
			}, 350)
		},
		[persistNow],
	)

	useEffect(() => {
		if (!open || !task) {
			return
		}

		if (skipNextPersistRef.current) {
			skipNextPersistRef.current = false
			return
		}

		schedulePersist()

		return () => {
			if (persistTimerRef.current !== null) {
				window.clearTimeout(persistTimerRef.current)
				persistTimerRef.current = null
			}
		}
	}, [
		checklist,
		note,
		open,
		reminderId,
		schedulePersist,
		selectedDocumentIds,
		task,
		taskStatus,
		title,
	])

	function toggleDocument(documentId: string): void {
		setSelectedDocumentIds((current) => {
			const next = current.includes(documentId)
				? current.filter((id) => id !== documentId)
				: [...current, documentId]

			if (persistTimerRef.current !== null) {
				window.clearTimeout(persistTimerRef.current)
				persistTimerRef.current = null
			}

			void persistNow({ selectedDocumentIds: next })
			return next
		})
	}

	function addChecklistItem(): void {
		const label = newChecklistItem.trim()
		if (!label) {
			return
		}

		const nextChecklist = [
			...checklist,
			{ id: crypto.randomUUID(), label, checked: false },
		]
		setChecklist(nextChecklist)
		setNewChecklistItem('')

		if (persistTimerRef.current !== null) {
			window.clearTimeout(persistTimerRef.current)
			persistTimerRef.current = null
		}

		void persistNow({ checklist: nextChecklist })
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit task</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="task-title" className="text-sm font-medium">
							Title
						</label>
						<input
							id="task-title"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="task-status" className="text-sm font-medium">
							Column
						</label>
						<select
							id="task-status"
							value={taskStatus}
							onChange={(event) => {
								const nextStatus = event.target.value as ProjectTaskStatus
								setTaskStatus(nextStatus)

								if (persistTimerRef.current !== null) {
									window.clearTimeout(persistTimerRef.current)
									persistTimerRef.current = null
								}

								void persistNow({ taskStatus: nextStatus })
							}}
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						>
							{COLUMNS.map((column) => (
								<option key={column.id} value={column.id}>
									{column.label}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<label htmlFor="task-note" className="text-sm font-medium">
							Note
						</label>
						<textarea
							id="task-note"
							value={note}
							onChange={(event) => setNote(event.target.value)}
							rows={3}
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>
					<div className="space-y-2">
						<p className="text-sm font-medium">Checklist</p>
						<div className="space-y-2">
							{checklist.map((item) => (
								<label
									key={item.id}
									className="flex items-center gap-2 text-sm"
								>
									<input
										type="checkbox"
										checked={item.checked}
										onChange={(event) => {
											const nextChecklist = checklist.map((entry) =>
												entry.id === item.id
													? { ...entry, checked: event.target.checked }
													: entry,
											)
											setChecklist(nextChecklist)

											if (persistTimerRef.current !== null) {
												window.clearTimeout(persistTimerRef.current)
												persistTimerRef.current = null
											}

											void persistNow({ checklist: nextChecklist })
										}}
									/>
									<span className={cn(item.checked && 'line-through opacity-70')}>
										{item.label}
									</span>
									<button
										type="button"
										className="ml-auto text-xs text-destructive"
										onClick={() => {
											const nextChecklist = checklist.filter(
												(entry) => entry.id !== item.id,
											)
											setChecklist(nextChecklist)

											if (persistTimerRef.current !== null) {
												window.clearTimeout(persistTimerRef.current)
												persistTimerRef.current = null
											}

											void persistNow({ checklist: nextChecklist })
										}}
									>
										Remove
									</button>
								</label>
							))}
						</div>
						<div className="flex gap-2">
							<input
								value={newChecklistItem}
								onChange={(event) => setNewChecklistItem(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault()
										addChecklistItem()
									}
								}}
								placeholder="Add checklist item"
								className="min-w-0 flex-1 rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
							/>
							<Button type="button" variant="outline" onClick={addChecklistItem}>
								Add
							</Button>
						</div>
					</div>
					{documents.length > 0 ? (
						<div className="space-y-2">
							<p className="text-sm font-medium">Linked documents</p>
							<div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2">
								{documents.map((document) => (
									<label
										key={document.id}
										className="flex items-center gap-2 text-sm"
									>
										<input
											type="checkbox"
											checked={selectedDocumentIds.includes(document.id)}
											onChange={() => toggleDocument(document.id)}
										/>
										<span className="truncate">{document.title}</span>
									</label>
								))}
							</div>
						</div>
					) : null}
					<div className="space-y-2">
						<label htmlFor="task-reminder-id" className="text-sm font-medium">
							Reminder id{' '}
							<span className="text-muted-foreground">(optional)</span>
						</label>
						<input
							id="task-reminder-id"
							value={reminderId}
							onChange={(event) => setReminderId(event.target.value)}
							placeholder="Link an existing reminder"
							className="w-full rounded-lg surface-input px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
						/>
					</div>
					{formError ? (
						<p className="text-sm text-destructive">{formError}</p>
					) : null}
					<div className="flex justify-end">
						<Button type="button" onClick={() => onOpenChange(false)}>
							Done
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
