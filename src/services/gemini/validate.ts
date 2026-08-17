import { geminiFetch } from '@/services/gemini/client'

export interface ApiKeyValidationResult {
	ok: boolean
	message: string
}

export async function validateApiKey(
	apiKey: string,
): Promise<ApiKeyValidationResult> {
	const trimmed = apiKey.trim()
	if (!trimmed) {
		return { ok: false, message: 'Enter an API key first.' }
	}

	try {
		const response = await geminiFetch<{ models?: Array<{ name: string }> }>(
			trimmed,
			'/models?pageSize=1',
		)

		if (!response.models || response.models.length === 0) {
			return {
				ok: false,
				message: 'Connected, but no models were returned for this key.',
			}
		}

		return {
			ok: true,
			message: 'Connection successful. Your API key is valid.',
		}
	} catch (error) {
		return {
			ok: false,
			message:
				error instanceof Error
					? error.message
					: 'Could not validate the API key.',
		}
	}
}
