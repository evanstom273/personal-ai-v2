import { ListTodo, BellRing, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { HomeEmptyState, HomeSection } from '@/components/home/HomeSection'
import { Button } from '@/components/ui/button'
import { useHomeTodos } from '@/hooks/useHomeTodos'
import { cn } from '@/utils/cn'

export function HomeTodoSection() {
	const {
		todos,
		dailyReviewReminderId,
		isLoading,
		addTodo,
		toggleTodo,
		editTodo,
		deleteTodo,
		enableDailyReview,
		disableDailyReview,
	} = useHomeTodos()
	const [draft, setDraft] = useState('')
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editingText, setEditingText] = useState('')
	const [isSavingDaily, setIsSavingDaily] = useState(false)

	async function handleAdd(event: FormEvent): Promise<void> {
		event.preventDefault()
		const text = draft.trim()
		if (!text) {
			return
		}
		setDraft('')
		await addTodo(text)
	}

	async function commitEdit(id: string): Promise<void> {
		const text = editingText.trim()
		setEditingId(null)
		if (!text) {
			return
		}
		await editTodo(id, text)
	}

	function handleEditKeyDown(
		event: KeyboardEvent<HTMLInputElement>,
		id: string,
	): void {
		if (event.key === 'Enter') {
			event.preventDefault()
			void commitEdit(id)
		}
		if (event.key === 'Escape') {
			setEditingId(null)
		}
	}

	async function handleDailyReviewToggle(): Promise<void> {
		setIsSavingDaily(true)
		try {
			if (dailyReviewReminderId) {
				await disableDailyReview()
			} else {
				await enableDailyReview()
			}
		} finally {
			setIsSavingDaily(false)
		}
	}

	return (
		<HomeSection
			title="To-do list"
			icon={ListTodo}
			action={
				<Button
					type="button"
					variant={dailyReviewReminderId ? 'secondary' : 'outline'}
					size="sm"
					disabled={isSavingDaily}
					onClick={() => void handleDailyReviewToggle()}
				>
					<BellRing className="h-3.5 w-3.5" />
					{dailyReviewReminderId ? 'Daily review on' : 'Daily review'}
				</Button>
			}
		>
			<p className="mb-3 text-sm text-muted-foreground">
				General tasks for today. Edit here or ask in{' '}
				<Link to="/chat" className="text-primary underline-offset-4 hover:underline">
					chat
				</Link>{' '}
				to update your list. Turn on daily review to get a morning reminder with this
				list in chat.
			</p>

			<form onSubmit={(event) => void handleAdd(event)} className="mb-3 flex gap-2">
				<input
					type="text"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					placeholder="Add a task…"
					className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/40 focus:ring-2"
				/>
				<Button type="submit" size="sm" disabled={!draft.trim()}>
					<Plus className="h-4 w-4" />
					Add
				</Button>
			</form>

			{isLoading ? (
				<HomeEmptyState>Loading todos…</HomeEmptyState>
			) : todos.length === 0 ? (
				<HomeEmptyState>No todos yet. Add one above or ask the assistant.</HomeEmptyState>
			) : (
				<ul className="space-y-1">
					{todos.map((todo) => (
						<li
							key={todo.id}
							className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-secondary/40"
						>
							<input
								type="checkbox"
								checked={todo.checked}
								onChange={(event) => {
									void toggleTodo(todo.id, event.target.checked)
								}}
								className="shrink-0"
								aria-label={`Mark "${todo.text}" complete`}
							/>
							{editingId === todo.id ? (
								<input
									type="text"
									value={editingText}
									autoFocus
									onChange={(event) => setEditingText(event.target.value)}
									onBlur={() => void commitEdit(todo.id)}
									onKeyDown={(event) => handleEditKeyDown(event, todo.id)}
									className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none ring-primary/40 focus:ring-2"
								/>
							) : (
								<button
									type="button"
									onClick={() => {
										setEditingId(todo.id)
										setEditingText(todo.text)
									}}
									className={cn(
										'min-w-0 flex-1 truncate text-left text-sm',
										todo.checked && 'text-muted-foreground line-through',
									)}
								>
									{todo.text}
								</button>
							)}
							<button
								type="button"
								onClick={() => void deleteTodo(todo.id)}
								className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
								aria-label={`Delete "${todo.text}"`}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</button>
						</li>
					))}
				</ul>
			)}
		</HomeSection>
	)
}
