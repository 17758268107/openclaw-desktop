import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGatewayStore } from '@renderer/stores/gateway'
import {
  Brain,
  Search,
  RefreshCw,
  Trash2,
  Copy,
  Tag,
  Check,
  X,
  Pin,
  Plus,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Memo {
  id: string
  content: string
  created_at: string
  updated_at: string
  tags?: string[]
}

type GroupKey = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'older'

function groupMemos(memos: Memo[]): Record<GroupKey, Memo[]> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const weekStart = todayStart - 7 * 86400000
  const monthStart = todayStart - 30 * 86400000

  const groups: Record<GroupKey, Memo[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: []
  }
  for (const m of memos) {
    const t = new Date(m.created_at).getTime()
    if (t >= todayStart) groups.today.push(m)
    else if (t >= yesterdayStart) groups.yesterday.push(m)
    else if (t >= weekStart) groups.thisWeek.push(m)
    else if (t >= monthStart) groups.thisMonth.push(m)
    else groups.older.push(m)
  }
  return groups
}

const GROUP_LABELS: Record<GroupKey, string> = {
  today: '今天',
  yesterday: '昨天',
  thisWeek: '本周',
  thisMonth: '本月',
  older: '更早'
}

export function MemoryView(): React.JSX.Element {
  const { connected } = useGatewayStore()
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTagInput, setNewTagInput] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(true)
  const [copied, setCopied] = useState(false)

  const fetchMemos = useCallback(
    async (query?: string): Promise<void> => {
      if (!connected) return
      setLoading(true)
      try {
        const path = query ? `/v1/memos/search?q=${encodeURIComponent(query)}` : '/v1/memos'
        const res = await window.openclawAPI.gateway.request(path)
        if (res.ok && res.data) {
          const data = res.data as { memos?: Memo[] } | Memo[]
          const list = Array.isArray(data) ? data : data.memos ?? []
          setMemos(list)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    },
    [connected]
  )

  useEffect(() => {
    fetchMemos()
  }, [fetchMemos])

  // 提取所有 tag
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const m of memos) m.tags?.forEach((t) => tagSet.add(t))
    return Array.from(tagSet).sort()
  }, [memos])

  // 按 tag 过滤
  const filteredMemos = useMemo(() => {
    if (!activeTag) return memos
    return memos.filter((m) => m.tags?.includes(activeTag))
  }, [memos, activeTag])

  const groupedMemos = useMemo(() => groupMemos(filteredMemos), [filteredMemos])

  const handleDelete = async (id: string): Promise<void> => {
    try {
      const res = await window.openclawAPI.gateway.request(`/v1/memos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMemos((prev) => prev.filter((m) => m.id !== id))
        if (selectedMemo?.id === id) setSelectedMemo(null)
        toast.success('记忆已删除')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const handleCreate = async (): Promise<void> => {
    if (!newContent.trim()) {
      toast.error('内容不能为空')
      return
    }
    try {
      const res = await window.openclawAPI.gateway.request('/v1/memos', {
        method: 'POST',
        body: { content: newContent, tags: newTags }
      })
      if (res.ok) {
        toast.success('记忆已保存')
        setShowCreate(false)
        setNewContent('')
        setNewTags([])
        setNewTagInput('')
        fetchMemos()
      }
    } catch {
      toast.error('保存失败')
    }
  }

  const copyMemo = async (content: string): Promise<void> => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('已复制到剪贴板')
  }

  const addNewTag = (): void => {
    const t = newTagInput.trim()
    if (t && !newTags.includes(t)) {
      setNewTags([...newTags, t])
      setNewTagInput('')
    }
  }

  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <Brain size={48} className="text-[var(--text-tertiary)]" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">记忆空间</h2>
          <p className="text-sm text-[var(--text-secondary)]">请先连接 Gateway 以查看记忆内容。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div
        className={`flex flex-1 flex-col ${selectedMemo ? 'border-r border-[var(--border-subtle)]' : ''}`}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] p-3">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchMemos(searchQuery)}
              placeholder="搜索记忆..."
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/20"
            title="新建记忆"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => fetchMemos()}
            disabled={loading}
            className="rounded-lg border border-[var(--border-subtle)] p-2 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)] px-3 py-2">
            <button
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                activeTag === null
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
                  : 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                  tag === activeTag
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
                    : 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Tag size={9} />
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {memos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
              <Brain size={32} className="mb-2" />
              <p className="text-sm">{loading ? '加载中...' : '暂无记忆'}</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 rounded-lg border border-[var(--accent-primary)]/40 px-3 py-1 text-xs text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
              >
                创建第一条
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(Object.keys(groupedMemos) as GroupKey[]).map((key) => {
                const list = groupedMemos[key]
                if (list.length === 0) return null
                return (
                  <div key={key}>
                    <div className="sticky top-0 z-10 mb-1 flex items-center gap-2 bg-[var(--bg-base)]/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)] backdrop-blur">
                      <ChevronDown size={9} />
                      {GROUP_LABELS[key]}
                      <span className="ml-1 rounded-full bg-[var(--bg-overlay)] px-1.5 py-0.5 text-[9px]">
                        {list.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {list.map((memo) => (
                        <div
                          key={memo.id}
                          onClick={() => setSelectedMemo(memo)}
                          className={`group cursor-pointer rounded-lg p-3 transition-colors animate-fade-in ${
                            selectedMemo?.id === memo.id
                              ? 'bg-[var(--accent-primary)]/10 ring-1 ring-[var(--accent-primary)]/30'
                              : 'hover:bg-[var(--bg-overlay)]'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <p className="flex-1 text-sm text-[var(--text-primary)] line-clamp-2">
                              {memo.content}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(memo.id)
                              }}
                              className="ml-2 rounded p-1 text-[var(--text-tertiary)] opacity-0 transition-opacity hover:text-[var(--danger)] group-hover:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
                            <span>
                              {new Date(memo.created_at).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {memo.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-[var(--bg-overlay)] px-1.5 py-0.5"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-3 py-2 text-[10px] text-[var(--text-tertiary)]">
          <span>
            共 {filteredMemos.length} 条{activeTag ? ` · #${activeTag}` : ''}
          </span>
          {memos.length > 0 && (
            <span className="flex items-center gap-1">
              <Pin size={9} />
              {allTags.length} 个标签
            </span>
          )}
        </div>
      </div>

      {selectedMemo && (
        <div className="flex w-[440px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-3">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">记忆详情</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`rounded px-2 py-1 text-[10px] transition-colors ${
                  showPreview
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
                title="切换 Markdown 预览"
              >
                {showPreview ? '预览' : '源码'}
              </button>
              <button
                onClick={() => copyMemo(selectedMemo.content)}
                className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                title="复制"
              >
                {copied ? (
                  <Check size={14} className="text-[var(--accent-secondary)]" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
              <button
                onClick={() => setSelectedMemo(null)}
                className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {showPreview ? (
              <div className="prose-chat text-sm leading-relaxed text-[var(--text-primary)]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedMemo.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">
                {selectedMemo.content}
              </div>
            )}
            <div className="mt-4 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-tertiary)]">
              <div className="flex justify-between py-1">
                <span>创建时间</span>
                <span>{new Date(selectedMemo.created_at).toLocaleString('zh-CN')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>更新时间</span>
                <span>{new Date(selectedMemo.updated_at).toLocaleString('zh-CN')}</span>
              </div>
              {selectedMemo.tags && selectedMemo.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedMemo.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[10px] text-[var(--accent-primary)]"
                    >
                      <Tag size={9} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新建记忆弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 shadow-2xl animate-fade-in">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">新建记忆</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="写下你的想法… 支持 Markdown"
              rows={6}
              className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            />
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {newTags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 rounded-full bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[10px] text-[var(--accent-primary)]"
                >
                  {t}
                  <button onClick={() => setNewTags(newTags.filter((x) => x !== t))}>
                    <X size={9} />
                  </button>
                </span>
              ))}
              <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addNewTag()
                  }
                }}
                placeholder="添加标签…"
                className="w-24 rounded border-none bg-transparent text-[10px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-md px-3 py-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="rounded-md bg-[var(--accent-primary)] px-4 py-1.5 text-sm font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)]"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}