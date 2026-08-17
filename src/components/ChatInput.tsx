import React, { useState, useRef, useEffect } from 'react'
import { Send, Square, Paperclip, X, FileText, Sparkles } from 'lucide-react'

interface AttachedFile {
  name: string
  size: number
  content: string
  type: string
}

interface ChatInputProps {
  onSendMessage: (text: string, files: AttachedFile[]) => void
  isStreaming: boolean
  onStopStreaming: () => void
  selectedModel: string
  disabled?: boolean
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  selectedModel,
  disabled = false,
}) => {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming || disabled) {
      return
    }

    onSendMessage(input.trim(), attachments)
    setInput('')
    setAttachments([])

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            content,
            type: file.type || 'text/plain',
          },
        ])
      }
      reader.readAsText(file)
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="sticky bottom-0 z-20 w-full max-w-3xl mx-auto px-4 pb-4 pt-2 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
      {/* Container Box */}
      <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500/50 shadow-2xl shadow-black/80 backdrop-blur-xl transition-all">
        {/* Attachment Chips Display */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 pb-0 border-b border-slate-800/60">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 text-xs text-slate-200 border border-slate-700"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium max-w-[150px] truncate">{file.name}</span>
                <span className="text-[10px] text-slate-400">
                  ({Math.round(file.size / 1024)} KB)
                </span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="p-0.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea Prompt Box */}
        <div className="flex items-end px-3 py-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-colors shrink-0 mb-0.5"
            title="Attach code or text file"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${selectedModel}...`}
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent border-0 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-0 resize-none px-3 py-1 max-h-48 scrollbar-thin scrollbar-thumb-slate-800"
          />

          {/* Action Button: Send or Stop */}
          <div className="shrink-0 mb-0.5 ml-1">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40 transition-all flex items-center justify-center cursor-pointer"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-rose-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() && attachments.length === 0}
                className={`p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                  input.trim() || attachments.length > 0
                    ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/25 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Footer info pill */}
        <div className="px-4 py-1.5 border-t border-slate-800/40 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Target: <strong className="text-slate-300 font-mono">{selectedModel}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>Shift+Enter for newline</span>
            {input.length > 0 && <span className="font-mono text-slate-400">{input.length} chars</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
