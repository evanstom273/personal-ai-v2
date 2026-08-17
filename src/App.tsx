import { useState, useEffect, useRef, useCallback } from 'react'
import type {
  ChatMessage,
  ChatSession,
  LocalModel,
  ChatSettings,
  FileAttachment,
} from './types/chat'
import {
  fetchLocalModels,
  streamChatCompletion,
  DEFAULT_SETTINGS,
  FALLBACK_MODELS,
} from './services/ollamaService'
import {
  checkServerHealth,
  fetchSessions,
  createSession,
  updateSession,
  deleteSession,
  clearSessionMessages,
  createMessage,
  updateMessage,
  deleteMessage as deleteServerMessage,
  fetchServerSettings,
  saveServerSettings,
  cachePersonalaiHost,
  loadCachedPersonalaiHost,
} from './services/personalaiApi'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { WelcomeScreen } from './components/WelcomeScreen'
import { ChatMessageItem } from './components/ChatMessageItem'
import { ChatInput } from './components/ChatInput'
import { SettingsModal } from './components/SettingsModal'
import { ServerOfflineBanner } from './components/ServerOfflineBanner'
import { useSidebarLayout } from './hooks/useSidebarLayout'

const LEGACY_STORAGE_KEYS = {
  SESSIONS: 'personal_ai_chat_sessions',
  SETTINGS: 'personal_ai_chat_settings',
  ACTIVE_MODEL: 'personal_ai_active_model',
}

function getPersonalaiHost(settings: ChatSettings): string {
  return settings.personalaiHost || loadCachedPersonalaiHost()
}

function App() {
  const [models, setModels] = useState<LocalModel[]>(FALLBACK_MODELS)
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_SETTINGS.activeModel)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS)

  const { sidebarOpen, setSidebarOpen } = useSidebarLayout()
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [serverOnline, setServerOnline] = useState<boolean>(false)
  const [serverChecking, setServerChecking] = useState<boolean>(true)

  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialLoadDoneRef = useRef(false)
  const skipHostRefreshRef = useRef(true)
  const streamPersistTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const persistSettingsToServer = useCallback(
    async (nextSettings: ChatSettings) => {
      const host = nextSettings.personalaiHost || loadCachedPersonalaiHost()
      if (!host) return
      try {
        await saveServerSettings(host, nextSettings)
      } catch (err) {
        console.error('Failed to save settings to server:', err)
      }
    },
    []
  )

  const updateSettings = (partial: Partial<ChatSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      if (next.personalaiHost) cachePersonalaiHost(next.personalaiHost)
      persistSettingsToServer(next)
      return next
    })
  }

  const applyFetchedModels = (fetchedModels: LocalModel[], preferredModel?: string | null) => {
    setModels(fetchedModels)
    if (fetchedModels.length === 0) return

    const activeModel = preferredModel ?? selectedModel
    const modelStillExists = fetchedModels.some((m) => m.name === activeModel)
    if (!modelStillExists) {
      setSelectedModel(fetchedModels[0].name)
    }
  }

  const migrateLegacyLocalStorage = async (host: string): Promise<ChatSession[]> => {
    const rawSessions = localStorage.getItem(LEGACY_STORAGE_KEYS.SESSIONS)
    if (!rawSessions) return []

    try {
      const parsed: ChatSession[] = JSON.parse(rawSessions)
      for (const session of parsed) {
        await createSession(host, {
          id: session.id,
          title: session.title,
          model: session.model,
          systemPrompt: session.systemPrompt,
        })
        for (const msg of session.messages) {
          await createMessage(host, session.id, {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            thinkingContent: msg.thinkingContent,
            model: msg.model,
            tokensPerSec: msg.tokensPerSec,
            durationMs: msg.durationMs,
            isError: msg.isError,
            streamStatus: 'complete',
            fileAttachments: msg.fileAttachments,
          })
        }
      }

      const rawSettings = localStorage.getItem(LEGACY_STORAGE_KEYS.SETTINGS)
      if (rawSettings) {
        const legacySettings = JSON.parse(rawSettings) as Partial<ChatSettings>
        await saveServerSettings(host, { ...DEFAULT_SETTINGS, ...legacySettings })
      }

      localStorage.removeItem(LEGACY_STORAGE_KEYS.SESSIONS)
      localStorage.removeItem(LEGACY_STORAGE_KEYS.SETTINGS)
      localStorage.removeItem(LEGACY_STORAGE_KEYS.ACTIVE_MODEL)

      return await fetchSessions(host)
    } catch (err) {
      console.error('Legacy migration failed:', err)
      return []
    }
  }

  const connectToServer = useCallback(async () => {
    setServerChecking(true)
    const host = settings.personalaiHost || loadCachedPersonalaiHost()
    const health = await checkServerHealth(host)

    if (!health.ok) {
      setServerOnline(false)
      setServerChecking(false)
      return false
    }

    setServerOnline(true)

    try {
      const serverSettings = await fetchServerSettings(host)
      const mergedSettings: ChatSettings = {
        ...DEFAULT_SETTINGS,
        ...serverSettings,
        personalaiHost: serverSettings.personalaiHost || host,
      }
      if (mergedSettings.personalaiHost) cachePersonalaiHost(mergedSettings.personalaiHost)
      setSettings(mergedSettings)

      let loadedSessions = await fetchSessions(host)
      if (loadedSessions.length === 0) {
        const migrated = await migrateLegacyLocalStorage(host)
        if (migrated.length > 0) loadedSessions = migrated
      }

      setSessions(loadedSessions)
      if (loadedSessions.length > 0) {
        setActiveSessionId(loadedSessions[0].id)
      }

      const modelPref =
        mergedSettings.activeModel ||
        localStorage.getItem(LEGACY_STORAGE_KEYS.ACTIVE_MODEL) ||
        DEFAULT_SETTINGS.activeModel
      setSelectedModel(modelPref)

      const fetchedModels = await fetchLocalModels(
        mergedSettings.ollamaHost,
        mergedSettings.personalaiHost
      )
      applyFetchedModels(fetchedModels, modelPref)
    } catch (err) {
      console.error('Failed to load data from PersonalAI server:', err)
      setServerOnline(false)
    }

    setServerChecking(false)
    return true
  }, [settings])

  useEffect(() => {
    connectToServer().then(() => {
      skipHostRefreshRef.current = false
      initialLoadDoneRef.current = true
    })
  }, [])

  useEffect(() => {
    if (skipHostRefreshRef.current || !initialLoadDoneRef.current || !serverOnline) return

    fetchLocalModels(settings.ollamaHost, settings.personalaiHost).then((fetchedModels) => {
      applyFetchedModels(fetchedModels)
    })
  }, [settings.ollamaHost, settings.personalaiHost, serverOnline])

  useEffect(() => {
    if (!serverOnline || !initialLoadDoneRef.current) return
    const host = getPersonalaiHost(settings)
    saveServerSettings(host, { ...settings, activeModel: selectedModel })
  }, [selectedModel])

  useEffect(() => {
    if (settings.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [sessions, activeSessionId, isStreaming, settings.autoScroll])

  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const messages = activeSession?.messages || []

  const scheduleMessagePersist = (
    messageId: string,
    data: {
      content?: string
      thinkingContent?: string
      tokensPerSec?: number
      durationMs?: number
      isError?: boolean
      streamStatus?: 'streaming' | 'complete' | 'error'
    }
  ) => {
    const host = getPersonalaiHost(settings)
    if (!host || !serverOnline) return

    const timers = streamPersistTimersRef.current
    const existing = timers.get(messageId)
    if (existing) clearTimeout(existing)

    timers.set(
      messageId,
      setTimeout(async () => {
        timers.delete(messageId)
        try {
          await updateMessage(host, messageId, data)
        } catch (err) {
          console.error('Failed to persist message update:', err)
        }
      }, 400)
    )
  }

  const flushMessagePersist = async (
    messageId: string,
    data: {
      content?: string
      thinkingContent?: string
      tokensPerSec?: number
      durationMs?: number
      isError?: boolean
      streamStatus?: 'streaming' | 'complete' | 'error'
    }
  ) => {
    const timers = streamPersistTimersRef.current
    const existing = timers.get(messageId)
    if (existing) {
      clearTimeout(existing)
      timers.delete(messageId)
    }

    const host = getPersonalaiHost(settings)
    if (!host || !serverOnline) return

    try {
      await updateMessage(host, messageId, data)
    } catch (err) {
      console.error('Failed to persist message:', err)
    }
  }

  const createNewSession = async (initialPrompt?: string): Promise<string> => {
    if (!serverOnline) throw new Error('PersonalAI server is offline')

    const host = getPersonalaiHost(settings)
    const title = initialPrompt
      ? initialPrompt.length > 30
        ? `${initialPrompt.substring(0, 30)}...`
        : initialPrompt
      : 'New Chat'

    const session = await createSession(host, {
      title,
      model: selectedModel,
    })

    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    return session.id
  }

  const handleSelectModel = (modelName: string) => {
    setSelectedModel(modelName)
    if (activeSessionId) {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, model: modelName } : s))
      )
      const host = getPersonalaiHost(settings)
      if (serverOnline) {
        updateSession(host, activeSessionId, { model: modelName }).catch(console.error)
      }
    }
  }

  const handleDeleteSession = async (id: string) => {
    if (!serverOnline) return
    const host = getPersonalaiHost(settings)
    await deleteSession(host, id)

    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id)
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : '')
    }
  }

  const handleRenameSession = async (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
    )
    if (!serverOnline) return
    const host = getPersonalaiHost(settings)
    await updateSession(host, id, { title: newTitle })
  }

  const handleClearCurrentChat = async () => {
    if (!activeSessionId || !serverOnline) return
    const host = getPersonalaiHost(settings)
    await clearSessionMessages(host, activeSessionId)
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [] } : s))
    )
  }

  const handleSendMessage = async (text: string, files: FileAttachment[] = []) => {
    if (!serverOnline) return

    let currentId = activeSessionId
    if (!currentId) {
      currentId = await createNewSession(text)
    }

    const host = getPersonalaiHost(settings)
    const currentSession = sessions.find((s) => s.id === currentId)
    const wasFirstMessage = !currentSession || currentSession.messages.length === 0

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

    try {
      await createMessage(host, currentId, {
        id: userMsgId,
        role: 'user',
        content: text,
        fileAttachments: files.length > 0 ? files : undefined,
        streamStatus: 'complete',
      })

      await createMessage(host, currentId, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        model: selectedModel,
        streamStatus: 'streaming',
      })

      if (text && wasFirstMessage) {
        const autoTitle = text.length > 35 ? `${text.substring(0, 35)}...` : text
        await updateSession(host, currentId, { title: autoTitle })
      }
    } catch (err) {
      console.error('Failed to persist messages:', err)
      setServerOnline(false)
      return
    }

    setIsStreaming(true)
    const abortController = new AbortController()
    abortControllerRef.current = abortController

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
          scheduleMessagePersist(assistantMsgId, {
            content: mainText,
            thinkingContent: thinkingText || undefined,
            streamStatus: 'streaming',
          })
        },
        onDone: async (_, thinkingText, mainText, metrics) => {
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
          await flushMessagePersist(assistantMsgId, {
            content: mainText,
            thinkingContent: thinkingText || undefined,
            tokensPerSec: metrics.tokensPerSec,
            durationMs: metrics.durationMs,
            streamStatus: 'complete',
          })
          setIsStreaming(false)
          abortControllerRef.current = null
        },
        onError: async (error) => {
          console.error('Chat completion error:', error)
          const errorContent =
            `⚠️ **Error connecting to local model (${selectedModel})**: ${error.message}\n\nPlease check if Ollama is running or if the model path is loaded.`

          setSessions((prev) =>
            prev.map((session) => {
              if (session.id === currentId) {
                const updatedMessages = session.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: m.content || errorContent,
                        isError: true,
                      }
                    : m
                )
                return { ...session, messages: updatedMessages }
              }
              return session
            })
          )
          await flushMessagePersist(assistantMsgId, {
            content: errorContent,
            isError: true,
            streamStatus: 'error',
          })
          setIsStreaming(false)
          abortControllerRef.current = null
        },
      },
      abortController.signal
    )
  }

  const handleStopStreaming = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsStreaming(false)

      const lastAssistant = activeSession?.messages.filter((m) => m.role === 'assistant').at(-1)
      if (lastAssistant && serverOnline) {
        await flushMessagePersist(lastAssistant.id, {
          content: lastAssistant.content,
          thinkingContent: lastAssistant.thinkingContent,
          streamStatus: 'complete',
        })
      }
    }
  }

  const handleRegenerate = async () => {
    if (!activeSession || activeSession.messages.length === 0 || isStreaming || !serverOnline) return
    const lastUserIndex = [...activeSession.messages]
      .reverse()
      .findIndex((m) => m.role === 'user')
    if (lastUserIndex === -1) return

    const actualUserIndex = activeSession.messages.length - 1 - lastUserIndex
    const truncatedMessages = activeSession.messages.slice(0, actualUserIndex + 1)

    const host = getPersonalaiHost(settings)
    const removed = activeSession.messages.slice(actualUserIndex + 1)
    for (const msg of removed) {
      await deleteServerMessage(host, msg.id).catch(console.error)
    }

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

    await createMessage(host, activeSessionId, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      model: selectedModel,
      streamStatus: 'streaming',
    })

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
          scheduleMessagePersist(assistantMsgId, {
            content: mainText,
            thinkingContent: thinkingText || undefined,
            streamStatus: 'streaming',
          })
        },
        onDone: async (_, thinkingText, mainText, metrics) => {
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
          await flushMessagePersist(assistantMsgId, {
            content: mainText,
            thinkingContent: thinkingText || undefined,
            tokensPerSec: metrics.tokensPerSec,
            durationMs: metrics.durationMs,
            streamStatus: 'complete',
          })
          setIsStreaming(false)
          abortControllerRef.current = null
        },
        onError: async (error) => {
          console.error('Regenerate error:', error)
          await flushMessagePersist(assistantMsgId, {
            content: error.message,
            isError: true,
            streamStatus: 'error',
          })
          setIsStreaming(false)
          abortControllerRef.current = null
        },
      },
      abortController.signal
    )
  }

  const handleEditPrompt = (newText: string) => {
    handleSendMessage(newText)
  }

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeSessionId || !serverOnline) return
    const host = getPersonalaiHost(settings)
    await deleteServerMessage(host, msgId)
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId ? { ...s, messages: s.messages.filter((m) => m.id !== msgId) } : s
      )
    )
  }

  return (
    <div
      className={`app-shell flex overflow-hidden overflow-x-hidden selection:bg-primary/30 selection:text-primary-foreground ${
        settings.theme === 'light' ? 'theme-light' : ''
      }`}
    >
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewChat={() => {
          if (serverOnline) createNewSession().catch(console.error)
        }}
        onDeleteSession={(id) => {
          handleDeleteSession(id).catch(console.error)
        }}
        onRenameSession={(id, title) => {
          handleRenameSession(id, title).catch(console.error)
        }}
        models={models}
        selectedModel={selectedModel}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full min-h-0 h-full overflow-hidden">
        {!serverOnline && !serverChecking && (
          <ServerOfflineBanner
            onRetry={() => connectToServer()}
            isRetrying={serverChecking}
          />
        )}

        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onNewChat={() => {
            if (serverOnline) createNewSession().catch(console.error)
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onClearCurrentChat={() => {
            handleClearCurrentChat().catch(console.error)
          }}
          settings={settings}
          onUpdateSettings={updateSettings}
          hasMessages={messages.length > 0}
        />

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {serverChecking ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Connecting to PersonalAI server...
            </div>
          ) : messages.length === 0 ? (
            <WelcomeScreen
              models={models}
              selectedModel={selectedModel}
              onSelectPrompt={(promptText) => {
                if (serverOnline) handleSendMessage(promptText)
              }}
            />
          ) : (
            <div className="mx-auto box-border w-full min-w-0 max-w-3xl px-4 py-2 md:px-6">
              {messages.map((msg, idx) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  isLast={idx === messages.length - 1}
                  isStreaming={isStreaming}
                  onRegenerate={idx === messages.length - 1 ? handleRegenerate : undefined}
                  onDelete={(id) => {
                    handleDeleteMessage(id).catch(console.error)
                  }}
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
          onUpdateSettings={updateSettings}
          disabled={!serverOnline || serverChecking}
        />
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings)
          if (newSettings.personalaiHost) cachePersonalaiHost(newSettings.personalaiHost)
          persistSettingsToServer(newSettings)
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
