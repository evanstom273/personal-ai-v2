import { toDataUrl } from '@/services/gemini/client'

export interface PlayableAudio {
	dataUrl: string
	mimeType: string
}

export function audioInlineDataToPlayable(
	mimeType: string,
	base64Data: string,
): PlayableAudio {
	const normalizedMimeType = mimeType.toLowerCase()

	if (
		normalizedMimeType.includes('wav') ||
		normalizedMimeType.includes('mpeg') ||
		normalizedMimeType.includes('mp3') ||
		normalizedMimeType.includes('ogg') ||
		normalizedMimeType.includes('webm')
	) {
		return {
			dataUrl: toDataUrl(mimeType, base64Data),
			mimeType,
		}
	}

	const pcmBytes = base64ToBytes(base64Data)
	const sampleRate = parsePcmSampleRate(normalizedMimeType)
	const wavBytes = pcmToWav(pcmBytes, sampleRate)
	const wavBase64 = bytesToBase64(wavBytes)

	return {
		dataUrl: toDataUrl('audio/wav', wavBase64),
		mimeType: 'audio/wav',
	}
}

export function parsePcmSampleRate(mimeType: string): number {
	const match = mimeType.match(/rate=(\d+)/i)
	if (!match) {
		return 24000
	}

	const sampleRate = Number(match[1])
	return Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 24000
}

export function base64ToBytes(base64Data: string): Uint8Array {
	const binary = atob(base64Data)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}
	return bytes
}

export function bytesToBase64(bytes: Uint8Array): string {
	let binary = ''
	for (let index = 0; index < bytes.length; index += 1) {
		binary += String.fromCharCode(bytes[index]!)
	}
	return btoa(binary)
}

export function pcmToWav(
	pcmData: Uint8Array,
	sampleRate = 24000,
	channels = 1,
	bitsPerSample = 16,
): Uint8Array {
	const bytesPerSample = bitsPerSample / 8
	const blockAlign = channels * bytesPerSample
	const byteRate = sampleRate * blockAlign
	const dataSize = pcmData.length
	const buffer = new ArrayBuffer(44 + dataSize)
	const view = new DataView(buffer)

	writeAscii(view, 0, 'RIFF')
	view.setUint32(4, 36 + dataSize, true)
	writeAscii(view, 8, 'WAVE')
	writeAscii(view, 12, 'fmt ')
	view.setUint32(16, 16, true)
	view.setUint16(20, 1, true)
	view.setUint16(22, channels, true)
	view.setUint32(24, sampleRate, true)
	view.setUint32(28, byteRate, true)
	view.setUint16(32, blockAlign, true)
	view.setUint16(34, bitsPerSample, true)
	writeAscii(view, 36, 'data')
	view.setUint32(40, dataSize, true)

	new Uint8Array(buffer, 44).set(pcmData)
	return new Uint8Array(buffer)
}

function writeAscii(view: DataView, offset: number, value: string): void {
	for (let index = 0; index < value.length; index += 1) {
		view.setUint8(offset + index, value.charCodeAt(index))
	}
}
