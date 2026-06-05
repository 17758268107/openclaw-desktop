import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useChatStore } from '@renderer/stores/chat'
import { useGatewayStore } from '@renderer/stores/gateway'
import { generateId, formatTime } from '@renderer/lib/utils'
import { MessageContent } from '@renderer/components/MessageContent'
import { MessageActions } from '@renderer/components/MessageActions'
import { MessageSearch } from '@renderer/components/MessageSearch'
import { SessionStats } from '@renderer/components/SessionStats'
import { useChatPrefsStore } from '@renderer/stores/chat-prefs'
import type { Message } from '@renderer/types'
import {
  Send,
  Square,
  Sparkles,
  Brain,
  ChevronDown,
  ChevronUp,
  AtSign,
  Zap,
  Paperclip,
  Mic,
  MicOff,
  X,
  FileText,
  Image as ImageIcon,
  Code2,
  FileAudio
} from 'lucide-react'
import { toast } from 'sonner'

interface Attachment {
  id: string
  name: string
  size: number
  type: string
  preview?: string
}

export function ChatArea(): React.JSX.Element {
  const {
    activeSessionId,
    activeAgentId,
    agents,
    streaming,
    createSession,
    addMessage,
    updateMessage,
    appendToMessage,
    appendReasoning,
    setStreaming,
    setStreamAbort,
    setActiveAgent,
    getActiveSession
  } = useChatStore()
  const { connected } = useGatewayStore()

  const [input, setInput] = useState('')
  const [reasoningExpanded, setReasoningExpanded] = useState<Record<string, boolean>>({})
  const [agentMenuPos, setAgentMenuPos] = useState<{ start: number; query: string } | null>(null)
  const [skillMenuOpen, setSkillMenuOpen] = useState(false)
  const [inputHistory, setInputHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { showMessageTimestamps, compactMessages } = useChatPrefsStore()
  const session = getActiveSession()
  const messages = session?.messages ?? []

  const filteredAgents = useMemo(() => {
    if (!agentMenuPos) return []
    const q = agentMenuPos.query.toLowerCase()
    return agents.filter((a) => a.name.toLowerCase().includes(q))
  }, [agents, agentMenuPos])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, messages[messages.length - 1]?.content, scrollToBottom])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [input])

  const detectAtAgent = (value: string): void => {
    const cursorPos = textareaRef.current?.selectionStart ?? value.length
    const beforeCursor = value.slice(0, cursorPos)
    const atMatch = beforeCursor.match(/@(\w*)$/)
    if (atMatch) {
      setAgentMenuPos({ start: cursorPos - atMatch[0].length, query: atMatch[1] })
    } else {
      setAgentMenuPos(null)
    }
  }

  const selectAgent = (agentId: string): void => {
    if (!agentMenuPos) return
    const cursorPos = textareaRef.current?.selectionStart ?? input.length
    const before = input.slice(0, agentMenuPos.start)
    const after = input.slice(cursorPos)
    const newInput = `${before}@${agentId} ${after}`
    setInput(newInput)
    setActiveAgent(agentId)
    setAgentMenuPos(null)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value
    setInput(value)
    detectAtAgent(value)
    if (value.endsWith('/')) {
      setSkillMenuOpen(true)
    } else {
      setSkillMenuOpen(false)
    }
  }

  const insertSkill = (skill: string): void => {
    const cursorPos = textareaRef.current?.selectionStart ?? input.length
    const before = input.slice(0, cursorPos)
    const after = input.slice(cursorPos)
    setInput(`${before}${skill} ${after}`)
    setSkillMenuOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const extractAgentFromInput = (text: string): { agentId: string; cleanText: string } => {
    const match = text.match(/^@(\w+)\s+/)
    if (match) {
      const agentName = match[1]
      const found = agents.find((a) => a.name === agentName || a.id === agentName)
      if (found) {
        return { agentId: found.id, cleanText: text.slice(match[0].length) }
      }
    }
    return { agentId: activeAgentId, cleanText: text }
  }

  const handleSlashCommand = (cmd: string): boolean => {
    const command = cmd.trim().toLowerCase()
    if (command === '/clear') {
      if (activeSessionId) {
        const session = getActiveSession()
        if (session) {
          session.messages.forEach((m) => {
            // no-op: replace below
          })
        }
        useChatStore.setState((s) => ({
          sessions: s.sessions.map((ses) =>
            ses.id === activeSessionId ? { ...ses, messages: [] } : ses
          )
        }))
        toast.success('会话已清空')
      }
      return true
    }
    if (command === '/new') {
      createSession()
      toast.success('新会话已创建')
      return true
    }
    if (command === '/agents') {
      const list = agents.map((a) => `  - **${a.name}**: ${a.description ?? '(no description)'}`).join('\n')
      if (activeSessionId) {
        const sysMsg: Message = {
          id: generateId(),
          role: 'system',
          content: `可用 Agents:\n${list}`,
          timestamp: Date.now()
        }
        addMessage(activeSessionId, sysMsg)
      }
      return true
    }
    if (command === '/help') {
      const helpMsg: Message = {
        id: generateId(),
        role: 'system',
        content: `可用命令：\n  /clear - 清空当前会话\n  /new - 创建新会话\n  /agents - 列出所有 Agent\n  /help - 显示此帮助\n\n输入 / 触发技能菜单，输入 @ 选择 Agent。`,
        timestamp: Date.now()
      }
      if (activeSessionId) {
        addMessage(activeSessionId, helpMsg)
      } else {
        const newId = createSession()
        addMessage(newId, helpMsg)
      }
      return true
    }
    return false
  }

  const handleSend = async (): Promise<void> => {
    const trimmed = input.trim()
    if (!trimmed || streaming) return

    if (trimmed.startsWith('/') && !trimmed.startsWith('/skill') && !trimmed.includes(' ')) {
      if (handleSlashCommand(trimmed)) {
        setInput('')
        setInputHistory((prev) => [trimmed, ...prev].slice(0, 100))
        setHistoryIndex(-1)
        return
      }
    }

    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = createSession()
    }

    const { agentId, cleanText } = extractAgentFromInput(trimmed)

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
      status: 'done'
    }
    addMessage(sessionId, userMessage)
    setInput('')
    setInputHistory((prev) => [trimmed, ...prev].slice(0, 100))
    setHistoryIndex(-1)
    setAgentMenuPos(null)
    setSkillMenuOpen(false)
    setAttachments([])

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'streaming',
      agentId
    }
    addMessage(sessionId, assistantMessage)
    setStreaming(true)

    const abortController = new AbortController()
    setStreamAbort(abortController)

    try {
      const streamUrl = await window.openclawAPI.gateway.streamUrl()
      if (!streamUrl) {
        updateMessage(sessionId, assistantMessage.id, {
          content: '⚠️ Gateway 未连接，请先在设置中配置 Gateway 地址。',
          status: 'error',
          error: 'Gateway not connected'
        })
        setStreaming(false)
        setStreamAbort(null)
        return
      }

      const response = await fetch(`${streamUrl}/v1/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          content: cleanText,
          session_id: sessionId
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        updateMessage(sessionId, assistantMessage.id, {
          content: `⚠️ 请求失败: HTTP ${response.status}`,
          status: 'error',
          error: `HTTP ${response.status}`
        })
        setStreaming(false)
        setStreamAbort(null)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        updateMessage(sessionId, assistantMessage.id, {
          content: '⚠️ 无法读取响应流',
          status: 'error',
          error: 'No response body'
        })
        setStreaming(false)
        setStreamAbort(null)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const jsonStr = line.slice(6).trim()
            if (jsonStr === '[DONE]') {
              updateMessage(sessionId!, assistantMessage.id, { status: 'done' })
              setStreaming(false)
              setStreamAbort(null)
              return
            }
            try {
              const event = JSON.parse(jsonStr) as {
                channel?: string
                content?: string
                reasoning?: string
                tool_name?: string
                tool_args?: string
                usage?: { input: number; output: number; total: number }
                error?: string
              }
              switch (event.channel) {
                case 'chunk':
                  if (event.content) appendToMessage(sessionId!, assistantMessage.id, event.content)
                  break
                case 'reasoning':
                  if (event.reasoning) appendReasoning(sessionId!, assistantMessage.id, event.reasoning)
                  break
                case 'tool':
                  if (event.tool_name) {
                    appendToMessage(
                      sessionId!,
                      assistantMessage.id,
                      `\n\n🔧 使用工具: **${event.tool_name}**\n`
                    )
                  }
                  break
                case 'usage':
                  if (event.usage) {
                    updateMessage(sessionId!, assistantMessage.id, { tokenUsage: event.usage })
                  }
                  break
                case 'done':
                  updateMessage(sessionId!, assistantMessage.id, { status: 'done' })
                  setStreaming(false)
                  setStreamAbort(null)
                  return
                case 'error':
                  updateMessage(sessionId!, assistantMessage.id, {
                    status: 'error',
                    error: event.error ?? 'Unknown error',
                    content:
                      (session?.messages.find((m) => m.id === assistantMessage.id)?.content ?? '') +
                      `\n\n⚠️ 错误: ${event.error ?? 'Unknown error'}`
                  })
                  setStreaming(false)
                  setStreamAbort(null)
                  return
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
        updateMessage(sessionId!, assistantMessage.id, { status: 'done' })
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          updateMessage(sessionId!, assistantMessage.id, { status: 'done' })
        } else {
          updateMessage(sessionId!, assistantMessage.id, {
            status: 'error',
            error: (err as Error).message
          })
        }
      }
    } catch (err) {
      updateMessage(sessionId, assistantMessage.id, {
        content: `⚠️ 连接错误: ${err instanceof Error ? err.message : 'Unknown'}`,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown'
      })
    } finally {
      setStreaming(false)
      setStreamAbort(null)
    }
  }

  const handleStop = (): void => {
    const controller = useChatStore.getState().streamAbort
    controller?.abort()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
      return
    }
    if (e.key === 'Escape') {
      setAgentMenuPos(null)
      setSkillMenuOpen(false)
      return
    }
    if (e.key === 'ArrowUp' && !input.trim() && inputHistory.length > 0) {
      e.preventDefault()
      const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1)
      setHistoryIndex(newIndex)
      setInput(inputHistory[newIndex])
      return
    }
    if (e.key === 'ArrowDown' && historyIndex >= 0) {
      e.preventDefault()
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setInput(newIndex < 0 ? '' : inputHistory[newIndex])
    }
  }

  const toggleReasoning = (msgId: string): void => {
    setReasoningExpanded((prev) => ({ ...prev, [msgId]: !prev[msgId] }))
  }

  // ============ 附件处理 ============
  const handleFiles = (files: FileList | null): void => {
    if (!files) return
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))
    setAttachments((prev) => [...prev, ...newAttachments])
    toast.success(`已添加 ${newAttachments.length} 个附件`)
  }

  const removeAttachment = (id: string): void => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id)
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((a) => a.id !== id)
    })
  }

  // ============ 语音输入 ============
  const toggleRecording = (): void => {
    if (isRecording) {
      setIsRecording(false)
      setRecordingTime(0)
      // 模拟识别结果
      const sampleTexts = [
        '请帮我总结一下刚才的对话',
        '写一个 Python 函数来计算斐波那契数列',
        '今天的待办事项有哪些',
        '把这段文字翻译成英文'
      ]
      const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)]
      setInput((prev) => (prev ? `${prev} ${randomText}` : randomText))
      toast.success('语音识别完成')
    } else {
      setIsRecording(true)
      toast.info('开始录音…再次点击麦克风停止')
    }
  }

  useEffect(() => {
    if (!isRecording) return
    const id = setInterval(() => setRecordingTime((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isRecording])

  // ============ 拖拽支持 ============
  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true)
  }
  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) setIsDragOver(false)
  }
  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  const renderMessage = (msg: Message): React.JSX.Element => {
    const isUser = msg.role === 'user'
    const isStreaming = msg.status === 'streaming'

    return (
      <div
        key={msg.id}
        data-msg-id={msg.id}
        className={`group flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} ${
          compactMessages ? 'py-1' : 'py-2'
        }`}
      >
        {!isUser && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-xs text-[var(--accent-primary)]">
            🦞
          </div>
        )}
        <div
          className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
              : 'bg-[var(--bg-overlay)] text-[var(--text-primary)]'
          }`}
        >
          {msg.reasoning && (
            <div className="mb-2 border-b border-[var(--border-subtle)] pb-2">
              <button
                onClick={() => toggleReasoning(msg.id)}
                className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              >
                <Brain size={12} />
                <span>推理过程</span>
                {reasoningExpanded[msg.id] ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
              {reasoningExpanded[msg.id] && (
                <div className="mt-1 whitespace-pre-wrap text-xs text-[var(--text-tertiary)]">
                  {msg.reasoning}
                </div>
              )}
            </div>
          )}
          <div className="relative">
            {msg.content ? (
              <MessageContent content={msg.content} isUser={isUser} />
            ) : (
              !isStreaming && <span className="text-[var(--text-tertiary)]">（空消息）</span>
            )}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-[var(--text-primary)]" />
            )}
          </div>
          {msg.tokenUsage && (
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
              <span className="token-bubble rounded-full px-2 py-0.5 tabular-nums">
                ⚡ {msg.tokenUsage.total} tokens
              </span>
              <span className="tabular-nums text-[10px] text-[var(--text-tertiary)]">
                ↑{msg.tokenUsage.input} ↓{msg.tokenUsage.output}
              </span>
            </div>
          )}
          {msg.status === 'error' && msg.error && (
            <div className="mt-1 text-xs text-[var(--danger)]">{msg.error}</div>
          )}
          {showMessageTimestamps && (
            <div
              className={`mt-1 text-[10px] ${
                isUser ? 'text-[var(--bg-overlay)]/60' : 'text-[var(--text-tertiary)]'
              }`}
            >
              {formatTime(msg.timestamp)}
            </div>
          )}
          <MessageActions
            content={msg.content}
            isUser={isUser}
            streaming={isStreaming}
            onRegenerate={
              !isUser && msg.status === 'done'
                ? () => {
                    const content = msg.content
                    setInput(content)
                    setTimeout(() => handleSend(), 0)
                  }
                : undefined
            }
            onEdit={
              isUser
                ? (newContent) => {
                    setInput(newContent)
                    setTimeout(() => handleSend(), 0)
                  }
                : undefined
            }
          />
        </div>
        {isUser && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-secondary)]/10 text-xs text-[var(--accent-secondary)]">
            👤
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="relative flex-1 overflow-y-auto px-4 py-6">
        {session && session.messages.length > 0 && (
          <div className="sticky top-0 z-20 mb-3 -mt-2 flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)]/85 px-3 py-1.5 backdrop-blur">
            <SessionStats messages={session.messages} startedAt={session.createdAt} />
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Ctrl+F 搜索 · Esc 关闭
            </span>
          </div>
        )}
        <MessageSearch />
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="flex max-w-xl flex-col items-center gap-4 text-center">
              <div className="text-5xl">🦞</div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">开始新的对话</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                输入消息与 OpenClaw Agent 交互，使用 <code className="rounded bg-[var(--bg-overlay)] px-1 text-[var(--accent-primary)]">@agent</code> 切换目标，或输入 <code className="rounded bg-[var(--bg-overlay)] px-1 text-[var(--accent-primary)]">/</code> 查看可用技能。
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--border-subtle)] p-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative">
            {agentMenuPos && filteredAgents.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-1 shadow-lg">
                <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  选择 Agent
                </div>
                {filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => selectAgent(agent.name)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                  >
                    <AtSign size={12} className="text-[var(--accent-primary)]" />
                    <span>{agent.name}</span>
                    {agent.description && (
                      <span className="ml-auto truncate text-[10px] text-[var(--text-tertiary)]">
                        {agent.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {skillMenuOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-1 shadow-lg">
                <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  可用技能
                </div>
                {['/search', '/browse', '/memo', '/code', '/translate'].map((skill) => (
                  <button
                    key={skill}
                    onClick={() => insertSkill(skill)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                  >
                    <Zap size={12} className="text-[var(--accent-primary)]" />
                    <span>{skill}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 附件预览 */}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="group/att flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-1.5"
                  >
                    {att.preview ? (
                      <img
                        src={att.preview}
                        alt={att.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--bg-base)] text-[var(--text-tertiary)]">
                        {att.type.startsWith('image/') ? (
                          <ImageIcon size={14} />
                        ) : att.type.startsWith('audio/') ? (
                          <FileAudio size={14} />
                        ) : att.type.startsWith('text/') || att.name.endsWith('.md') ? (
                          <FileText size={14} />
                        ) : (
                          <Code2 size={14} />
                        )}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="max-w-[120px] truncate text-[11px] text-[var(--text-primary)]">
                        {att.name}
                      </div>
                      <div className="text-[9px] text-[var(--text-tertiary)]">
                        {formatFileSize(att.size)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="rounded p-0.5 text-[var(--text-tertiary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              className={`relative flex items-end gap-1 rounded-xl border bg-[var(--bg-elevated)] p-2 transition-colors ${
                isDragOver
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                  : 'border-[var(--border-subtle)] focus-within:border-[var(--accent-primary)]'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* 拖拽覆盖层 */}
              {isDragOver && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 backdrop-blur-sm">
                  <div className="text-sm font-medium text-[var(--accent-primary)]">
                    释放鼠标上传文件
                  </div>
                </div>
              )}

              {/* 录音中提示 */}
              {isRecording && (
                <div className="absolute -top-9 left-2 flex items-center gap-2 rounded-full bg-[var(--danger)]/15 px-2.5 py-1 text-[10px] font-medium text-[var(--danger)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--danger)]" />
                  录音中 {recordingTime}s · 再次点击停止
                </div>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
                title="附加文件"
              >
                <Paperclip size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  handleFiles(e.target.files)
                  e.target.value = ''
                }}
              />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  connected
                    ? '输入消息...（@agent 切换 · /skill 技能 · Enter 发送 · 拖拽文件到此处）'
                    : 'Gateway 未连接，请先配置连接...'
                }
                disabled={!connected}
                rows={1}
                className="max-h-[160px] min-h-[24px] flex-1 resize-none bg-transparent px-2 py-1 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] disabled:opacity-50"
              />

              <button
                onClick={toggleRecording}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isRecording
                    ? 'bg-[var(--danger)] text-white hover:bg-[var(--danger)]/80'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
                }`}
                title={isRecording ? '停止录音' : '语音输入'}
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
              </button>

              {streaming ? (
                <button
                  onClick={handleStop}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--danger)] text-white transition-colors hover:bg-[var(--danger)]/80"
                  title="停止生成"
                >
                  <Square size={14} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && attachments.length === 0) || !connected}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-[var(--bg-base)] transition-colors hover:bg-[var(--accent-glow)] disabled:opacity-30"
                  title="发送"
                >
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-2">
              <span>
                <Sparkles size={10} className="mr-1 inline" />
                Agent: {activeAgentId}
              </span>
              {input.length > 0 && (
                <span className="tabular-nums">
                  · ≈{Math.ceil(input.length / 4)} tokens
                </span>
              )}
              {attachments.length > 0 && (
                <span className="text-[var(--accent-primary)]">
                  · {attachments.length} 个附件
                </span>
              )}
            </span>
            <span>Enter 发送 · Shift+Enter 换行 · @agent · /skill · 拖拽文件</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
