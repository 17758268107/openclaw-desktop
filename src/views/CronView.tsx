import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Calendar,
  Clock,
  Play,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Timer
} from 'lucide-react'
import { Modal, ConfirmDialog } from '@renderer/components/ui/Modal'
import { EmptyState, Switch, Input } from '@renderer/components/ui/Controls'
import {
  listCronJobs,
  runCronJob,
  toggleCronJob,
  type CronJob
} from '@renderer/lib/gateway-api'

export function CronView(): React.JSX.Element {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CronJob | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirming, setConfirming] = useState<CronJob | null>(null)
  const [running, setRunning] = useState<string | null>(null)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    const list = await listCronJobs()
    setJobs(list)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      enabled: jobs.filter((j) => j.enabled).length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      success: jobs.filter((j) => j.status === 'success').length
    }
  }, [jobs])

  const handleToggle = async (j: CronJob): Promise<void> => {
    const next = !j.enabled
    setJobs((prev) => prev.map((x) => (x.id === j.id ? { ...x, enabled: next } : x)))
    await toggleCronJob(j.id, next)
    toast.success(`${j.name} 已${next ? '启用' : '禁用'}`)
  }

  const handleRun = async (j: CronJob): Promise<void> => {
    setRunning(j.id)
    setJobs((prev) =>
      prev.map((x) => (x.id === j.id ? { ...x, status: 'running' } : x))
    )
    const result = await runCronJob(j.id)
    if (!result.ok) {
      toast.error(`执行失败：${j.name}`)
    } else {
      toast.success(`${j.name} 已触发，等待 Gateway 执行…`)
    }
    setTimeout(() => {
      setRunning(null)
      void refresh()
    }, 2000)
  }

  const handleDelete = (j: CronJob): void => {
    setJobs((prev) => prev.filter((x) => x.id !== j.id))
    toast.success('任务已删除')
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <Calendar size={16} className="text-[var(--accent-primary)]" />
            定时任务
          </h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            {stats.enabled}/{stats.total} 已启用
            {stats.failed > 0 && (
              <span className="ml-2 text-[var(--danger)]">· {stats.failed} 失败</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)]"
        >
          <Plus size={12} />
          新建任务
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton h-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)]"
              />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<Calendar size={20} />}
            title="没有定时任务"
            description="创建你的第一个定时任务，自动执行日常操作。"
          />
        ) : (
          <div className="space-y-2">
            {jobs.map((j) => (
              <CronRow
                key={j.id}
                job={j}
                running={running === j.id}
                onToggle={() => void handleToggle(j)}
                onRun={() => void handleRun(j)}
                onEdit={() => setEditing(j)}
                onDelete={() => setConfirming(j)}
              />
            ))}
          </div>
        )}
      </div>

      <CronEditModal
        open={!!editing || creating}
        job={editing}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
        onSave={(j) => {
          if (editing) {
            setJobs((prev) => prev.map((x) => (x.id === j.id ? j : x)))
            toast.success('任务已更新')
          } else {
            setJobs((prev) => [...prev, { ...j, id: `cron-${Date.now()}` }])
            toast.success('任务已创建')
          }
          setEditing(null)
          setCreating(false)
        }}
      />

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && handleDelete(confirming)}
        title="删除定时任务？"
        description={confirming ? `${confirming.name} 将停止自动执行。` : ''}
        confirmText="删除"
        danger
      />
    </div>
  )
}

function CronRow({
  job,
  running,
  onToggle,
  onRun,
  onEdit,
  onDelete
}: {
  job: CronJob
  running: boolean
  onToggle: () => void
  onRun: () => void
  onEdit: () => void
  onDelete: () => void
}): React.JSX.Element {
  const StatusIcon =
    job.status === 'success'
      ? CheckCircle2
      : job.status === 'failed'
      ? XCircle
      : job.status === 'running'
      ? Loader2
      : AlertCircle
  const statusColor =
    job.status === 'success'
      ? 'text-[var(--accent-secondary)]'
      : job.status === 'failed'
      ? 'text-[var(--danger)]'
      : job.status === 'running'
      ? 'text-[var(--accent-primary)]'
      : 'text-[var(--text-tertiary)]'

  return (
    <div
      className={`group rounded-lg border bg-[var(--bg-overlay)] p-3 transition-colors ${
        job.enabled
          ? 'border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40'
          : 'border-[var(--border-subtle)]/60 opacity-70'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--bg-base)] text-[var(--accent-primary)]">
          <Timer size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">{job.name}</span>
            <code className="rounded bg-[var(--bg-base)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
              {job.schedule}
            </code>
            <span className={`flex items-center gap-0.5 text-[10px] ${statusColor}`}>
              <StatusIcon size={10} className={running ? 'animate-spin' : ''} />
              {job.status === 'success'
                ? '成功'
                : job.status === 'failed'
                ? '失败'
                : job.status === 'running'
                ? '运行中'
                : '空闲'}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{job.description}</p>
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
            {job.lastRun && (
              <span className="flex items-center gap-0.5">
                <Clock size={9} />
                上次: {formatRelative(job.lastRun)}
              </span>
            )}
            {job.nextRun && job.enabled && (
              <span className="flex items-center gap-0.5">
                <Clock size={9} />
                下次: {formatRelative(job.nextRun)}
              </span>
            )}
            {job.lastError && (
              <span className="flex items-center gap-0.5 text-[var(--danger)]">
                <AlertCircle size={9} />
                {job.lastError}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onRun}
            disabled={running}
            className="flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-1 text-[10px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:text-[var(--text-primary)] disabled:opacity-50"
            title="立即执行"
          >
            {running ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
            运行
          </button>
          <Switch checked={job.enabled} onChange={onToggle} size="sm" />
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
    </div>
  )
}

function CronEditModal({
  open,
  job,
  onClose,
  onSave
}: {
  open: boolean
  job: CronJob | null
  onClose: () => void
  onSave: (j: CronJob) => void
}): React.JSX.Element {
  const [name, setName] = useState(job?.name ?? '')
  const [schedule, setSchedule] = useState(job?.schedule ?? '0 0 * * *')
  const [description, setDescription] = useState(job?.description ?? '')
  const [enabled, setEnabled] = useState(job?.enabled ?? true)

  useEffect(() => {
    if (open) {
      setName(job?.name ?? '')
      setSchedule(job?.schedule ?? '0 0 * * *')
      setDescription(job?.description ?? '')
      setEnabled(job?.enabled ?? true)
    }
  }, [open, job])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={job ? `编辑任务 · ${job.name}` : '新建定时任务'}
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
                id: job?.id ?? `cron-${Date.now()}`,
                name: name.trim() || 'untitled',
                schedule,
                description: description.trim(),
                enabled,
                status: job?.status ?? 'idle',
                lastRun: job?.lastRun,
                nextRun: job?.nextRun,
                agentId: job?.agentId
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
          <Input value={name} onChange={setName} placeholder="每日数据汇总" className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-tertiary)]">Cron 表达式</label>
          <Input
            value={schedule}
            onChange={setSchedule}
            placeholder="0 9 * * *"
            className="mt-1 font-mono"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[
              { label: '每分钟', value: '* * * * *' },
              { label: '每小时', value: '0 * * * *' },
              { label: '每天 9 点', value: '0 9 * * *' },
              { label: '每周一', value: '0 9 * * 1' }
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setSchedule(p.value)}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2 py-0.5 text-[10px] text-[var(--text-tertiary)] hover:border-[var(--accent-primary)]/50 hover:text-[var(--text-primary)]"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-tertiary)]">说明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="这个任务做什么？"
            className="mt-1 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
            rows={2}
          />
        </div>
        <Switch
          checked={enabled}
          onChange={setEnabled}
          label="立即启用"
          description="创建后立即激活此任务"
        />
      </div>
    </Modal>
  )
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 60) return m < 0 ? `${-m} 分钟后` : `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return h < 0 ? `${-h} 小时后` : `${h} 小时前`
  const d = Math.floor(h / 24)
  return d < 0 ? `${-d} 天后` : `${d} 天前`
}
