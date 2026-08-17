export const DEFAULT_TTS_MODEL_ID = 'gemini-3.1-flash-tts-preview'
export const DEFAULT_TTS_VOICE_NAME = 'Kore'

export interface GeminiTtsVoice {
	name: string
	description: string
}

export const GEMINI_TTS_VOICES: GeminiTtsVoice[] = [
	{ name: 'Zephyr', description: 'Bright' },
	{ name: 'Puck', description: 'Upbeat' },
	{ name: 'Charon', description: 'Informative' },
	{ name: 'Kore', description: 'Firm' },
	{ name: 'Fenrir', description: 'Excitable' },
	{ name: 'Leda', description: 'Youthful' },
	{ name: 'Orus', description: 'Firm' },
	{ name: 'Aoede', description: 'Breezy' },
	{ name: 'Callirrhoe', description: 'Easy-going' },
	{ name: 'Autonoe', description: 'Bright' },
	{ name: 'Enceladus', description: 'Breathy' },
	{ name: 'Iapetus', description: 'Clear' },
	{ name: 'Umbriel', description: 'Easy-going' },
	{ name: 'Algieba', description: 'Smooth' },
	{ name: 'Despina', description: 'Smooth' },
	{ name: 'Erinome', description: 'Clear' },
	{ name: 'Algenib', description: 'Gravelly' },
	{ name: 'Rasalgethi', description: 'Informative' },
	{ name: 'Laomedeia', description: 'Upbeat' },
	{ name: 'Achernar', description: 'Soft' },
	{ name: 'Alnilam', description: 'Firm' },
	{ name: 'Schedar', description: 'Even' },
	{ name: 'Gacrux', description: 'Mature' },
	{ name: 'Pulcherrima', description: 'Forward' },
	{ name: 'Achird', description: 'Friendly' },
	{ name: 'Zubenelgenubi', description: 'Casual' },
	{ name: 'Vindemiatrix', description: 'Gentle' },
	{ name: 'Sadachbia', description: 'Lively' },
	{ name: 'Sadaltager', description: 'Knowledgeable' },
	{ name: 'Sulafat', description: 'Warm' },
]

export function isGeminiTtsVoiceName(value: string): boolean {
	return GEMINI_TTS_VOICES.some((voice) => voice.name === value)
}

export function normalizeTtsVoiceName(value: unknown): string {
	if (typeof value === 'string' && isGeminiTtsVoiceName(value)) {
		return value
	}

	return DEFAULT_TTS_VOICE_NAME
}
