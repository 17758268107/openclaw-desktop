import { useState, useRef, useEffect } from 'react'
import { CopilotChat } from '@copilotkit/react-ui'
import { useCopilotChatHeadless_c } from '@copilotkit/react-core'
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
  Maximize2
} from 'lucide-react'
import { toast } from 'sonner'

/**
 * CopilotKit 聊天面板组件
 * 将 CopilotKit 的 AI 助手集成到 OpenClaw Desktop 中
 */
export function CopilotChatPanel(): React.JSX.Element {
  const { connected } = useGatewayStore()
  const { activeSessionId, addMessage, getActiveSession } = useChatStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const session = getActiveSession()

  // 同步 CopilotKit 消息到 OpenClaw 会话存储
  const syncToSession = (content: string, role: 'user' | 'assistant'): void => {
    if (!activeSessionId) return
    const msg: Message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      status: 'done'
    }
    addMessage(activeSessionId, msg)
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

      {/* CopilotKit 聊天区域 */}
      <div className="flex-1 overflow-hidden">
        <CopilotChat
          instructions="你是 OpenClaw Desktop 的 AI 助手，帮助用户与 OpenClaw Agent 交互、回答问题、执行技能。你可以访问当前会话上下文。"
          labels={{
            title: 'CopilotKit',
            placeholder: connected
              ? '输入消息询问 CopilotKit...'
              : 'Gateway 未连接',
            initial: '你好！我是 CopilotKit AI 助手，可以帮你使用 OpenClaw 的各种功能。'
          }}
          icons={{
            openIcon: <Bot size={16} />,
            closeIcon: <X size={16} />,
            sendIcon: <Send size={14} />,
            stopIcon: <Square size={14} />,
            activityIcon: <Sparkles size={14} />
          }}
          onSubmitMessage={(message) => {
            syncToSession(message, 'user')
          }}
          className="h-full"
        />
      </div>
    </div>
  )
}

/**
 * 内联 CopilotKit 聊天组件
 * 可嵌入到现有 ChatArea 中作为辅助输入
 */
export function CopilotInlineInput({
  onSuggestion
}: {
  onSuggestion?: (text: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const { sendMessage, isLoading } = useCopilotChatHeadless_c()
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async (): Promise<void> => {
    if (!input.trim() || isLoading) return
    try {
      await sendMessage({
        id: generateId(),
        role: 'user',
        content: input
      })
      setInput('')
    } catch (err) {
      toast.error(`CopilotKit 错误: ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true)
          setTimeout(() => textareaRef.current?.focus(), 100)
        }}
        className="flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
      >
        <Sparkles size={12} />
        <span>CopilotKit 助手</span>
      </button>
    )
  }

  return (
    <div className="flex items-end gap-2 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--bg-overlay)] p-2">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="询问 CopilotKit..."
        rows={1}
        className="max-h-[80px] min-h-[24px] flex-1 resize-none bg-transparent px-2 py-1 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
      />
      {isLoading ? (
        <button
          onClick={() => {}}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--danger)] text-white"
        >
          <Square size={12} />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-[var(--bg-base)] disabled:opacity-30"
        >
          <Send size={12} />
        </button>
      )}
      <button
        onClick={() => setOpen(false)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
      >
        <X size={14} />
      </button>
    </div>
  )
}
