import { useState, useEffect, useRef } from 'react'
import type {
  ChatMessage,
  ChatSession,
  LocalModel,
  ChatSettings,
} from './types/chat'
import {
  fetchLocalModels,
  streamChatCompletion,
  DEFAULT_SETTINGS,
  FALLBACK_MODELS,
} from './services/ollamaService'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { WelcomeScreen } from './components/WelcomeScreen'
import { ChatMessageItem } from './components/ChatMessageItem'
import { ChatInput } from './components/ChatInput'
import { SettingsModal } from './components/SettingsModal'

const STORAGE_KEYS = {
  SESSIONS: 'personal_ai_chat_sessions',
  SETTINGS: 'personal_ai_chat_settings',
  ACTIVE_MODEL: 'personal_ai_active_model',
}

function App() {
  const [models, setModels] = useState<LocalModel[]>(FALLBACK_MODELS)
  const [selectedModel, setSelectedModel] = useState<string>('qwen3.5:4b')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS)

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const [isStreaming, setIsStreaming] = useState<boolean>(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialLoadDoneRef = useRef(false)
  const skipHostRefreshRef = useRef(true)

  const applyFetchedModels = (fetchedModels: LocalModel[], preferredModel?: string | null) => {
    setModels(fetchedModels)
    if (fetchedModels.length === 0) return

    const activeModel = preferredModel ?? selectedModel
    const modelStillExists = fetchedModels.some((m) => m.name === activeModel)
    if (!modelStillExists) {
      setSelectedModel(fetchedModels[0].name)
    }
  }

  // 1. Initial Load: Settings, Models, Sessions
  useEffect(() => {
    const savedSettingsRaw = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    const savedModel = localStorage.getItem(STORAGE_KEYS.ACTIVE_MODEL)
    let parsedSettings = DEFAULT_SETTINGS

    if (savedSettingsRaw) {
      try {
        parsedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettingsRaw) }
        setSettings(parsedSettings)
      } catch (e) {
        console.error('Failed to parse saved settings', e)
      }
    }

    if (savedModel) {
      setSelectedModel(savedModel)
    }

    fetchLocalModels(parsedSettings.ollamaHost).then((fetchedModels) => {
      applyFetchedModels(fetchedModels, savedModel)
    })

    skipHostRefreshRef.current = false
    initialLoadDoneRef.current = true

    const savedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS)
    if (savedSessions) {
      try {
        const parsed: ChatSession[] = JSON.parse(savedSessions)
        setSessions(parsed)
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id)
        }
      } catch (e) {
        console.error('Failed to parse saved sessions', e)
      }
    }
  }, [])

  useEffect(() => {
    if (skipHostRefreshRef.current || !initialLoadDoneRef.current) return

    fetchLocalModels(settings.ollamaHost).then((fetchedModels) => {
      applyFetchedModels(fetchedModels)
    })
  }, [settings.ollamaHost])

  // 2. Persist Sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions))
    }
  }, [sessions])

  // 3. Persist Settings & Active Model
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_MODEL, selectedModel)
  }, [selectedModel])

  // 4. Auto scroll to bottom
  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const messages = activeSession?.messages || []

  useEffect(() => {
    if (settings.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isStreaming, settings.autoScroll])

  // Helper: Create a New Chat Session
  const createNewSession = (initialPrompt?: string): string => {
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const title = initialPrompt
      ? initialPrompt.length > 30
        ? `${initialPrompt.substring(0, 30)}...`
        : initialPrompt
      : 'New Chat'

    const newSession: ChatSession = {
      id,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      model: selectedModel,
    }

    setSessions((prev) => [newSession, ...prev])
    setActiveSessionId(id)
    return id
  }

  // Handle Select Model
  const handleSelectModel = (modelName: string) => {
    setSelectedModel(modelName)
    if (activeSessionId) {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, model: modelName } : s))
      )
    }
  }

  // Handle Delete Session
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id)
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id)
      } else {
        setActiveSessionId('')
      }
    }
  }

  // Handle Rename Session
  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
    )
  }

  // Handle Clear Current Chat
  const handleClearCurrentChat = () => {
    if (!activeSessionId) return
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
    )
  }

  // Send Message Logic
  const handleSendMessage = async (text: string, files: any[] = []) => {
    let currentId = activeSessionId
    if (!currentId) {
      currentId = createNewSession(text)
    }

    const userMsgId = `msg_user_${Date.now()}`
    const assistantMsgId = `msg_ast_${Date.now() + 1}`

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      fileAttachments: files.length > 0 ? files : undefined,
    }

    const placeholderAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: selectedModel,
    }

    // Update active session messages
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === currentId) {
          const updatedMessages = [...session.messages, userMessage, placeholderAssistantMessage]
          const autoTitle =
            session.messages.length === 0 && text
              ? text.length > 35
                ? `${text.substring(0, 35)}...`
                : text
              : session.title

          return {
            ...session,
            title: autoTitle,
            updatedAt: Date.now(),
            messages: updatedMessages,
          }
        }
        return session
      })
    )

    // Start streaming
    setIsStreaming(true)
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Get current message history for completion context
    const currentSession = sessions.find((s) => s.id === currentId)
    const historyMessages = currentSession ? [...currentSession.messages, userMessage] : [userMessage]

    await streamChatCompletion(
      selectedModel,
      historyMessages,
      settings,
      {
        onChunk: (_, __, thinkingText, mainText) => {
          setSessions((prev) =>
            prev.map((session) => {
              if (session.id === currentId) {
                const updatedMessages = session.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: mainText,
                        thinkingContent: thinkingText || undefined,
                      }
                    : m
                )
                return { ...session, messages: updatedMessages, updatedAt: Date.now() }
              }
              return session
            })
          )
        },
        onDone: (_, thinkingText, mainText, metrics) => {
          setSessions((prev) =>
            prev.map((session) => {
              if (session.id === currentId) {
                const updatedMessages = session.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: mainText,
                        thinkingContent: thinkingText || undefined,
                        tokensPerSec: metrics.tokensPerSec,
                        durationMs: metrics.durationMs,
                      }
                    : m
                )
                return { ...session, messages: updatedMessages, updatedAt: Date.now() }
              }
              return session
            })
          )
          setIsStreaming(false)
          abortControllerRef.current = null
        },
        onError: (error) => {
          console.error('Chat completion error:', error)
          setSessions((prev) =>
            prev.map((session) => {
              if (session.id === currentId) {
                const updatedMessages = session.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content:
                          m.content ||
                          `⚠️ **Error connecting to local model (${selectedModel})**: ${error.message}\n\nPlease check if Ollama is running or if the model path is loaded.`,
                        isError: true,
                      }
                    : m
                )
                return { ...session, messages: updatedMessages }
              }
              return session
            })
          )
          setIsStreaming(false)
          abortControllerRef.current = null
        },
      },
      abortController.signal
    )
  }

  // Handle Stop Streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsStreaming(false)
    }
  }

  // Handle Regenerate Assistant Message
  const handleRegenerate = async () => {
    if (!activeSession || activeSession.messages.length === 0 || isStreaming) return
    const lastUserIndex = [...activeSession.messages]
      .reverse()
      .findIndex((m) => m.role === 'user')
    if (lastUserIndex === -1) return

    const actualUserIndex = activeSession.messages.length - 1 - lastUserIndex
    const truncatedMessages = activeSession.messages.slice(0, actualUserIndex + 1)

    const assistantMsgId = `msg_ast_${Date.now()}`
    const placeholderAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      model: selectedModel,
    }

    setSessions((prev) =>
      prev.map((session) => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            messages: [...truncatedMessages, placeholderAssistantMessage],
            updatedAt: Date.now(),
          }
        }
        return session
      })
    )

    setIsStreaming(true)
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    await streamChatCompletion(
      selectedModel,
      truncatedMessages,
      settings,
      {
        onChunk: (_, __, thinkingText, mainText) => {
          setSessions((prev) =>
            prev.map((session) => {
              if (session.id === activeSessionId) {
                const updatedMessages = session.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: mainText,
                        thinkingContent: thinkingText || undefined,
                      }
                    : m
                )
                return { ...session, messages: updatedMessages }
              }
              return session
            })
          )
        },
        onDone: (_, thinkingText, mainText, metrics) => {
          setSessions((prev) =>
            prev.map((session) => {
              if (session.id === activeSessionId) {
                const updatedMessages = session.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: mainText,
                        thinkingContent: thinkingText || undefined,
                        tokensPerSec: metrics.tokensPerSec,
                        durationMs: metrics.durationMs,
                      }
                    : m
                )
                return { ...session, messages: updatedMessages }
              }
              return session
            })
          )
          setIsStreaming(false)
          abortControllerRef.current = null
        },
        onError: (error) => {
          console.error('Regenerate error:', error)
          setIsStreaming(false)
          abortControllerRef.current = null
        },
      },
      abortController.signal
    )
  }

  // Handle Edit User Prompt
  const handleEditPrompt = (newText: string) => {
    handleSendMessage(newText)
  }

  // Handle Delete Single Message
  const handleDeleteMessage = (msgId: string) => {
    if (!activeSessionId) return
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: s.messages.filter((m) => m.id !== msgId) }
          : s
      )
    )
  }

  return (
    <div
      className={`h-dvh min-h-dvh flex overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 ${
        settings.theme === 'light' ? 'theme-light' : ''
      }`}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewChat={() => createNewSession()}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        models={models}
        selectedModel={selectedModel}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onNewChat={() => createNewSession()}
          onOpenSettings={() => setSettingsOpen(true)}
          onClearCurrentChat={handleClearCurrentChat}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings({ ...settings, ...newSettings })}
          hasMessages={messages.length > 0}
        />

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 flex flex-col">
          {messages.length === 0 ? (
            <WelcomeScreen
              models={models}
              selectedModel={selectedModel}
              onSelectPrompt={(promptText) => handleSendMessage(promptText)}
            />
          ) : (
            <div className="flex-1 pb-4">
              {messages.map((msg, idx) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  isLast={idx === messages.length - 1}
                  isStreaming={isStreaming}
                  onRegenerate={idx === messages.length - 1 ? handleRegenerate : undefined}
                  onDelete={handleDeleteMessage}
                  onEditPrompt={handleEditPrompt}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          selectedModel={selectedModel}
          models={models}
          onSelectModel={handleSelectModel}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings({ ...settings, ...newSettings })}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings)
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings))
        }}
        onModelsRefresh={(fetchedModels) => {
          setModels(fetchedModels)
          if (
            fetchedModels.length > 0 &&
            !fetchedModels.some((model) => model.name === selectedModel)
          ) {
            setSelectedModel(fetchedModels[0].name)
          }
        }}
      />
    </div>
  )
}

export default App
