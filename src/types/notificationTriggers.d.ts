interface TimestampTrigger {
	readonly timestamp: number
}

interface TimestampTriggerConstructor {
	new (timestamp: number): TimestampTrigger
}

interface Window {
	TimestampTrigger?: TimestampTriggerConstructor
}

interface NotificationOptions {
	showTrigger?: TimestampTrigger
}

declare const TimestampTrigger: TimestampTriggerConstructor | undefined
