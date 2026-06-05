import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Clock,
  HardDrive,
  Archive,
  RotateCcw
} from 'lucide-react'
import { ConfirmDialog } from '@renderer/components/ui/Modal'
import { Tag, EmptyState, Switch } from '@renderer/components/ui/Controls'
import {
  createBackup,
  listBackups,
  type BackupEntry
} from '@renderer/lib/gateway-api'

export function BackupView(): React.JSX.Element {
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [autoBackup, setAutoBackup] = useState(true)
  const [retention, setRetention] = useState(7)
  const [interval, setInterval] = useState<'hourly' | 'daily' | 'weekly'>('daily')
  const [confirming, setConfirming] = useState<BackupEntry | null>(null)
  const [restoring, setRestoring] = useState<BackupEntry | null>(null)
  const [creating, setCreating] = useState(false)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    const list = await listBackups()
    setBackups(list)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const stats = useMemo(() => {
    const totalSize = backups.length * 11 // mock
    const totalSessions = backups.reduce((sum, b) => sum + b.items.sessions, 0)
    const totalMemories = backups.reduce((sum, b) => sum + b.items.memories, 0)
    const auto = backups.filter((b) => b.type === 'auto').length
    const manual = backups.filter((b) => b.type === 'manual').length
    return { totalSize, totalSessions, totalMemories, auto, manual }
  }, [backups])

  const handleCreate = async (): Promise<void> => {
    setCreating(true)
    const res = await createBackup()
    setCreating(false)
    if (res.ok) {
      toast.success('备份已创建')
      void refresh()
    }
  }

  const handleRestore = (b: BackupEntry): void => {
    toast.success(`正在从 ${b.filename} 恢复…`)
    setTimeout(() => toast.success('恢复完成'), 1500)
  }

  const handleDelete = (b: BackupEntry): void => {
    setBackups((prev) => prev.filter((x) => x.id !== b.id))
    toast.success('备份已删除')
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <Database size={16} className="text-[var(--accent-primary)]" />
            数据备份
          </h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            {backups.length} 个备份 · 自动 {stats.auto} · 手动 {stats.manual}
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
            onClick={() => void handleCreate()}
            disabled={creating}
            className="flex items-center gap-1.5 rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)] disabled:opacity-50"
          >
            <Archive size={12} />
            {creating ? '创建中…' : '立即备份'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={<HardDrive size={14} className="text-[var(--accent-primary)]" />}
            label="已用空间"
            value={`${stats.totalSize} MB`}
            subtext="本地备份"
          />
          <StatCard
            icon={<Database size={14} className="text-[var(--accent-secondary)]" />}
            label="会话"
            value={String(stats.totalSessions)}
            subtext="累计备份"
          />
          <StatCard
            icon={<Database size={14} className="text-purple-400" />}
            label="记忆"
            value={String(stats.totalMemories)}
            subtext="累计备份"
          />
          <StatCard
            icon={<Clock size={14} className="text-blue-400" />}
            label="最近备份"
            value={backups[0] ? formatRelative(backups[0].createdAt) : '—'}
            subtext={backups[0]?.type === 'auto' ? '自动' : '手动'}
          />
        </div>

        <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4">
          <h3 className="mb-3 text-sm font-medium text-[var(--text-primary)]">自动备份设置</h3>
          <div className="space-y-3">
            <Switch
              checked={autoBackup}
              onChange={setAutoBackup}
              label="启用自动备份"
              description="按设定周期自动创建备份"
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-[var(--text-tertiary)]">备份频率</label>
                <div className="mt-1 flex gap-1.5">
                  {(['hourly', 'daily', 'weekly'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setInterval(v)}
                      disabled={!autoBackup}
                      className={`flex-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                        interval === v
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                          : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50'
                      }`}
                    >
                      {v === 'hourly' ? '每小时' : v === 'daily' ? '每天' : '每周'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)]">
                  保留数量（{retention} 个）
                </label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={retention}
                  onChange={(e) => setRetention(Number(e.target.value))}
                  disabled={!autoBackup}
                  className="mt-3 w-full accent-[var(--accent-primary)] disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">备份历史</h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toast.info('已导出备份清单')}
                className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]"
                title="导出"
              >
                <Download size={12} />
              </button>
              <button
                onClick={() => toast.info('请选择要导入的备份文件')}
                className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)]"
                title="导入"
              >
                <Upload size={12} />
              </button>
            </div>
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-14 rounded bg-[var(--bg-base)]" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <EmptyState
              icon={<Database size={20} />}
              title="没有备份"
              description={'点击"立即备份"开始创建你的第一个备份'}
            />
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {backups.map((b) => (
                <BackupRow
                  key={b.id}
                  backup={b}
                  onRestore={() => setRestoring(b)}
                  onDelete={() => setConfirming(b)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && handleDelete(confirming)}
        title="删除备份？"
        description={confirming ? `将永久删除 ${confirming.filename}` : ''}
        confirmText="删除"
        danger
      />

      <ConfirmDialog
        open={!!restoring}
        onClose={() => setRestoring(null)}
        onConfirm={() => restoring && handleRestore(restoring)}
        title="从备份恢复？"
        description={
          restoring
            ? `当前会话与记忆将被 ${restoring.filename} 覆盖。建议先创建新备份。`
            : ''
        }
        confirmText="开始恢复"
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  subtext
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold text-[var(--text-primary)]">{value}</div>
      {subtext && <div className="text-[10px] text-[var(--text-tertiary)]">{subtext}</div>}
    </div>
  )
}

function BackupRow({
  backup,
  onRestore,
  onDelete
}: {
  backup: BackupEntry
  onRestore: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-base)]/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--bg-base)] text-[var(--accent-primary)]">
        <Archive size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">
            {backup.filename}
          </span>
          <Tag variant={backup.type === 'auto' ? 'accent' : 'success'}>
            {backup.type === 'auto' ? '自动' : '手动'}
          </Tag>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
          <span>{formatRelative(backup.createdAt)}</span>
          <span>·</span>
          <span>{backup.size}</span>
          <span>·</span>
          <span>
            {backup.items.sessions} 会话 / {backup.items.memories} 记忆 /{' '}
            {backup.items.plugins} 插件
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onRestore}
          className="rounded p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--accent-primary)]/10 hover:text-[var(--accent-primary)]"
          title="恢复"
        >
          <RotateCcw size={12} />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
          title="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  return `${d} 天前`
}
