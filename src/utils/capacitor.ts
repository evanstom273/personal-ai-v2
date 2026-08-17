import { Capacitor } from '@capacitor/core'

export function isCapacitorNativePlatform(): boolean {
	return Capacitor.isNativePlatform()
}

export function isCapacitorAndroid(): boolean {
	return Capacitor.getPlatform() === 'android'
}
