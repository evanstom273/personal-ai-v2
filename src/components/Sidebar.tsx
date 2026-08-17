import React, { useState } from 'react'
import {
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Bot,
  HardDrive,
  ChevronLeft,
  Sliders,
} from 'lucide-react'
import type { ChatSession, LocalModel } from '../types/chat'
import { cn } from '../utils/cn'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  sessions: ChatSession[]
  activeSessionId: string
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, newTitle: string) => void
  models: LocalModel[]
  selectedModel: string
  onOpenSettings: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  models,
  selectedModel,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(session.id)
    setEditingTitle(session.title)
  }

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim())
    }
    setEditingId(null)
  }

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group sessions by date
  const groupSessions = () => {
    const today: ChatSession[] = []
    const yesterday: ChatSession[] = []
    const past7Days: ChatSession[] = []
    const older: ChatSession[] = []

    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    filteredSessions.forEach((s) => {
      const diff = now - s.updatedAt
      if (diff < oneDay) {
        today.push(s)
      } else if (diff < 2 * oneDay) {
        yesterday.push(s)
      } else if (diff < 7 * oneDay) {
        past7Days.push(s)
      } else {
        older.push(s)
      }
    })

    return [
      { label: 'Today', items: today },
      { label: 'Yesterday', items: yesterday },
      { label: 'Previous 7 Days', items: past7Days },
      { label: 'Older', items: older },
    ].filter((g) => g.items.length > 0)
  }

  const grouped = groupSessions()

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 flex w-72 max-w-[min(18rem,88vw)] flex-col',
          'surface-glass border-r border-border/80 transition-transform duration-300 ease-in-out',
          'xl:static xl:z-auto xl:max-w-none xl:shrink-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          !isOpen && 'xl:hidden',
        )}
        aria-hidden={!isOpen ? true : undefined}
      >
        {/* Top Header: App Branding */}
        <div className="p-4 flex items-center justify-between border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="home-hero-icon flex h-9 w-9 items-center justify-center rounded-xl text-primary">
                <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm tracking-tight flex items-center gap-1.5">
                Personal AI
                <span className="text-[8px] font-medium px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/25">
                  Local
                </span>
              </h1>
              <p className="text-[9px] text-muted-foreground">Powered by Ollama</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-ghost rounded-lg p-1.5 xl:hidden"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: New Chat */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat()
              if (window.innerWidth < 1280) onClose()
            }}
            className="btn-primary w-full flex cursor-pointer items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              <span>New Chat</span>
            </div>
            <kbd className="hidden sm:inline-block text-[8px] font-mono px-1.5 py-0.5 bg-black/20 rounded border border-white/10 text-cyan-100">
              ⌘N
            </kbd>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="surface-input w-full rounded-xl py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {grouped.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No chat history yet</p>
              <p className="text-[8px] mt-1">Start a conversation above!</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="space-y-1">
                <h3 className="px-2 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h3>
                {group.items.map((session) => {
                  const isActive = session.id === activeSessionId
                  const isEditing = editingId === session.id

                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        onSelectSession(session.id)
                        if (window.innerWidth < 1280) onClose()
                      }}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                        isActive
                          ? 'surface-panel text-primary ring-1 ring-primary/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        
                        {isEditing ? (
                          <form
                            onSubmit={(e) => handleSaveRename(session.id, e)}
                            className="flex items-center gap-1 w-full"
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              autoFocus
                              className="surface-input w-full rounded border border-primary px-2 py-0.5 text-xs text-foreground focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={(e) => handleSaveRename(session.id, e)}
                              className="p-0.5 text-emerald-400 hover:text-emerald-300"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <span className="truncate text-foreground/90 group-hover:text-foreground">
                            {session.title || 'Untitled Chat'}
                          </span>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={(e) => handleStartRename(session, e)}
                            className="btn-ghost p-1 hover:text-primary"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteSession(session.id)
                            }}
                            className="btn-ghost p-1 hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer: Model Storage Info */}
        <div className="space-y-2 border-t border-border/60 bg-background/40 p-3">
          <div className="surface-panel flex items-center justify-between rounded-xl p-2 text-xs">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[9px] font-semibold text-foreground">Local Directory</p>
                <code className="text-[8px] text-primary font-mono">E:\models</code>
              </div>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {models.length} models
            </span>
          </div>

          <button
            onClick={onOpenSettings}
            className="btn-ghost flex w-full items-center justify-between rounded-xl p-2 text-xs"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Model Parameters</span>
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">{selectedModel}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
