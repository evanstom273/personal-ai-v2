import { geminiFetch } from '@/services/gemini/client'
import { audioInlineDataToPlayable } from '@/services/gemini/audioUtils'
import { DEFAULT_TTS_MODEL_ID } from '@/services/gemini/ttsVoices'
import { getConfiguredAiName } from '@/services/gemini/systemInstruction'
import type { UserPreferences } from '@/storage/types'

interface SynthesizeSpeechResponse {
	candidates?: Array<{
		content?: {
			parts?: Array<{
				inlineData?: {
					mimeType: string
					data: string
				}
			}>
		}
	}>
}

export interface SynthesizeSpeechOptions {
	apiKey: string
	text: string
	voiceName: string
	preferences: UserPreferences
	modelId?: string
}

export interface SynthesizedSpeech {
	dataUrl: string
	mimeType: string
}

export async function synthesizeSpeechWithGemini(
	options: SynthesizeSpeechOptions,
): Promise<SynthesizedSpeech> {
	const apiKey = options.apiKey.trim()
	if (!apiKey) {
		throw new Error('Add your Gemini API key in Settings to use text-to-speech.')
	}

	const speechText = options.text.trim()
	if (!speechText) {
		throw new Error('There is no text to speak.')
	}

	const modelId = options.modelId?.trim() || DEFAULT_TTS_MODEL_ID
	const prompt = buildTtsPrompt(options.preferences, speechText)

	const response = await geminiFetch<SynthesizeSpeechResponse>(
		apiKey,
		`/models/${modelId}:generateContent`,
		{
			method: 'POST',
			body: JSON.stringify({
				contents: [
					{
						parts: [{ text: prompt }],
					},
				],
				generationConfig: {
					responseModalities: ['AUDIO'],
					speechConfig: {
						voiceConfig: {
							prebuiltVoiceConfig: {
								voiceName: options.voiceName,
							},
						},
					},
				},
			}),
		},
	)

	const inlineData = response.candidates?.[0]?.content?.parts?.find(
		(part) => part.inlineData?.data,
	)?.inlineData

	if (!inlineData?.data) {
		throw new Error('Speech generation returned no audio.')
	}

	return audioInlineDataToPlayable(inlineData.mimeType, inlineData.data)
}

export function buildTtsPrompt(
	preferences: UserPreferences,
	speechText: string,
): string {
	const aiName = getConfiguredAiName(preferences)
	const behavior = preferences.aiBehaviorInstructions.trim().slice(0, 240)
	const styleClause = behavior
		? `Speak naturally as ${aiName}, reflecting this personality: ${behavior}. `
		: `Speak naturally as ${aiName} in a warm, conversational tone. `

	return `${styleClause}Say the following reply:\n\n${speechText}`
}
