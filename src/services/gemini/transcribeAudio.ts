import { geminiFetch } from '@/services/gemini/client'
import { resolveEconomyModelId } from '@/services/gemini/constants'

interface TranscribeAudioResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{
				text?: string
			}>
		}
	}>
}

export async function transcribeAudioWithGemini(
	apiKey: string,
	modelId: string,
	audioBlob: Blob,
): Promise<string> {
	if (!apiKey.trim()) {
		throw new Error('Add your Gemini API key in Settings to use voice input.')
	}

	if (audioBlob.size === 0) {
		throw new Error('No audio was recorded. Try speaking again.')
	}

	const mimeType = normalizeAudioMimeType(audioBlob.type)
	const base64 = await blobToBase64(audioBlob)

	const response = await geminiFetch<TranscribeAudioResponse>(
		apiKey,
		`/models/${resolveEconomyModelId(modelId)}:generateContent`,
		{
			method: 'POST',
			body: JSON.stringify({
				contents: [
					{
						role: 'user',
						parts: [
							{
								text: 'Transcribe this audio verbatim. Return only the spoken words with normal punctuation. Do not add commentary, labels, or quotation marks around the whole answer.',
							},
							{
								inlineData: {
									mimeType,
									data: base64,
								},
							},
						],
					},
				],
			}),
		},
	)

	const text = (response.candidates?.[0]?.content?.parts ?? [])
		.map((part) => part.text ?? '')
		.join('')
		.trim()

	if (!text) {
		throw new Error('Transcription returned no text. Try speaking louder or closer to the microphone.')
	}

	return text
}

function normalizeAudioMimeType(mimeType: string): string {
	if (mimeType.startsWith('audio/')) {
		return mimeType
	}

	return 'audio/webm'
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			if (typeof reader.result !== 'string') {
				reject(new Error('Failed to read recorded audio.'))
				return
			}

			const commaIndex = reader.result.indexOf(',')
			resolve(
				commaIndex >= 0 ? reader.result.slice(commaIndex + 1) : reader.result,
			)
		}
		reader.onerror = () => reject(new Error('Failed to read recorded audio.'))
		reader.readAsDataURL(blob)
	})
}
