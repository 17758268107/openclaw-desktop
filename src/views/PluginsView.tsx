import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Search,
  RefreshCw,
  Trash2,
  Settings as SettingsIcon,
  Puzzle,
  Wrench,
  Plug,
  Boxes,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { ConfirmDialog, Modal } from '@renderer/components/ui/Modal'
import { Tag, EmptyState, SegmentedControl, Switch, Input } from '@renderer/components/ui/Controls'
import {
  listPlugins,
  togglePlugin,
  uninstallPlugin,
  type PluginInfo
} from '@renderer/lib/gateway-api'

type FilterTab = 'all' | 'channel' | 'tool' | 'integration' | 'utility'

const CATEGORY_META: Record<PluginInfo['category'], { label: string; icon: React.ReactNode; color: string }> = {
  channel: { label: '频道', icon: <Plug size={12} />, color: 'text-[var(--accent-secondary)]' },
  tool: { label: '工具', icon: <Wrench size={12} />, color: 'text-[var(--accent-primary)]' },
  integration: { label: '集成', icon: <Boxes size={12} />, color: 'text-purple-400' },
  utility: { label: '实用', icon: <Puzzle size={12} />, color: 'text-blue-400' }
}

export function PluginsView(): React.JSX.Element {
  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [configuring, setConfiguring] = useState<PluginInfo | null>(null)
  const [confirming, setConfirming] = useState<PluginInfo | null>(null)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    const list = await listPlugins()
    setPlugins(list)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const filtered = useMemo(() => {
    return plugins.filter((p) => {
      const matchesQuery =
        !query.trim() ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === 'all' || p.category === filter
      return matchesQuery && matchesFilter
    })
  }, [plugins, query, filter])

  const stats = useMemo(() => {
    const total = plugins.length
    const enabled = plugins.filter((p) => p.enabled).length
    const errors = plugins.filter((p) => p.status === 'error').length
    return { total, enabled, errors }
  }, [plugins])

  const handleToggle = async (p: PluginInfo): Promise<void> => {
    const next = !p.enabled
    setPlugins((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled: next } : x)))
    const res = await togglePlugin(p.id, next)
    if (res.ok) {
      toast.success(`${p.name} 已${next ? '启用' : '禁用'}`)
    } else {
      setPlugins((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled: !next } : x)))
      toast.error('操作失败')
    }
  }

  const handleUninstall = async (p: PluginInfo): Promise<void> => {
    setPlugins((prev) => prev.filter((x) => x.id !== p.id))
    await uninstallPlugin(p.id)
    toast.success(`${p.name} 已卸载`)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">插件管理</h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            {stats.enabled}/{stats.total} 已启用
            {stats.errors > 0 && (
              <span className="ml-2 text-[var(--danger)]">· {stats.errors} 个异常</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            刷新
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
              onChange={(v) => setQuery(v)}
              placeholder="搜索插件…"
              className="pl-7"
            />
          </div>
          <SegmentedControl<FilterTab>
            value={filter}
            onChange={setFilter}
            size="sm"
            options={[
              { value: 'all', label: '全部' },
              { value: 'channel', label: '频道' },
              { value: 'tool', label: '工具' },
              { value: 'integration', label: '集成' },
              { value: 'utility', label: '实用' }
            ]}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton h-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Puzzle size={20} />}
            title="没有找到插件"
            description="尝试更换筛选条件或从插件市场安装新插件。"
            action={
              <button
                onClick={refresh}
                className="rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                刷新列表
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <PluginCard
                key={p.id}
                plugin={p}
                onToggle={() => void handleToggle(p)}
                onUninstall={() => setConfirming(p)}
                onConfigure={() => setConfiguring(p)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!configuring}
        onClose={() => setConfiguring(null)}
        title={configuring ? `配置 · ${configuring.name}` : ''}
        description={configuring?.description}
        size="md"
        footer={
          <button
            onClick={() => setConfiguring(null)}
            className="rounded-md bg-[var(--accent-primary)] px-4 py-1.5 text-sm font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)]"
          >
            保存
          </button>
        }
      >
        {configuring && (
          <div className="space-y-3">
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-3 text-xs">
              <div className="flex justify-between text-[var(--text-tertiary)]">
                <span>版本</span>
                <span className="text-[var(--text-primary)]">v{configuring.version}</span>
              </div>
              <div className="mt-1 flex justify-between text-[var(--text-tertiary)]">
                <span>作者</span>
                <span className="text-[var(--text-primary)]">{configuring.author}</span>
              </div>
              <div className="mt-1 flex justify-between text-[var(--text-tertiary)]">
                <span>大小</span>
                <span className="text-[var(--text-primary)]">{configuring.size}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)]">API 端点</label>
              <input
                type="text"
                defaultValue={`https://api.${configuring.id}.example.com/v1`}
                className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)]">访问令牌</label>
              <input
                type="password"
                defaultValue="sk-************"
                className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)]">超时时间（秒）</label>
              <input
                type="number"
                defaultValue={30}
                className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && void handleUninstall(confirming)}
        title={`卸载 ${confirming?.name}？`}
        description="此操作不可撤销。相关配置和数据将被删除。"
        confirmText="卸载"
        danger
      />
    </div>
  )
}

function PluginCard({
  plugin,
  onToggle,
  onUninstall,
  onConfigure
}: {
  plugin: PluginInfo
  onToggle: () => void
  onUninstall: () => void
  onConfigure: () => void
}): React.JSX.Element {
  const meta = CATEGORY_META[plugin.category]
  const StatusIcon =
    plugin.status === 'active' ? CheckCircle2 : plugin.status === 'error' ? XCircle : AlertCircle
  const statusColor =
    plugin.status === 'active'
      ? 'text-[var(--accent-secondary)]'
      : plugin.status === 'error'
      ? 'text-[var(--danger)]'
      : 'text-[var(--text-tertiary)]'

  return (
    <div
      className={`group rounded-lg border bg-[var(--bg-overlay)] p-4 transition-colors ${
        plugin.enabled
          ? 'border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40'
          : 'border-[var(--border-subtle)]/60 opacity-70 hover:opacity-100'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-md bg-[var(--bg-base)] ${meta.color}`}
          >
            {meta.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                {plugin.name}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">v{plugin.version}</span>
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">{plugin.author}</div>
          </div>
        </div>
        <Switch checked={plugin.enabled} onChange={onToggle} size="sm" />
      </div>
      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
        {plugin.description}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Tag variant="default">{meta.label}</Tag>
          <span className={`flex items-center gap-0.5 text-[10px] ${statusColor}`}>
            <StatusIcon size={10} />
            {plugin.status === 'active' ? '运行中' : plugin.status === 'error' ? '错误' : '已停用'}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onConfigure}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]"
            title="配置"
          >
            <SettingsIcon size={12} />
          </button>
          <button
            onClick={onUninstall}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
            title="卸载"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
