export type GeminiHarmCategory =
	| 'HARM_CATEGORY_HARASSMENT'
	| 'HARM_CATEGORY_HATE_SPEECH'
	| 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
	| 'HARM_CATEGORY_DANGEROUS_CONTENT'
	| 'HARM_CATEGORY_CIVIC_INTEGRITY'

export interface GeminiSafetySetting {
	category: GeminiHarmCategory
	threshold: 'OFF'
}

const PERMISSIVE_HARM_CATEGORIES: GeminiHarmCategory[] = [
	'HARM_CATEGORY_HARASSMENT',
	'HARM_CATEGORY_HATE_SPEECH',
	'HARM_CATEGORY_SEXUALLY_EXPLICIT',
	'HARM_CATEGORY_DANGEROUS_CONTENT',
	'HARM_CATEGORY_CIVIC_INTEGRITY',
]

export function getPermissiveSafetySettings(): GeminiSafetySetting[] {
	return PERMISSIVE_HARM_CATEGORIES.map((category) => ({
		category,
		threshold: 'OFF',
	}))
}

export function applySafetySettingsToRequestBody(
	body: Record<string, unknown>,
	allowMatureContent: boolean,
): Record<string, unknown> {
	if (!allowMatureContent) {
		return body
	}

	return {
		...body,
		safetySettings: getPermissiveSafetySettings(),
	}
}

export function applyImageGenerationRequestBody(
	body: Record<string, unknown>,
	allowMatureContent: boolean,
): Record<string, unknown> {
	return applySafetySettingsToRequestBody(body, allowMatureContent)
}
