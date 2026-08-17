const NOTIFICATION_ICON = `${import.meta.env.BASE_URL}pwa-192x192.png`
const NOTIFICATION_TAG = 'chat-generation-complete'
const REMINDER_NOTIFICATION_TAG = 'reminder-due'

export function getNotificationIcon(): string {
	return NOTIFICATION_ICON
}

export function canUseNotifications(): boolean {
	return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission {
	if (!canUseNotifications()) {
		return 'denied'
	}

	return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!canUseNotifications()) {
		return 'denied'
	}

	if (Notification.permission === 'granted') {
		return 'granted'
	}

	if (Notification.permission === 'denied') {
		return 'denied'
	}

	return Notification.requestPermission()
}

export function isStandaloneDisplayMode(): boolean {
	if (typeof window === 'undefined') {
		return false
	}

	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as Navigator & { standalone?: boolean }).standalone ===
			true
	)
}

function shouldShowSystemNotification(isChatRoute: boolean): boolean {
	if (document.visibilityState === 'hidden') {
		return true
	}

	if (!isChatRoute && isStandaloneDisplayMode()) {
		return true
	}

	return false
}

async function showServiceWorkerNotification(
	title: string,
	options: NotificationOptions & { renotify?: boolean },
): Promise<boolean> {
	if (!('serviceWorker' in navigator)) {
		return false
	}

	try {
		const registration = await navigator.serviceWorker.ready
		await registration.showNotification(title, options)
		return true
	} catch {
		return false
	}
}

function showWindowNotification(
	title: string,
	options: NotificationOptions,
): void {
	const notification = new Notification(title, options)
	notification.onclick = () => {
		window.focus()
		notification.close()
	}
}

export async function notifyReminderDue(
	aiName: string,
	title: string,
	preview: string,
	options?: { isChatRoute?: boolean },
): Promise<void> {
	if (!canUseNotifications() || Notification.permission !== 'granted') {
		return
	}

	const isChatRoute = options?.isChatRoute ?? true
	if (!shouldShowSystemNotification(isChatRoute)) {
		return
	}

	const body = preview.trim().slice(0, 160) || title
	const icon = getNotificationIcon()
	const notificationOptions = {
		body,
		icon,
		badge: icon,
		tag: REMINDER_NOTIFICATION_TAG,
		data: { url: '/chat' },
	}

	const shown = await showServiceWorkerNotification(`${aiName} reminder`, {
		...notificationOptions,
		renotify: true,
	})
	if (!shown) {
		try {
			showWindowNotification(`${aiName} reminder`, notificationOptions)
		} catch {
			// ignore notification failures
		}
	}
}

export async function notifyGenerationComplete(
	aiName: string,
	preview: string,
	options?: { isChatRoute?: boolean },
): Promise<void> {
	if (!canUseNotifications() || Notification.permission !== 'granted') {
		return
	}

	const isChatRoute = options?.isChatRoute ?? true
	if (!shouldShowSystemNotification(isChatRoute)) {
		return
	}

	const title = `${aiName} replied`
	const body = preview.trim().slice(0, 160) || 'Your reply is ready in chat.'
	const icon = getNotificationIcon()
	const notificationOptions = {
		body,
		icon,
		badge: icon,
		tag: NOTIFICATION_TAG,
		data: { url: '/chat' },
	}

	const shown = await showServiceWorkerNotification(title, {
		...notificationOptions,
		renotify: true,
	})
	if (!shown) {
		try {
			showWindowNotification(title, notificationOptions)
		} catch {
			// ignore notification failures
		}
	}
}
