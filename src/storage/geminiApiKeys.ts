import type { GeminiApiKeySlot, UserPreferences } from '@/storage/types'

export function getGeminiApiKeyForSlot(
	preferences: UserPreferences,
	slot: GeminiApiKeySlot,
): string {
	return slot === 'paid'
		? preferences.geminiApiKeyPaid.trim()
		: preferences.geminiApiKeyFree.trim()
}

export function getActiveGeminiApiKey(preferences: UserPreferences): string {
	return getGeminiApiKeyForSlot(preferences, preferences.activeGeminiApiKeySlot)
}

export function hasGeminiApiKey(preferences: UserPreferences): boolean {
	return getActiveGeminiApiKey(preferences).length > 0
}

export function hasGeminiApiKeyForSlot(
	preferences: UserPreferences,
	slot: GeminiApiKeySlot,
): boolean {
	return getGeminiApiKeyForSlot(preferences, slot).length > 0
}

export const GEMINI_API_KEY_SLOT_LABELS: Record<GeminiApiKeySlot, string> = {
	paid: 'Paid key',
	free: 'Free key',
}
