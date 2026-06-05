import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { useChatStore } from '@renderer/stores/chat'

/**
 * 消息内联搜索：在当前会话中查找并跳转到匹配消息
 * 用 Ctrl+F 触发
 */
export function MessageSearch(): React.JSX.Element | null {
  const activeSessionId = useChatStore((s) => s.activeSessionId)
  const session = useChatStore((s) =>
    s.sessions.find((x) => x.id === s.activeSessionId) ?? null
  )

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [currentIdx, setCurrentIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = session
    ? session.messages
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => m.content && m.content.toLowerCase().includes(query.toLowerCase()))
    : []

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // Ctrl+F 打开
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setOpen((v) => {
          if (!v) {
            setTimeout(() => inputRef.current?.focus(), 50)
          }
          return !v
        })
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open || matches.length === 0 || !activeSessionId) return
    const target = matches[currentIdx]?.m
    if (!target) return
    const el = document.querySelector(`[data-msg-id="${target.id}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('msg-flash')
      setTimeout(() => el.classList.remove('msg-flash'), 1500)
    }
  }, [currentIdx, matches.length, open, activeSessionId])

  if (!open) return null

  return (
    <div className="absolute right-4 top-4 z-30 flex items-center gap-1 rounded-lg border border-[var(--accent-primary)]/40 bg-[var(--bg-elevated)]/95 px-2 py-1.5 shadow-xl backdrop-blur-md animate-fade-in">
      <Search size={12} className="text-[var(--accent-primary)]" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setCurrentIdx(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (e.shiftKey) {
              setCurrentIdx((i) =>
                matches.length === 0 ? 0 : (i - 1 + matches.length) % matches.length
              )
            } else {
              setCurrentIdx((i) =>
                matches.length === 0 ? 0 : (i + 1) % matches.length
              )
            }
          }
        }}
        placeholder="搜索消息..."
        className="w-40 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
      />
      <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
        {matches.length > 0 ? `${currentIdx + 1}/${matches.length}` : '0/0'}
      </span>
      <button
        onClick={() =>
          setCurrentIdx((i) =>
            matches.length === 0 ? 0 : (i - 1 + matches.length) % matches.length
          )
        }
        className="rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        title="上一个"
      >
        <ChevronUp size={11} />
      </button>
      <button
        onClick={() =>
          setCurrentIdx((i) => (matches.length === 0 ? 0 : (i + 1) % matches.length))
        }
        className="rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        title="下一个"
      >
        <ChevronDown size={11} />
      </button>
      <button
        onClick={() => setOpen(false)}
        className="rounded p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        title="关闭"
      >
        <X size={11} />
      </button>
    </div>
  )
}