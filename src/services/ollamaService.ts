import type { LocalModel, ChatMessage, ChatSettings } from '../types/chat'

export const DEFAULT_SETTINGS: ChatSettings = {
  systemPrompt: 'You are a helpful, intelligent, and precise AI assistant powered by local models.',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  contextWindow: 4096,
  theme: 'dark',
  ollamaHost: '',
  autoScroll: true,
  enableThinking: true,
}

export const FALLBACK_MODELS: LocalModel[] = [
  {
    name: 'qwen3.5:4b',
    model: 'qwen3.5:4b',
    size: 3389983735,
    digest: '2a654d98e6fba55d452b7043684e9b57a947e393bbffa62485a7aac05ee4eefd',
    details: {
      parameter_size: '4.7B',
      quantization_level: 'Q4_K_M',
      family: 'qwen35',
      context_length: 262144,
    },
    capabilities: ['vision', 'completion', 'tools', 'thinking'],
  },
  {
    name: 'qwen3.5:2b',
    model: 'qwen3.5:2b',
    size: 2741192820,
    digest: '324d162be6ca5629ae4517c8710434d0bd2d665bc94dbad46e9af8fbf8a2f0df',
    details: {
      parameter_size: '2.3B',
      quantization_level: 'Q8_0',
      family: 'qwen35',
      context_length: 262144,
    },
    capabilities: ['vision', 'completion', 'tools', 'thinking'],
  },
  {
    name: 'qwen3.5:0.8b',
    model: 'qwen3.5:0.8b',
    size: 1036046583,
    digest: 'f3817196d142eaf72ce79dfebe53dcb20bd21da87ce13e138a8f8e10a866b3a4',
    details: {
      parameter_size: '873M',
      quantization_level: 'Q8_0',
      family: 'qwen35',
      context_length: 262144,
    },
    capabilities: ['vision', 'completion', 'tools', 'thinking'],
  },
]

export async function fetchLocalModels(host = ''): Promise<LocalModel[]> {
  const baseUrl = host ? host.replace(/\/$/, '') : ''
  const endpoint = `${baseUrl}/api/tags`

  try {
    const res = await fetch(endpoint)
    if (!res.ok) {
      throw new Error(`Failed to fetch models: HTTP ${res.status}`)
    }
    const data = await res.json()
    if (Array.isArray(data.models) && data.models.length > 0) {
      return data.models
    }
    return FALLBACK_MODELS
  } catch (err) {
    console.warn('Ollama API fetch error, using fallback models:', err)
    return FALLBACK_MODELS
  }
}

export function parseThoughtAndContent(text: string): { thinking: string; main: string } {
  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/i
  const match = text.match(thinkRegex)

  if (match) {
    const thinking = match[1].trim()
    const main = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/i, '').trimStart()
    return { thinking, main }
  }

  return { thinking: '', main: text }
}

export interface StreamCallbacks {
  onChunk: (chunk: string, fullRawText: string, thinkingText: string, mainText: string) => void
  onDone: (fullRawText: string, thinkingText: string, mainText: string, metrics: { tokensPerSec?: number; durationMs?: number }) => void
  onError: (error: Error) => void
}

export async function streamChatCompletion(
  model: string,
  messages: ChatMessage[],
  settings: ChatSettings,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const baseUrl = settings.ollamaHost ? settings.ollamaHost.replace(/\/$/, '') : ''
  const endpoint = `${baseUrl}/api/chat`

  // Format messages for Ollama API
  const formattedMessages: { role: string; content: string }[] = []

  let systemPromptText = settings.systemPrompt?.trim() || ''
  if (!settings.enableThinking) {
    const fastDirective = 'Respond directly, accurately, and concisely. Do not output any internal reasoning, thinking steps, or <think> tags.'
    systemPromptText = systemPromptText ? `${systemPromptText}\n${fastDirective}` : fastDirective
  }

  if (systemPromptText) {
    formattedMessages.push({
      role: 'system',
      content: systemPromptText,
    })
  }

  messages.forEach((msg) => {
    let content = msg.content
    // Include file attachments content if present
    if (msg.fileAttachments && msg.fileAttachments.length > 0) {
      const attachmentsText = msg.fileAttachments
        .map((f) => `\n--- File: ${f.name} ---\n${f.content}\n--- End File ---`)
        .join('\n')
      content = `${content}\n${attachmentsText}`
    }

    formattedMessages.push({
      role: msg.role,
      content,
    })
  })

  const startTime = Date.now()

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
        think: settings.enableThinking !== false,
        options: {
          temperature: settings.temperature,
          top_p: settings.topP,
          num_ctx: settings.contextWindow || 4096,
          num_predict: settings.maxTokens || 4096,
        },
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Ollama server error (${response.status}): ${errorText || response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')

    let rawAccumulatedContent = ''
    let rawAccumulatedThinking = ''
    let totalTokens = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunkStr = decoder.decode(value, { stream: true })
      const lines = chunkStr.split('\n').filter((l) => l.trim().length > 0)

      for (const line of lines) {
        try {
          const json = JSON.parse(line)

          if (json.message) {
            const hasThinking = Boolean(json.message.thinking)
            const hasContent = Boolean(json.message.content)

            if (hasThinking || hasContent) {
              if (hasThinking) {
                rawAccumulatedThinking += json.message.thinking
              }
              if (hasContent) {
                rawAccumulatedContent += json.message.content
              }
              totalTokens++

              const parsed = parseThoughtAndContent(rawAccumulatedContent)
              const combinedThinking = [rawAccumulatedThinking.trim(), parsed.thinking.trim()]
                .filter(Boolean)
                .join('\n\n')
              const finalMain = parsed.main

              callbacks.onChunk(
                json.message.content || json.message.thinking || '',
                rawAccumulatedThinking + rawAccumulatedContent,
                combinedThinking,
                finalMain
              )
            }
          }

          if (json.done) {
            const durationMs = Date.now() - startTime
            const evalCount = json.eval_count || totalTokens
            const evalDuration = json.eval_duration || 0
            const tokensPerSec =
              evalDuration > 0
                ? Math.round((evalCount / (evalDuration / 1e9)) * 10) / 10
                : Math.round((totalTokens / (durationMs / 1000)) * 10) / 10

            const parsed = parseThoughtAndContent(rawAccumulatedContent)
            const combinedThinking = [rawAccumulatedThinking.trim(), parsed.thinking.trim()]
              .filter(Boolean)
              .join('\n\n')
            const finalMain = parsed.main

            callbacks.onDone(
              rawAccumulatedThinking + rawAccumulatedContent,
              combinedThinking,
              finalMain,
              {
                tokensPerSec: isNaN(tokensPerSec) ? undefined : tokensPerSec,
                durationMs,
              }
            )
            return
          }
        } catch {
          // If chunk split across lines
        }
      }
    }

    const durationMs = Date.now() - startTime
    const parsed = parseThoughtAndContent(rawAccumulatedContent)
    const combinedThinking = [rawAccumulatedThinking.trim(), parsed.thinking.trim()]
      .filter(Boolean)
      .join('\n\n')
    const finalMain = parsed.main

    callbacks.onDone(rawAccumulatedThinking + rawAccumulatedContent, combinedThinking, finalMain, { durationMs })
  } catch (err: unknown) {
    if (signal?.aborted) {
      return
    }
    const error = err instanceof Error ? err : new Error(String(err))
    callbacks.onError(error)
  }
}

