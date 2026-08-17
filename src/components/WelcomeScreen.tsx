import React from 'react'
import { Sparkles, Code2, Lightbulb, Brain, FileText, HardDrive, Cpu, Terminal } from 'lucide-react'
import type { LocalModel } from '../types/chat'

interface WelcomeScreenProps {
  models: LocalModel[]
  selectedModel: string
  onSelectPrompt: (prompt: string) => void
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  models,
  selectedModel,
  onSelectPrompt,
}) => {
  const activeModelObj = models.find((m) => m.name === selectedModel) || models[0]

  const starterCards = [
    {
      icon: Code2,
      title: 'Code & Debugging',
      description: 'Write a TypeScript function to parse NDJSON streams efficiently',
      prompt: 'Write a clean TypeScript function that reads and parses a newline-delimited JSON (NDJSON) stream with full type safety.',
      gradient: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-primary',
    },
    {
      icon: Lightbulb,
      title: 'Creative Brainstorming',
      description: 'Generate 5 innovative feature ideas for a personal AI application',
      prompt: 'Brainstorm 5 unique, cutting-edge feature ideas for a personal AI desktop assistant powered by local LLMs.',
      gradient: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
    },
    {
      icon: Brain,
      title: 'Deep Reasoning',
      description: 'Analyze complex tradeoffs between local model quantization levels',
      prompt: 'Compare Q4_K_M vs Q8_0 quantization in terms of perplexity, RAM usage, and inference speed for local 4B parameter models.',
      gradient: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
    },
    {
      icon: FileText,
      title: 'Refine & Summarize',
      description: 'Draft a concise executive summary of a technical project update',
      prompt: 'Write a professional, concise executive update summarizing the successful deployment of a local AI chat interface.',
      gradient: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    },
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      {/* Ambient Decorative Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 blur-[96px] rounded-full pointer-events-none -z-10" />

      {/* Hero Badge */}
      <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full surface-panel/90 border border-border backdrop-blur-md shadow-lg shadow-black/40">
        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
          Local Intelligence Activated
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
      </div>

      {/* Main Title & Subtitle */}
      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
        Where can we start today?
      </h1>
      <p className="text-muted-foreground text-sm sm:text-base max-w-xl mb-8 leading-relaxed">
        Chatting with <span className="text-foreground font-semibold">{selectedModel}</span> loaded directly from{' '}
        <code className="text-primary font-mono text-xs surface-panel px-2 py-1 rounded border border-border">
          E:\models
        </code>
      </p>

      {/* Model Spec Pills */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-10 text-xs">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl surface-panel/80 border border-border text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-primary" />
          <span>Params: <strong>{activeModelObj?.details?.parameter_size || 'N/A'}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl surface-panel/80 border border-border text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span>Quant: <strong>{activeModelObj?.details?.quantization_level || 'GGUF'}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl surface-panel/80 border border-border text-slate-300">
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          <span>Storage: <strong>{(activeModelObj?.size ? (activeModelObj.size / (1024 * 1024 * 1024)).toFixed(2) : 0)} GB</strong></span>
        </div>
      </div>

      {/* 4 Interactive Starter Prompt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left">
        {starterCards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.title}
              onClick={() => onSelectPrompt(card.prompt)}
              className={`p-4 rounded-2xl surface-panel/50 hover:surface-panel border ${card.gradient} backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 shadow-md flex flex-col justify-between group cursor-pointer`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-foreground group-hover:text-cyan-300 transition-colors">
                    {card.title}
                  </span>
                  <div className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 group-hover:text-primary transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {card.description}
                </p>
              </div>
              <span className="text-[9px] text-primary font-medium mt-4 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Use prompt &rarr;
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
