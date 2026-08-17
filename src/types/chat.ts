import type { ChatInputMethod } from '@/storage/types'

export type ChatAttachment =
	| {
			id: string
			type: 'document'
			name: string
			documentId?: string
			dataUrl?: string
			mimeType?: string
	  }
	| {
			id: string
			type: 'image'
			name: string
			documentId?: string
			dataUrl?: string
			mimeType?: string
	  }

export interface ChatSubmitPayload {
	text: string
	attachments: ChatAttachment[]
	webSearchEnabled: boolean
	inputMethod: ChatInputMethod
	editFromMessageId?: string
}

export type { ChatInputMethod }
