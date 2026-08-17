export class PcmStreamPlayer {
	private audioContext: AudioContext | null = null
	private readonly sampleRate: number
	private nextStartTime = 0
	private readonly activeSources = new Set<AudioBufferSourceNode>()
	private ended = false
	private streamComplete = false
	private onPlaybackEnded: (() => void) | null = null
	private endCheckTimer: number | null = null
	private receivedChunks = false

	constructor(sampleRate = 24000) {
		this.sampleRate = sampleRate
	}

	async start(): Promise<void> {
		this.ended = false
		this.streamComplete = false
		this.receivedChunks = false
		this.nextStartTime = 0
		this.audioContext = new AudioContext({ sampleRate: this.sampleRate })
		await this.audioContext.resume()
		this.nextStartTime = this.audioContext.currentTime + 0.08
	}

	enqueuePcmBase64(base64: string): void {
		const binary = atob(base64)
		const bytes = new Uint8Array(binary.length)
		for (let index = 0; index < binary.length; index += 1) {
			bytes[index] = binary.charCodeAt(index)
		}
		this.enqueuePcmBytes(bytes)
	}

	enqueuePcmBytes(pcm: Uint8Array): void {
		if (!this.audioContext || this.ended || pcm.byteLength < 2) {
			return
		}

		this.receivedChunks = true

		const int16 = new Int16Array(
			pcm.buffer,
			pcm.byteOffset,
			Math.floor(pcm.byteLength / 2),
		)
		const float32 = new Float32Array(int16.length)
		for (let index = 0; index < int16.length; index += 1) {
			float32[index] = int16[index]! / 32768
		}

		const buffer = this.audioContext.createBuffer(
			1,
			float32.length,
			this.sampleRate,
		)
		buffer.getChannelData(0).set(float32)

		const source = this.audioContext.createBufferSource()
		source.buffer = buffer
		source.connect(this.audioContext.destination)

		const startAt = Math.max(
			this.nextStartTime,
			this.audioContext.currentTime + 0.01,
		)
		source.start(startAt)
		this.nextStartTime = startAt + buffer.duration
		this.activeSources.add(source)
		source.onended = () => {
			this.activeSources.delete(source)
			this.scheduleEndCheck()
		}
	}

	markStreamComplete(): void {
		this.streamComplete = true
		this.scheduleEndCheck()
	}

	setOnPlaybackEnded(callback: () => void): void {
		this.onPlaybackEnded = callback
	}

	hasQueuedAudio(): boolean {
		return this.receivedChunks || this.activeSources.size > 0
	}

	stop(): void {
		this.ended = true
		for (const source of this.activeSources) {
			try {
				source.stop()
			} catch {
				// ignore already-stopped sources
			}
		}
		this.activeSources.clear()
		if (this.endCheckTimer !== null) {
			window.clearTimeout(this.endCheckTimer)
			this.endCheckTimer = null
		}
		if (this.audioContext) {
			void this.audioContext.close()
			this.audioContext = null
		}
	}

	private scheduleEndCheck(): void {
		if (this.endCheckTimer !== null) {
			window.clearTimeout(this.endCheckTimer)
		}
		this.endCheckTimer = window.setTimeout(() => {
			if (this.streamComplete && this.activeSources.size === 0 && !this.ended) {
				this.ended = true
				this.onPlaybackEnded?.()
			}
		}, 120)
	}
}
