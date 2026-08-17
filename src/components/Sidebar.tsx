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
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header: App Branding */}
        <div className="p-4 flex items-center justify-between border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[8px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-slate-100 text-sm tracking-tight flex items-center gap-1.5">
                Personal AI
                <span className="text-[8px] font-medium px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Local
                </span>
              </h1>
              <p className="text-[9px] text-slate-400">Powered by Ollama</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-lg lg:hidden"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: New Chat */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat()
              if (window.innerWidth < 1024) onClose()
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-md shadow-cyan-500/20 transition-all flex items-center justify-between group cursor-pointer"
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
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {grouped.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p>No chat history yet</p>
              <p className="text-[8px] text-slate-400 mt-1">Start a conversation above!</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="space-y-1">
                <h3 className="px-2 text-[8px] font-bold uppercase tracking-wider text-slate-400">
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
                        if (window.innerWidth < 1024) onClose()
                      }}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                        isActive
                          ? 'bg-slate-900 text-cyan-300 border border-slate-800 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                        
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
                              className="w-full bg-slate-800 text-slate-100 text-xs px-2 py-0.5 rounded border border-cyan-500 focus:outline-none"
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
                          <span className="truncate text-slate-300 group-hover:text-slate-100">
                            {session.title || 'Untitled Chat'}
                          </span>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={(e) => handleStartRename(session, e)}
                            className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteSession(session.id)
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
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
        <div className="p-3 border-t border-slate-900 bg-slate-950/60 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-[9px] font-semibold text-slate-200">Local Directory</p>
                <code className="text-[8px] text-cyan-400 font-mono">E:\models</code>
              </div>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              {models.length} models
            </span>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Model Parameters</span>
            </span>
            <span className="text-[9px] font-mono text-slate-400">{selectedModel}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
