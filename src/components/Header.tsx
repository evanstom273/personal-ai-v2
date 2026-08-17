import React, { useState, useRef, useEffect } from 'react'
import {
  Menu,
  Sparkles,
  ChevronDown,
  Settings as SettingsIcon,
  Plus,
  Moon,
  Sun,
  HardDrive,
  Trash2,
  Share2,
  Check,
  Brain,
  Zap,
} from 'lucide-react'
import type { LocalModel, ChatSettings } from '../types/chat'
import { DeploymentStageBadge } from './DeploymentStageBadge'

interface HeaderProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  models: LocalModel[]
  selectedModel: string
  onSelectModel: (modelName: string) => void
  onNewChat: () => void
  onOpenSettings: () => void
  onClearCurrentChat: () => void
  settings: ChatSettings
  onUpdateSettings: (newSettings: Partial<ChatSettings>) => void
  hasMessages: boolean
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  models,
  selectedModel,
  onSelectModel,
  onNewChat,
  onOpenSettings,
  onClearCurrentChat,
  settings,
  onUpdateSettings,
  hasMessages,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeModelObj = models.find((m) => m.name === selectedModel) || models[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark'
    onUpdateSettings({ theme: nextTheme })
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b bg-slate-950/80 border-slate-800/70 backdrop-blur-xl text-slate-100 transition-colors">
      {/* Left side: Sidebar Toggle & Model Dropdown */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-400 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onNewChat}
          className="p-2 text-slate-400 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors sm:hidden"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Custom Model Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-850 transition-all text-sm font-medium shadow-sm group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="font-semibold text-slate-100">
                {activeModelObj?.name || selectedModel}
              </span>
              {activeModelObj?.details?.parameter_size && (
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {activeModelObj.details.parameter_size}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Local Models (`E:\models`)
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Ollama Active
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto p-1 space-y-1">
                {models.map((m) => {
                  const isSelected = m.name === selectedModel
                  return (
                    <button
                      key={m.name}
                      onClick={() => {
                        onSelectModel(m.name)
                        setDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'hover:bg-slate-800/70 text-slate-300 hover:text-slate-100 border border-transparent'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{m.name}</span>
                          {m.details?.parameter_size && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400">
                              {m.details.parameter_size}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {m.details?.quantization_level
                            ? `Quant: ${m.details.quantization_level}`
                            : 'Local Model'}
                          {m.details?.context_length
                            ? ` • ${Math.round(m.details.context_length / 1024)}k context`
                            : ''}
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-1" />}
                    </button>
                  )
                })}
              </div>

              <div className="px-3 py-2 border-t border-slate-800/60 flex items-center justify-between text-slate-400 text-xs bg-slate-950/40">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                  Path: <code className="text-cyan-400 font-mono">E:\models</code>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Thinking Mode Quick Toggle Button */}
        <button
          onClick={() => onUpdateSettings({ enableThinking: !settings.enableThinking })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
            settings.enableThinking
              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
          }`}
          title={
            settings.enableThinking
              ? 'Thinking Mode: ON (Deep Reasoning). Click to switch to Fast Mode.'
              : 'Fast Mode: ON (Thinking Disabled). Click to enable Deep Reasoning.'
          }
        >
          {settings.enableThinking ? (
            <>
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Thinking: ON</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Fast Mode (No Thinking)</span>
            </>
          )}
        </button>
      </div>

      {/* Right side Actions */}
      <div className="flex items-center gap-2">
        <DeploymentStageBadge />

        {hasMessages && (
          <button
            onClick={onClearCurrentChat}
            className="p-2 text-slate-400 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Clear current messages"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={handleShare}
          className="p-2 text-slate-400 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors hidden sm:flex"
          title="Share link"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          title="Toggle light/dark mode"
        >
          {settings.theme === 'light' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-400 rounded-lg hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          title="Chat settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
