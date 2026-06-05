import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Stethoscope,
  RefreshCw,
  Download,
  Filter,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  CheckCircle2,
  XCircle,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react'
import { EmptyState, SegmentedControl, Input } from '@renderer/components/ui/Controls'
import {
  listLogs,
  runLiveDiagnostics,
  type LogEntry,
  type LiveDiagnosticCheck
} from '@renderer/lib/gateway-api'

type LevelFilter = 'all' | 'debug' | 'info' | 'warn' | 'error'

const LEVEL_META: Record<
  LogEntry['level'],
  { label: string; color: string; icon: React.ReactNode; bg: string }
> = {
  debug: {
    label: 'DEBUG',
    color: 'text-[var(--text-tertiary)]',
    icon: <Bug size={10} />,
    bg: 'bg-[var(--text-tertiary)]/10'
  },
  info: {
    label: 'INFO',
    color: 'text-[var(--accent-secondary)]',
    icon: <Info size={10} />,
    bg: 'bg-[var(--accent-secondary)]/10'
  },
  warn: {
    label: 'WARN',
    color: 'text-[var(--accent-warning,#f59e0b)]',
    icon: <AlertTriangle size={10} />,
    bg: 'bg-[var(--accent-warning,#f59e0b)]/10'
  },
  error: {
    label: 'ERROR',
    color: 'text-[var(--danger)]',
    icon: <AlertCircle size={10} />,
    bg: 'bg-[var(--danger)]/10'
  }
}

export function DiagnosticsView(): React.JSX.Element {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<LevelFilter>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [checks, setChecks] = useState<LiveDiagnosticCheck[]>([])

  const refresh = async (): Promise<void> => {
    setLoading(true)
    const [list, live] = await Promise.all([listLogs(), runLiveDiagnostics()])
    setLogs(list.reverse())
    setChecks(live)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [autoRefresh])

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchesLevel = level === 'all' || l.level === level
      const matchesQuery =
        !query.trim() ||
        l.message.toLowerCase().includes(query.toLowerCase()) ||
        l.source.toLowerCase().includes(query.toLowerCase())
      return matchesLevel && matchesQuery
    })
  }, [logs, query, level])

  const stats = useMemo(() => {
    return {
      total: logs.length,
      errors: logs.filter((l) => l.level === 'error').length,
      warns: logs.filter((l) => l.level === 'warn').length,
      info: logs.filter((l) => l.level === 'info').length
    }
  }, [logs])

  const checkStats = useMemo(() => {
    return {
      pass: checks.filter((c) => c.status === 'pass').length,
      warn: checks.filter((c) => c.status === 'warn').length,
      fail: checks.filter((c) => c.status === 'fail').length
    }
  }, [checks])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <Stethoscope size={16} className="text-[var(--accent-primary)]" />
            诊断与日志
          </h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            健康检查 · 实时日志 · 故障排查
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
              autoRefresh
                ? 'border-[var(--accent-secondary)]/30 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-overlay)] text-[var(--text-secondary)]'
            }`}
          >
            {autoRefresh ? <Wifi size={12} /> : <WifiOff size={12} />}
            {autoRefresh ? '自动刷新' : '已暂停'}
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            onClick={() => {
              const blob = new Blob(
                [
                  logs
                    .map(
                      (l) =>
                        `[${new Date(l.ts).toISOString()}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`
                    )
                    .join('\n')
                ],
                { type: 'text/plain' }
              )
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `openclaw-logs-${new Date().toISOString().slice(0, 10)}.txt`
              a.click()
              URL.revokeObjectURL(url)
              toast.success('日志已下载')
            }}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Download size={12} />
            导出
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <CheckSummary
            icon={<CheckCircle2 size={14} className="text-[var(--accent-secondary)]" />}
            label="健康"
            value={checkStats.pass}
            total={checks.length}
            variant="success"
          />
          <CheckSummary
            icon={<AlertTriangle size={14} className="text-[var(--accent-warning,#f59e0b)]" />}
            label="警告"
            value={checkStats.warn}
            total={checks.length}
            variant="warning"
          />
          <CheckSummary
            icon={<XCircle size={14} className="text-[var(--danger)]" />}
            label="错误"
            value={checkStats.fail}
            total={checks.length}
            variant="danger"
          />
          <CheckSummary
            icon={<Activity size={14} className="text-[var(--accent-primary)]" />}
            label="日志条目"
            value={stats.total}
            total={stats.total}
            variant="accent"
            subtext={`${stats.errors} 错误 · ${stats.warns} 警告`}
          />
        </div>

        <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)]">
          <div className="border-b border-[var(--border-subtle)] px-4 py-2.5">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">健康检查</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
            {checks.map((c) => {
              const icon =
                c.status === 'pass' ? (
                  <CheckCircle2 size={14} className="text-[var(--accent-secondary)]" />
                ) : c.status === 'warn' ? (
                  <AlertTriangle
                    size={14}
                    className="text-[var(--accent-warning,#f59e0b)]"
                  />
                ) : (
                  <XCircle size={14} className="text-[var(--danger)]" />
                )
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-md border border-[var(--border-subtle)]/60 bg-[var(--bg-base)]/40 p-2.5"
                >
                  {icon}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-[var(--text-primary)]">{c.name}</div>
                    <div className="truncate text-[10px] text-[var(--text-tertiary)]">
                      {c.message}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)]">
          <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5 md:flex-row md:items-center">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">实时日志</h3>
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Filter
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                />
                <Input
                  value={query}
                  onChange={setQuery}
                  placeholder="搜索消息、来源…"
                  className="pl-7"
                />
              </div>
              <SegmentedControl<LevelFilter>
                value={level}
                onChange={setLevel}
                size="sm"
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'info', label: '信息' },
                  { value: 'warn', label: '警告' },
                  { value: 'error', label: '错误' }
                ]}
              />
            </div>
          </div>
          {loading ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton h-7 rounded bg-[var(--bg-base)]"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Activity size={20} />}
              title="没有匹配的日志"
              description="尝试更换搜索词或筛选条件。"
            />
          ) : (
            <div className="max-h-[480px] overflow-y-auto font-mono text-[11px]">
              {filtered.map((l, i) => {
                const meta = LEVEL_META[l.level]
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 border-b border-[var(--border-subtle)]/40 px-3 py-1.5 hover:bg-[var(--bg-base)]/40"
                  >
                    <span className="w-16 shrink-0 text-[var(--text-tertiary)]">
                      {new Date(l.ts).toLocaleTimeString('zh-CN', { hour12: false })}
                    </span>
                    <span
                      className={`flex w-14 shrink-0 items-center gap-1 rounded px-1.5 ${meta.bg} ${meta.color}`}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                    <span className="w-32 shrink-0 truncate text-[var(--text-tertiary)]">
                      {l.source}
                    </span>
                    <span className="flex-1 text-[var(--text-secondary)]">{l.message}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckSummary({
  icon,
  label,
  value,
  total,
  variant,
  subtext
}: {
  icon: React.ReactNode
  label: string
  value: number
  total: number
  variant: 'success' | 'warning' | 'danger' | 'accent'
  subtext?: string
}): React.JSX.Element {
  const colorMap = {
    success: 'border-[var(--accent-secondary)]/30 bg-[var(--accent-secondary)]/5',
    warning: 'border-[var(--accent-warning,#f59e0b)]/30 bg-[var(--accent-warning,#f59e0b)]/5',
    danger: 'border-[var(--danger)]/30 bg-[var(--danger)]/5',
    accent: 'border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5'
  }
  return (
    <div className={`rounded-lg border p-3 ${colorMap[variant]}`}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
        <span className="ml-1 text-xs text-[var(--text-tertiary)]">/ {total}</span>
      </div>
      {subtext && <div className="text-[10px] text-[var(--text-tertiary)]">{subtext}</div>}
    </div>
  )
}
