import { useChatStore } from '@renderer/stores/chat'
import { formatDate } from '@renderer/lib/utils'
import { SessionSearch } from '@renderer/components/SessionSearch'
import { Plus, MessageSquare, Trash2 } from 'lucide-react'

export function SessionList({ collapsed }: { collapsed: boolean }): React.JSX.Element {
  const { sessions, activeSessionId, createSession, setActiveSession, deleteSession } =
    useChatStore()

  const grouped = new Map<string, typeof sessions>()
  for (const session of sessions) {
    const label = formatDate(session.updatedAt)
    if (!grouped.has(label)) grouped.set(label, [])
    grouped.get(label)!.push(session)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-2 px-2 pb-2">
        <button
          onClick={() => createSession()}
          className="flex w-full items-center gap-2 rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
        >
          <Plus size={16} />
          {!collapsed && <span>新会话</span>}
        </button>
        {!collapsed && <SessionSearch onSelect={setActiveSession} />}
      </div>

      {!collapsed && sessions.length > 0 && (
        <div className="mx-3 border-t border-[var(--border-subtle)] pt-1.5 pb-1 text-[10px] text-[var(--text-tertiary)]">
          共 {sessions.length} 个会话
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2">
        {collapsed ? (
          sessions.map((ses) => (
            <button
              key={ses.id}
              onClick={() => setActiveSession(ses.id)}
              className={`mb-1 flex w-full items-center justify-center rounded-md p-2 transition-colors ${
                ses.id === activeSessionId
                  ? 'bg-[var(--bg-overlay)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
              }`}
              title={ses.title}
            >
              <MessageSquare size={16} />
            </button>
          ))
        ) : (
          Array.from(grouped.entries()).map(([label, group]) => (
            <div key={label} className="mb-2">
              <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                {label}
              </div>
              {group.map((ses) => (
                <div key={ses.id} className="group relative">
                  <button
                    onClick={() => setActiveSession(ses.id)}
                    className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      ses.id === activeSessionId
                        ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="truncate">{ses.title}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(ses.id)
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-tertiary)] opacity-0 transition-opacity hover:text-[var(--danger)] group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </nav>
    </div>
  )
}
