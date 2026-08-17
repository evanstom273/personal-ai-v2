export function formatMessageTimestamp(timestamp: number): string {
	const d = new Date(timestamp)
	const day = d.getDate()
	const month = d.toLocaleString('en-GB', { month: 'short' })
	const year = d.getFullYear()
	const time = d.toLocaleTimeString('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})
	return `${day} ${month} ${year}, ${time}`
}
