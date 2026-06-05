import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Search,
  RefreshCw,
  Zap,
  Sparkles,
  Code,
  Image as ImageIcon,
  Database,
  Plus,
  Trash2,
  Edit3,
  TrendingUp
} from 'lucide-react'
import { Modal } from '@renderer/components/ui/Modal'
import { Tag, EmptyState, SegmentedControl, Input, Switch } from '@renderer/components/ui/Controls'
import { listSkills, type SkillInfo } from '@renderer/lib/gateway-api'

type FilterTab = 'all' | 'builtin' | 'user' | 'plugin'

const SOURCE_META: Record<SkillInfo['source'], { label: string; color: string }> = {
  builtin: { label: '内置', color: 'accent' },
  user: { label: '用户', color: 'success' },
  plugin: { label: '插件', color: 'default' }
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  text: <Sparkles size={12} />,
  code: <Code size={12} />,
  vision: <ImageIcon size={12} />,
  data: <Database size={12} />
}

export function SkillsView(): React.JSX.Element {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [editing, setEditing] = useState<SkillInfo | null>(null)
  const [creating, setCreating] = useState(false)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    const list = await listSkills()
    setSkills(list)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      const matchesQuery =
        !query.trim() ||
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.description.toLowerCase().includes(query.toLowerCase()) ||
        s.triggers.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      const matchesFilter = filter === 'all' || s.source === filter
      return matchesQuery && matchesFilter
    })
  }, [skills, query, filter])

  const stats = useMemo(() => {
    return {
      total: skills.length,
      enabled: skills.filter((s) => s.enabled).length,
      totalUsage: skills.reduce((sum, s) => sum + s.usageCount, 0)
    }
  }, [skills])

  const handleToggle = (s: SkillInfo): void => {
    const next = !s.enabled
    setSkills((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: next } : x)))
    toast.success(`${s.name} 已${next ? '启用' : '禁用'}`)
  }

  const handleDelete = (s: SkillInfo): void => {
    setSkills((prev) => prev.filter((x) => x.id !== s.id))
    toast.success(`已删除技能: ${s.name}`)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">技能管理</h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            {stats.enabled}/{stats.total} 已启用 · 累计调用 {stats.totalUsage} 次
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)]"
          >
            <Plus size={12} />
            新建技能
          </button>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <Input
              value={query}
              onChange={setQuery}
              placeholder="搜索技能、命令触发词…"
              className="pl-7"
            />
          </div>
          <SegmentedControl<FilterTab>
            value={filter}
            onChange={setFilter}
            size="sm"
            options={[
              { value: 'all', label: '全部' },
              { value: 'builtin', label: '内置' },
              { value: 'user', label: '用户' },
              { value: 'plugin', label: '插件' }
            ]}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="skeleton h-16 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Zap size={20} />}
            title="没有找到技能"
            description="尝试更换搜索词或新建一个技能。"
            action={
              <button
                onClick={() => setCreating(true)}
                className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)]"
              >
                新建技能
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <SkillRow
                key={s.id}
                skill={s}
                onToggle={() => handleToggle(s)}
                onEdit={() => setEditing(s)}
                onDelete={() => handleDelete(s)}
              />
            ))}
          </div>
        )}
      </div>

      <SkillEditModal
        open={!!editing}
        skill={editing}
        onClose={() => setEditing(null)}
        onSave={(updated) => {
          setSkills((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
          setEditing(null)
          toast.success('技能已更新')
        }}
      />
      <SkillEditModal
        open={creating}
        skill={null}
        onClose={() => setCreating(false)}
        onSave={(s) => {
          setSkills((prev) => [...prev, { ...s, id: `skill-${Date.now()}` }])
          setCreating(false)
          toast.success('技能已创建')
        }}
      />
    </div>
  )
}

function SkillRow({
  skill,
  onToggle,
  onEdit,
  onDelete
}: {
  skill: SkillInfo
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  const meta = SOURCE_META[skill.source]
  return (
    <div
      className={`group flex items-center gap-4 rounded-lg border bg-[var(--bg-overlay)] p-3 transition-colors ${
        skill.enabled
          ? 'border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40'
          : 'border-[var(--border-subtle)]/60 opacity-70 hover:opacity-100'
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--bg-base)] text-[var(--accent-primary)]">
        {CATEGORY_ICON[skill.category] ?? <Zap size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">/{skill.name}</span>
          <Tag variant={meta.color as 'default' | 'accent' | 'success' | 'danger' | 'warning'}>
            {meta.label}
          </Tag>
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
            <TrendingUp size={9} />
            {skill.usageCount} 次
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{skill.description}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {skill.triggers.map((t) => (
            <code
              key={t}
              className="rounded bg-[var(--bg-base)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]"
            >
              {t}
            </code>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Switch checked={skill.enabled} onChange={onToggle} size="sm" />
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]"
            title="编辑"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            title="删除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SkillEditModal({
  open,
  skill,
  onClose,
  onSave
}: {
  open: boolean
  skill: SkillInfo | null
  onClose: () => void
  onSave: (s: SkillInfo) => void
}): React.JSX.Element {
  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [triggers, setTriggers] = useState(skill?.triggers.join(', ') ?? '/')
  const [category, setCategory] = useState(skill?.category ?? 'text')

  useEffect(() => {
    if (open) {
      setName(skill?.name ?? '')
      setDescription(skill?.description ?? '')
      setTriggers(skill?.triggers.join(', ') ?? '/')
      setCategory(skill?.category ?? 'text')
    }
  }, [open, skill])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={skill ? `编辑技能 · ${skill.name}` : '新建技能'}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            取消
          </button>
          <button
            onClick={() =>
              onSave({
                id: skill?.id ?? `skill-${Date.now()}`,
                name: name.trim() || 'untitled',
                description: description.trim() || '无描述',
                enabled: skill?.enabled ?? true,
                triggers: triggers
                  .split(/[,\s]+/)
                  .map((t) => t.trim())
                  .filter(Boolean),
                usageCount: skill?.usageCount ?? 0,
                category,
                source: skill?.source ?? 'user'
              })
            }
            className="rounded-md bg-[var(--accent-primary)] px-4 py-1.5 text-sm font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)]"
          >
            保存
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-[var(--text-tertiary)]">名称</label>
          <Input value={name} onChange={setName} placeholder="my-skill" className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-tertiary)]">描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="这个技能做什么？"
            className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            rows={3}
          />
        </div>
        <div>
          <label className="text-xs text-[var(--text-tertiary)]">触发命令（用逗号或空格分隔）</label>
          <Input value={triggers} onChange={setTriggers} placeholder="/my-skill, /我的技能" className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-tertiary)]">分类</label>
          <div className="mt-1 flex gap-1.5">
            {(['text', 'code', 'vision', 'data'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  category === c
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50'
                }`}
              >
                {CATEGORY_ICON[c]}
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-tertiary)]">技能脚本（Prompt 模板）</label>
          <textarea
            defaultValue={`你是一个 ${name || 'skill'} 助手。请按以下步骤处理用户输入：\n1. ...\n2. ...`}
            className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            rows={5}
          />
        </div>
      </div>
    </Modal>
  )
}
