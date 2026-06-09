import { useState, useRef, useEffect } from 'react'
import { useCopilotChatHeadless_c } from '@copilotkit/react-core'
import type { Message as CopilotKitMessage } from '@copilotkit/shared'
import { useGatewayStore } from '@renderer/stores/gateway'
import { useChatStore } from '@renderer/stores/chat'
import { generateId } from '@renderer/lib/utils'
import type { Message } from '@renderer/types'
import {
  Send,
  Square,
  Sparkles,
  Bot,
  X,
  Minimize2,
  Maximize2,
  User,
  Copy,
  Check
} from 'lucide-react'
import { toast } from 'sonner'

/**
 * CopilotKit 聊天面板组件 - 使用 Headless Hook 实现，完全自定义 UI
 * 不依赖 CopilotKit 默认 CSS，避免 Tailwind v3/v4 @layer 冲突
 */
export function CopilotChatPanel(): React.JSX.Element {
  const { connected } = useGatewayStore()
  const { activeSessionId, addMessage } = useChatStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const {
    messages,
    sendMessage,
    isLoading,
    stopGeneration,
    reset
  } = useCopilotChatHeadless_c({
    makeSystemMessage: () =>
      '你是 OpenClaw Desktop 的 AI 助手，帮助用户与 OpenClaw Agent 交互、回答问题、执行技能。你可以访问当前会话上下文。'
  })

  // 同步 CopilotKit 消息到 OpenClaw 会话存储
  useEffect(() => {
    if (!activeSessionId || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role === 'assistant') {
      const msg: Message = {
        id: generateId(),
        role: 'assistant',
        content: lastMsg.content as string,
        timestamp: Date.now(),
        status: 'done'
      }
      addMessage(activeSessionId, msg)
    }
  }, [messages])

  const handleCopy = async (text: string, id: string): Promise<void> => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--bg-base)] shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        title="打开 CopilotKit AI 助手"
      >
        <Bot size={22} />
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-2xl transition-all duration-300 ${
        isExpanded ? 'h-[80vh] w-[600px]' : 'h-[500px] w-[380px]'
      }`}
    >
      {/* 头部 */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-4">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-[var(--accent-primary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            CopilotKit 助手
          </span>
          {!connected && (
            <span className="rounded-full bg-[var(--danger)]/10 px-2 py-0.5 text-[10px] text-[var(--danger)]">
              离线
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={reset}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]"
            title="清空对话"
          >
            <Sparkles size={12} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]"
            title={isExpanded ? '缩小' : '展开'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]"
            title="关闭"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Bot size={32} className="text-[var(--accent-primary)] opacity-50" />
            <p className="text-sm text-[var(--text-secondary)]">
              你好！我是 CopilotKit AI 助手
              <br />
              可以帮你使用 OpenClaw 的各种功能
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onCopy={handleCopy}
            copiedId={copiedId}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
            <Bot size={14} className="animate-pulse" />
            <span className="text-xs">正在思考...</span>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] p-3">
        <ChatInput
          onSend={async (text) => {
            if (!connected) {
              toast.error('Gateway 未连接，无法发送消息')
              return
            }
            const userMsg: CopilotKitMessage = {
              id: generateId(),
              role: 'user',
              content: text
            }
            await sendMessage(userMsg)
          }}
          isLoading={isLoading}
          onStop={stopGeneration}
          disabled={!connected}
        />
      </div>
    </div>
  )
}

// --- 子组件 ---

function MessageBubble({
  message,
  onCopy,
  copiedId
}: {
  message: CopilotKitMessage
  onCopy: (text: string, id: string) => Promise<void>
  copiedId: string | null
}): React.JSX.Element {
  const isUser = message.role === 'user'
  const text = message.content as string

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group flex max-w-[85%] gap-2 ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* 头像 */}
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] ${
            isUser
              ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
              : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)]'
          }`}
        >
          {isUser ? <User size={12} /> : <Bot size={12} />}
        </div>

        {/* 气泡 */}
        <div
          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
            isUser
              ? 'rounded-br-sm bg-[var(--accent-primary)] text-[var(--bg-base)]'
              : 'rounded-bl-sm border border-[var(--border-subtle)] bg-[var(--bg-overlay)] text-[var(--text-primary)]'
          }`}
        >
          <pre className="whitespace-pre-wrap font-sans">{text}</pre>
        </div>

        {/* 复制按钮 */}
        {!isUser && (
          <button
            onClick={() => onCopy(text, message.id)}
            className="self-start rounded p-0.5 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--text-primary)]"
            title="复制"
          >
            {copiedId === message.id ? (
              <Check size={12} className="text-green-500" />
            ) : (
              <Copy size={12} />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function ChatInput({
  onSend,
  isLoading,
  onStop,
  disabled
}: {
  onSend: (text: string) => Promise<void>
  isLoading: boolean
  onStop: () => void
  disabled: boolean
}): React.JSX.Element {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async (): Promise<void> => {
    if (!input.trim()) return
    try {
      await onSend(input)
      setInput('')
      textareaRef.current?.focus()
    } catch (err) {
      toast.error(`发送失败: ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 自动调整高度
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Gateway 未连接' : '输入消息...'}
        disabled={disabled}
        rows={1}
        className="max-h-[120px] min-h-[36px] flex-1 resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] disabled:opacity-50"
      />
      {isLoading ? (
        <button
          onClick={onStop}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--danger)] text-white transition-colors hover:bg-[var(--danger)]/80"
          title="停止生成"
        >
          <Square size={14} />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--bg-base)] transition-colors hover:bg-[var(--accent-primary)]/80 disabled:opacity-30"
          title="发送"
        >
          <Send size={14} />
        </button>
      )}
    </div>
  )
}
