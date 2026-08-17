import {
	AlertCircle,
	Bug,
	CheckCircle2,
	Info,
	Monitor,
	RotateCw,
	Smartphone,
	Tablet,
	TerminalSquare,
	Trash2,
	X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import type { DocumentContentFormat } from '@/storage/types'
import { markdownToHtml } from '@/utils/documentContent'

export interface ConsoleLogEntry {
	id: string
	type: 'log' | 'error' | 'warn' | 'info'
	message: string
	timestamp: number
}

type DeviceViewport = 'desktop' | 'tablet' | 'mobile'

interface DocumentHtmlRunnerDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	content: string
	contentFormat: DocumentContentFormat
}

export function prepareHtmlContent(
	content: string,
	format: DocumentContentFormat,
): string {
	let rawHtml = content.trim()

	if (format === 'markdown') {
		const codeBlockMatch = /```(?:html|xml|htm)?\s*([\s\S]*?)```/i.exec(content)
		if (codeBlockMatch) {
			rawHtml = codeBlockMatch[1].trim()
		} else if (/<[a-z!][\s\S]*>/i.test(content)) {
			rawHtml = content.trim()
		} else {
			rawHtml = markdownToHtml(content)
		}
	}

	const consoleOverrideScript = `
<script>
(function() {
  function sendConsoleMsg(type, args) {
    try {
      var formatted = Array.prototype.slice.call(args).map(function(item) {
        if (typeof item === 'object') {
          try { return JSON.stringify(item, null, 2); } catch(e) { return String(item); }
        }
        return String(item);
      }).join(' ');
      window.parent.postMessage({ type: 'HTML_RUNNER_CONSOLE', logLevel: type, message: formatted, timestamp: Date.now() }, '*');
    } catch(e) {}
  }
  var _log = console.log, _error = console.error, _warn = console.warn, _info = console.info;
  console.log = function() { sendConsoleMsg('log', arguments); _log.apply(console, arguments); };
  console.error = function() { sendConsoleMsg('error', arguments); _error.apply(console, arguments); };
  console.warn = function() { sendConsoleMsg('warn', arguments); _warn.apply(console, arguments); };
  console.info = function() { sendConsoleMsg('info', arguments); _info.apply(console, arguments); };
  window.addEventListener('error', function(event) {
    sendConsoleMsg('error', [event.message + (event.filename ? ' (' + event.filename + ':' + event.lineno + ')' : '')]);
  });
})();
</script>
`

	const hasHtmlTag =
		/<html[\s>]/i.test(rawHtml) || /<!doctype html>/i.test(rawHtml)
	if (hasHtmlTag) {
		if (/<head[\s>]/i.test(rawHtml)) {
			return rawHtml.replace(
				/<head[\s>]/i,
				(match) => `${match}\n${consoleOverrideScript}`,
			)
		}
		return `${consoleOverrideScript}\n${rawHtml}`
	}

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${consoleOverrideScript}
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      padding: 1rem;
      margin: 0;
      background-color: #ffffff;
      color: #0f172a;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  ${rawHtml}
</body>
</html>`
}

export function DocumentHtmlRunnerDialog({
	open,
	onOpenChange,
	title,
	content,
	contentFormat,
}: DocumentHtmlRunnerDialogProps) {
	const [viewport, setViewport] = useState<DeviceViewport>('desktop')
	const [showConsole, setShowConsole] = useState(false)
	const [logs, setLogs] = useState<ConsoleLogEntry[]>([])
	const [refreshKey, setRefreshKey] = useState(0)

	const preparedHtml = useMemo(
		() => prepareHtmlContent(content, contentFormat),
		[content, contentFormat],
	)

	useEffect(() => {
		if (!open) {
			setLogs([])
			setShowConsole(false)
		}
	}, [open])

	useEffect(() => {
		function handleMessage(event: MessageEvent) {
			if (event.data?.type === 'HTML_RUNNER_CONSOLE') {
				const { logLevel, message, timestamp } = event.data
				setLogs((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						type: (logLevel as ConsoleLogEntry['type']) || 'log',
						message: message || '',
						timestamp: timestamp || Date.now(),
					},
				])
			}
		}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	}, [])

	const handleRefresh = useCallback(() => {
		setRefreshKey((prev) => prev + 1)
	}, [])

	const clearLogs = useCallback(() => {
		setLogs([])
	}, [])

	const errorCount = logs.filter((log) => log.type === 'error').length

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="fixed top-1/2 left-1/2 z-50 flex h-[88vh] w-[min(68rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b border-border bg-card/50 px-4 py-3 backdrop-blur-sm md:px-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<DialogTitle className="truncate text-base font-semibold">
							HTML Runner: {title || 'Untitled document'}
						</DialogTitle>

						<div className="flex items-center gap-1.5">
							{/* Device Viewport Selector */}
							<div className="flex items-center rounded-lg border border-border bg-background p-0.5">
								<Button
									type="button"
									size="icon"
									variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
									onClick={() => setViewport('desktop')}
									className="h-7 w-7"
									title="Desktop view"
								>
									<Monitor className="h-3.5 w-3.5" />
								</Button>
								<Button
									type="button"
									size="icon"
									variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
									onClick={() => setViewport('tablet')}
									className="h-7 w-7"
									title="Tablet view (768px)"
								>
									<Tablet className="h-3.5 w-3.5" />
								</Button>
								<Button
									type="button"
									size="icon"
									variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
									onClick={() => setViewport('mobile')}
									className="h-7 w-7"
									title="Mobile view (375px)"
								>
									<Smartphone className="h-3.5 w-3.5" />
								</Button>
							</div>

							{/* Refresh Button */}
							<Button
								type="button"
								size="icon"
								variant="outline"
								onClick={handleRefresh}
								className="h-8 w-8"
								title="Reload frame"
							>
								<RotateCw className="h-3.5 w-3.5" />
							</Button>

							{/* Console Toggle Button */}
							<Button
								type="button"
								variant={showConsole ? 'secondary' : 'outline'}
								size="sm"
								onClick={() => setShowConsole((prev) => !prev)}
								className="relative h-8 gap-1.5 px-2.5 text-xs"
							>
								<TerminalSquare className="h-3.5 w-3.5" />
								Console
								{errorCount > 0 ? (
									<span className="ml-1 rounded-full bg-destructive px-1.5 py-0.2 text-[10px] font-bold text-destructive-foreground">
										{errorCount}
									</span>
								) : logs.length > 0 ? (
									<span className="ml-1 rounded-full bg-secondary-foreground/20 px-1.5 py-0.2 text-[10px] font-medium">
										{logs.length}
									</span>
								) : null}
							</Button>
						</div>
					</div>
				</DialogHeader>

				<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/30">
					{/* Frame Viewport Container */}
					<div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
						<div
							className={`h-full transition-all duration-200 ${
								viewport === 'desktop'
									? 'w-full'
									: viewport === 'tablet'
										? 'w-[768px] max-w-full rounded-lg border border-border bg-white shadow-lg'
										: 'w-[375px] max-w-full rounded-lg border border-border bg-white shadow-lg'
							}`}
						>
							<iframe
								key={refreshKey}
								title="HTML Runner Sandbox"
								srcDoc={preparedHtml}
								sandbox="allow-scripts allow-modals allow-forms allow-popups"
								className="h-full w-full rounded-[inherit] border-none bg-white"
							/>
						</div>
					</div>

					{/* Console Panel */}
					{showConsole ? (
						<div className="flex h-48 shrink-0 flex-col border-t border-border bg-card/90 backdrop-blur-md">
							<div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2">
								<div className="flex items-center gap-2 text-xs font-semibold">
									<TerminalSquare className="h-3.5 w-3.5 text-primary" />
									Console Logs ({logs.length})
								</div>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={clearLogs}
										disabled={logs.length === 0}
										className="h-6 px-2 text-[11px]"
									>
										<Trash2 className="mr-1 h-3 w-3" />
										Clear
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => setShowConsole(false)}
										className="h-6 w-6"
									>
										<X className="h-3 w-3" />
									</Button>
								</div>
							</div>

							<div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-xs">
								{logs.length === 0 ? (
									<p className="text-center text-muted-foreground/60 py-4">
										No console output recorded.
									</p>
								) : (
									<div className="flex flex-col gap-1.5">
										{logs.map((log) => (
											<div
												key={log.id}
												className={`flex items-start gap-2 rounded px-2 py-1 ${
													log.type === 'error'
														? 'bg-destructive/15 text-destructive'
														: log.type === 'warn'
															? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
															: log.type === 'info'
																? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
																: 'bg-muted/60 text-foreground'
												}`}
											>
												{log.type === 'error' ? (
													<Bug className="mt-0.5 h-3.5 w-3.5 shrink-0" />
												) : log.type === 'warn' ? (
													<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
												) : log.type === 'info' ? (
													<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
												) : (
													<CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
												)}
												<span className="flex-1 whitespace-pre-wrap break-all">
													{log.message}
												</span>
												<span className="text-[10px] opacity-60">
													{new Date(log.timestamp).toLocaleTimeString()}
												</span>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	)
}
