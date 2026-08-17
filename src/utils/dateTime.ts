export function formatMessageDateTime(timestamp: number): string {
	return new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short',
	}).format(new Date(timestamp))
}

export function formatMessageTime(timestamp: number): string {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(timestamp))
}

export function formatCurrentDateTimeContext(now = new Date()): string {
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
	const formatted = new Intl.DateTimeFormat(undefined, {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit',
		timeZoneName: 'short',
	}).format(now)

	return `${formatted} (${timeZone})`
}

export function formatMessageForModel(
	content: string,
	createdAt: number,
	role: 'user' | 'assistant',
): string {
	const speaker = role === 'user' ? 'User' : 'Assistant'
	return `[${speaker} · ${formatMessageDateTime(createdAt)}]\n${content}`
}
