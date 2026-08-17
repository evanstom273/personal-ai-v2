import React, { useState } from 'react'
import { X, Sliders, HardDrive, RotateCcw, Check, Server, Brain, Zap } from 'lucide-react'
import type { ChatSettings } from '../types/chat'
import { DEFAULT_SETTINGS } from '../services/ollamaService'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: ChatSettings
  onSaveSettings: (newSettings: ChatSettings) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<ChatSettings>(settings)
  const [saved, setSaved] = useState(false)

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSaveSettings(formData)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 1000)
  }

  const handleReset = () => {
    setFormData(DEFAULT_SETTINGS)
  }

  const systemPresets = [
    {
      name: 'Default',
      prompt: 'You are a helpful, intelligent, and precise AI assistant powered by local models.',
    },
    {
      name: 'Code Specialist',
      prompt: 'You are an expert software engineer. Provide clean, production-ready code with minimal explanation unless asked.',
    },
    {
      name: 'Concise Expert',
      prompt: 'Provide direct, accurate, and concise answers without unnecessary filler.',
    },
    {
      name: 'Creative Writer',
      prompt: 'You are a creative writing assistant. Be expressive, imaginative, and engaging.',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-slate-100 text-base">Chat & Model Parameters</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* Local Storage Directory Info Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <h4 className="font-semibold text-slate-200">Local Storage Path</h4>
                <code className="text-cyan-400 font-mono text-[11px]">E:\models</code>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Ollama Engine
            </span>
          </div>

          {/* Thinking Mode Switch Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {formData.enableThinking ? (
                  <Brain className="w-4 h-4 text-purple-400" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-400" />
                )}
                <h4 className="font-semibold text-slate-100 text-sm">
                  {formData.enableThinking ? 'Thinking Mode (Deep Reasoning)' : 'Fast Mode (No Thinking)'}
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm">
                {formData.enableThinking
                  ? 'Model generates step-by-step thought processes before responding. Higher accuracy, slower speed.'
                  : 'Model skips internal reasoning and responds directly. Up to 3x-5x faster responses!'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enableThinking: !formData.enableThinking })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.enableThinking ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  formData.enableThinking ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* System Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 text-sm">System Prompt</label>
              <div className="flex gap-1.5">
                {systemPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, systemPrompt: preset.prompt })}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-mono leading-relaxed"
            />
          </div>

          {/* Hyperparameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Temperature */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-slate-200">Temperature</label>
                <span className="font-mono text-cyan-400 font-bold">{formData.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Higher = more creative & diverse. Lower = deterministic & focused.
              </p>
            </div>

            {/* Top-P */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-slate-200">Top-P (Nucleus Sampling)</label>
                <span className="font-mono text-cyan-400 font-bold">{formData.topP}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={formData.topP}
                onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Considers cumulative probability cutoff for token selection.
              </p>
            </div>

            {/* Context Window */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-slate-200">Context Window (Tokens)</label>
                <span className="font-mono text-cyan-400 font-bold">{formData.contextWindow}</span>
              </div>
              <select
                value={formData.contextWindow}
                onChange={(e) => setFormData({ ...formData, contextWindow: parseInt(e.target.value) })}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none"
              >
                <option value={4096}>4,096 (Standard)</option>
                <option value={8192}>8,192 (Medium)</option>
                <option value={16384}>16,384 (Large)</option>
                <option value={32768}>32,768 (Extended)</option>
                <option value={65536}>65,536 (Ultra)</option>
              </select>
            </div>

            {/* Max Output Tokens */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-slate-200">Max Generation Tokens</label>
                <span className="font-mono text-cyan-400 font-bold">{formData.maxTokens}</span>
              </div>
              <select
                value={formData.maxTokens}
                onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none"
              >
                <option value={1024}>1,024 Tokens</option>
                <option value={2048}>2,048 Tokens</option>
                <option value={4096}>4,096 Tokens</option>
                <option value={8192}>8,192 Tokens</option>
              </select>
            </div>
          </div>

          {/* Ollama Endpoint Host */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-200 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-purple-400" />
              Ollama Host Endpoint
            </label>
            <input
              type="text"
              value={formData.ollamaHost}
              onChange={(e) => setFormData({ ...formData, ollamaHost: e.target.value })}
              placeholder="Leave empty for local Vite proxy (/api -> http://127.0.0.1:11434)"
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500">
              Default Vite proxy connects directly to your local Ollama server running on port 11434.
            </p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold transition-all shadow-md shadow-cyan-500/20"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
