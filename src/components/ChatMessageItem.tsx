import React, { useState } from 'react'
import {
  User,
  Bot,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Brain,
  RotateCcw,
  Trash2,
  Edit2,
  FileCode,
  Zap,
  Loader2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import type { ChatMessage } from '../types/chat'
import { imageAttachmentToDataUrl, isExtractedDocumentName } from '../utils/fileAttachments'

interface ChatMessageItemProps {
  message: ChatMessage
  isLast: boolean
  isStreaming: boolean
  onRegenerate?: () => void
  onDelete?: (id: string) => void
  onEditPrompt?: (content: string) => void
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isLast,
  isStreaming,
  onRegenerate,
  onDelete,
  onEditPrompt,
}) => {
  const [copiedText, setCopiedText] = useState(false)
  const [showThinking, setShowThinking] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)

  const isUser = message.role === 'user'

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleSaveEdit = () => {
    if (editedContent.trim() && onEditPrompt) {
      onEditPrompt(editedContent.trim())
      setIsEditing(false)
    }
  }

  return (
    <div
      className={`group relative py-6 px-4 sm:px-6 transition-colors border-b border-slate-900/60 ${
        isUser ? 'bg-slate-950/40' : 'bg-slate-900/30'
      }`}
    >
      <div className="max-w-3xl mx-auto flex items-start gap-4">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Bot className="w-4.5 h-4.5 text-purple-300" />
              </div>
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-200">
                {isUser ? 'You' : message.model || 'AI Assistant'}
              </span>
              {!isUser && message.tokensPerSec && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  {message.tokensPerSec} t/s
                  {message.durationMs ? ` • ${(message.durationMs / 1000).toFixed(1)}s` : ''}
                </span>
              )}
            </div>

            {/* Quick Actions Toolbar */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity text-slate-400">
              <button
                onClick={handleCopyMessage}
                className="p-1 rounded hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Copy message"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {isUser && onEditPrompt && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1 rounded hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Edit prompt"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}

              {!isUser && onRegenerate && !isStreaming && (
                <button
                  onClick={onRegenerate}
                  className="p-1 rounded hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1 rounded hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* File Attachments (if user attached files) */}
          {message.fileAttachments && message.fileAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {message.fileAttachments.map((file, idx) => (
                <div key={idx}>
                  {file.kind === 'image' ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-2 max-w-xs">
                      <img
                        src={imageAttachmentToDataUrl(file)}
                        alt={file.name}
                        className="max-h-40 rounded-lg object-contain"
                      />
                      <p className="mt-1 text-[10px] text-slate-500 truncate">{file.name}</p>
                    </div>
                  ) : (
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
                    >
                      <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-medium">{file.name}</span>
                      {isExtractedDocumentName(file.name) && (
                        <span className="text-[10px] text-sky-400">extracted text</span>
                      )}
                      <span className="text-[10px] text-slate-500">
                        ({Math.round(file.size / 1024)} KB)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* User Prompt Edit Input */}
          {isEditing ? (
            <div className="space-y-2 mt-2">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-cyan-500/50 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                rows={3}
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                >
                  Save & Submit
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Cold Model Load / Waiting for First Token Indicator */}
              {!isUser && isStreaming && isLast && !message.content && !message.thinkingContent && (
                <div className="flex items-center gap-2.5 text-xs font-mono text-cyan-400/90 py-2 px-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 my-1 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <span>Loading model into memory & initializing generation...</span>
                </div>
              )}

              {/* Thinking / Reasoning Collapsible Block (Qwen3.5 <think> tags or native thinking tokens) */}
              {message.thinkingContent && (
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden text-xs my-2">
                  <button
                    onClick={() => setShowThinking(!showThinking)}
                    className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-900/90 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      <span>Thought Process</span>
                      {isStreaming && isLast && !message.content && (
                        <span className="flex items-center gap-1 text-[10px] text-purple-300 font-mono">
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                          Thinking...
                        </span>
                      )}
                    </div>
                    {showThinking ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showThinking && (
                    <div className="p-3.5 border-t border-slate-800/60 text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap bg-slate-950/40 max-h-60 overflow-y-auto">
                      {message.thinkingContent}
                    </div>
                  )}
                </div>
              )}

              {/* Main Message Text / Markdown Body */}
              {message.content && (
                <div className="prose prose-invert prose-slate max-w-full min-w-0 text-slate-100 text-sm leading-relaxed">
                  {isUser ? (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="markdown-table-scroll">
                            <table>{children}</table>
                          </div>
                        ),
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '')
                          const lang = match ? match[1] : ''
                          const codeString = String(children).replace(/\n$/, '')

                          if (!match && !String(children).includes('\n')) {
                            return (
                              <code
                                className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-[12px]"
                                {...props}
                              >
                                {children}
                              </code>
                            )
                          }

                          // Code block highlighting
                          let highlighted = codeString
                          if (lang && hljs.getLanguage(lang)) {
                            try {
                              highlighted = hljs.highlight(codeString, { language: lang }).value
                            } catch {
                              highlighted = codeString
                            }
                          }

                          return (
                            <CodeBlock code={codeString} language={lang} highlightedHtml={highlighted} />
                          )
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
              )}

              {/* Streaming Cursor Indicator */}
              {isStreaming && isLast && !isUser && (message.content || message.thinkingContent) && (
                <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse rounded-sm align-middle" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Code Block with Copy Button
const CodeBlock: React.FC<{ code: string; language: string; highlightedHtml?: string }> = ({
  code,
  language,
  highlightedHtml,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-4 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
        <span className="font-mono font-semibold uppercase tracking-wider text-slate-300">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-slate-200">
        {highlightedHtml ? (
          <pre>
            <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          </pre>
        ) : (
          <pre>
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
