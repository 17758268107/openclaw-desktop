import { useState, useMemo } from 'react'
import { useChatStore } from '@renderer/stores/chat'
import { Search, X } from 'lucide-react'

interface SessionSearchProps {
  onSelect: (sessionId: string) => void
}

export function SessionSearch({ onSelect }: SessionSearchProps): React.JSX.Element {
  const { sessions } = useChatStore()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return sessions
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.messages.some((m) => m.content.toLowerCase().includes(q))
      )
      .slice(0, 10)
  }, [sessions, query])

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="搜索会话..."
          className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] py-1.5 pl-8 pr-7 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {focused && query && results.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-1 shadow-lg">
          {results.map((ses) => {
            const matchMsg = ses.messages.find((m) =>
              m.content.toLowerCase().includes(query.toLowerCase())
            )
            return (
              <button
                key={ses.id}
                onClick={() => {
                  onSelect(ses.id)
                  setQuery('')
                  setFocused(false)
                }}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-[var(--bg-overlay)]"
              >
                <span className="truncate text-xs font-medium text-[var(--text-primary)]">
                  {ses.title}
                </span>
                {matchMsg && (
                  <span className="truncate text-[10px] text-[var(--text-tertiary)]">
                    {matchMsg.role === 'user' ? '👤 ' : '🦞 '}
                    {matchMsg.content.slice(0, 60)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {focused && query && results.length === 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-center text-xs text-[var(--text-tertiary)] shadow-lg">
          未找到匹配的会话
        </div>
      )}
    </div>
  )
}
