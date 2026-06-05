import { useEffect, useMemo, useRef, useState } from 'react'
import { Command, Search, X } from 'lucide-react'

export interface CommandItem {
  id: string
  label: string
  description?: string
  group: string
  icon?: React.ReactNode
  shortcut?: string[]
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: CommandItem[]
}

/**
 * 全局命令面板 (Cmd+K)
 */
export function CommandPalette({ open, onClose, commands }: CommandPaletteProps): React.JSX.Element | null {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter((c) => {
      const searchTarget = [
        c.label,
        c.description ?? '',
        c.group,
        ...(c.keywords ?? [])
      ]
        .join(' ')
        .toLowerCase()
      return searchTarget.includes(q)
    })
  }, [commands, query])

  const grouped = useMemo(() => {
    const groups = new Map<string, CommandItem[]>()
    for (const cmd of filtered) {
      if (!groups.has(cmd.group)) groups.set(cmd.group, [])
      groups.get(cmd.group)!.push(cmd)
    }
    return groups
  }, [filtered])

  // 扁平化以便键盘导航
  const flatList = useMemo(() => {
    const list: CommandItem[] = []
    for (const items of grouped.values()) list.push(...items)
    return list
  }, [grouped])

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, flatList.length - 1)))
  }, [flatList.length])

  if (!open) return null

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (flatList.length === 0 ? 0 : (i + 1) % flatList.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (flatList.length === 0 ? 0 : (i - 1 + flatList.length) % flatList.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = flatList[activeIndex]
      if (cmd) {
        cmd.action()
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  let runningIndex = -1

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-2xl animate-fade-in">
        <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4">
          <Search size={16} className="text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索命令、Agent、视图…"
            className="flex-1 bg-transparent py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
          <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[var(--text-tertiary)]">
              未找到匹配的命令
            </div>
          ) : (
            Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group} className="mb-1">
                <div className="px-4 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  {group}
                </div>
                {items.map((cmd) => {
                  runningIndex++
                  const isActive = runningIndex === activeIndex
                  const currentIdx = runningIndex
                  return (
                    <button
                      key={cmd.id}
                      onMouseEnter={() => setActiveIndex(currentIdx)}
                      onClick={() => {
                        cmd.action()
                        onClose()
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isActive
                          ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'
                      }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--accent-primary)]">
                        {cmd.icon ?? <Command size={14} />}
                      </span>
                      <span className="flex-1 truncate text-sm">{cmd.label}</span>
                      {cmd.description && (
                        <span className="truncate text-[10px] text-[var(--text-tertiary)]">
                          {cmd.description}
                        </span>
                      )}
                      {cmd.shortcut && (
                        <span className="flex gap-1">
                          {cmd.shortcut.map((k, i) => (
                            <kbd
                              key={i}
                              className="rounded border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-1 text-[10px] text-[var(--text-tertiary)]"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-2 text-[10px] text-[var(--text-tertiary)]">
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-1">↑↓</kbd>
            导航
            <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-1">↵</kbd>
            执行
          </span>
          <span>{filtered.length} 个结果</span>
        </div>
      </div>
    </div>
  )
}