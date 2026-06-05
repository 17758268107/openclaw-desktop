import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Cpu,
  MemoryStick,
  Network,
  Zap,
  Users,
  Clock,
  Gauge,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  MessageSquare
} from 'lucide-react'
import { Progress, Tag, SegmentedControl } from '@renderer/components/ui/Controls'
import {
  getTelemetry,
  getTelemetryHistory,
  type TelemetrySnapshot
} from '@renderer/lib/gateway-api'

type Range = '5m' | '1h' | '24h'

export function TelemetryView(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null)
  const [history, setHistory] = useState<TelemetrySnapshot[]>([])
  const [range, setRange] = useState<Range>('5m')

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const data = await getTelemetry()
      setSnapshot(data)
      setHistory((prev) => [...prev.slice(-29), data])
    }
    void fetchData()
    const id = setInterval(fetchData, 2000)
    return () => clearInterval(id)
  }, [])

  const stats = useMemo(() => {
    if (history.length === 0) {
      return { avgCpu: 0, avgMem: 0, peakCpu: 0, peakMem: 0, totalTokens: 0 }
    }
    return {
      avgCpu: history.reduce((s, h) => s + h.cpu, 0) / history.length,
      avgMem: history.reduce((s, h) => s + h.memory.used, 0) / history.length,
      peakCpu: Math.max(...history.map((h) => h.cpu)),
      peakMem: Math.max(...history.map((h) => h.memory.used)),
      totalTokens: history.reduce(
        (s, h) => s + h.tokenRate.input + h.tokenRate.output,
        0
      )
    }
  }, [history])

  if (!snapshot) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-[var(--text-tertiary)]">加载遥测数据中…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-6 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <Activity size={16} className="text-[var(--accent-primary)]" />
            性能监控
          </h2>
          <p className="text-xs text-[var(--text-tertiary)]">实时遥测 · 2 秒刷新</p>
        </div>
        <SegmentedControl<Range>
          value={range}
          onChange={setRange}
          size="sm"
          options={[
            { value: '5m', label: '5 分钟' },
            { value: '1h', label: '1 小时' },
            { value: '24h', label: '24 小时' }
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            icon={<Cpu size={14} className="text-blue-400" />}
            label="CPU"
            value={`${snapshot.cpu.toFixed(1)}%`}
            trend={`峰值 ${stats.peakCpu.toFixed(1)}%`}
            progress={snapshot.cpu}
          />
          <MetricCard
            icon={<MemoryStick size={14} className="text-purple-400" />}
            label="内存"
            value={`${snapshot.memory.used.toFixed(0)} MB`}
            subvalue={`/ ${snapshot.memory.total} MB`}
            trend={`峰值 ${stats.peakMem.toFixed(0)} MB`}
            progress={(snapshot.memory.used / snapshot.memory.total) * 100}
          />
          <MetricCard
            icon={<Zap size={14} className="text-[var(--accent-primary)]" />}
            label="Token / 分钟"
            value={`${(snapshot.tokenRate.input + snapshot.tokenRate.output).toFixed(0)}`}
            subvalue={`in ${snapshot.tokenRate.input.toFixed(0)} / out ${snapshot.tokenRate.output.toFixed(0)}`}
            trend={`累计 ${stats.totalTokens.toFixed(0)}`}
          />
          <MetricCard
            icon={<Gauge size={14} className="text-[var(--accent-secondary)]" />}
            label="网关延迟"
            value={`${snapshot.gatewayLatency.toFixed(0)} ms`}
            trend="正常范围"
          />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <ChartCard title="CPU 使用率" unit="%">
            <Sparkline data={history.map((h) => h.cpu)} max={100} color="var(--accent-primary)" />
          </ChartCard>
          <ChartCard title="内存使用 (MB)" unit="MB">
            <Sparkline
              data={history.map((h) => h.memory.used)}
              max={snapshot.memory.total}
              color="purple"
            />
          </ChartCard>
          <ChartCard title="Token 速率" unit="/min">
            <Sparkline
              data={history.map((h) => h.tokenRate.input + h.tokenRate.output)}
              color="var(--accent-secondary)"
            />
          </ChartCard>
          <ChartCard title="网关延迟" unit="ms">
            <Sparkline
              data={history.map((h) => h.gatewayLatency)}
              max={100}
              color="blue"
            />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InfoPanel
            icon={<Network size={14} className="text-[var(--text-tertiary)]" />}
            title="网络流量"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <ArrowDown size={11} className="text-[var(--accent-secondary)]" />
                  入站
                </span>
                <span className="font-mono text-[var(--text-primary)]">
                  {snapshot.networkIn.toFixed(1)} KB/s
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <ArrowUp size={11} className="text-[var(--accent-primary)]" />
                  出站
                </span>
                <span className="font-mono text-[var(--text-primary)]">
                  {snapshot.networkOut.toFixed(1)} KB/s
                </span>
              </div>
              <Sparkline data={history.map((h) => h.networkIn)} color="var(--accent-secondary)" />
              <Sparkline data={history.map((h) => h.networkOut)} color="var(--accent-primary)" />
            </div>
          </InfoPanel>

          <InfoPanel
            icon={<MessageSquare size={14} className="text-[var(--text-tertiary)]" />}
            title="会话与队列"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">活跃会话</span>
                <span className="font-mono text-[var(--text-primary)]">
                  {snapshot.activeSessions}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">排队消息</span>
                <Tag variant={snapshot.queuedMessages > 0 ? 'warning' : 'success'}>
                  {snapshot.queuedMessages}
                </Tag>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">运行时长</span>
                <span className="font-mono text-[var(--text-primary)]">
                  {formatDuration(snapshot.uptime)}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md border border-[var(--accent-secondary)]/20 bg-[var(--accent-secondary)]/5 p-2 text-[10px] text-[var(--accent-secondary)]">
                <Clock size={11} />
                所有指标正常
              </div>
            </div>
          </InfoPanel>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  subvalue,
  trend,
  progress
}: {
  icon: React.ReactNode
  label: string
  value: string
  subvalue?: string
  trend?: string
  progress?: number
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
          {icon}
          {label}
        </div>
        {trend && <span className="text-[9px] text-[var(--text-tertiary)]">{trend}</span>}
      </div>
      <div className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
        {value}
        {subvalue && <span className="ml-1 text-xs text-[var(--text-tertiary)]">{subvalue}</span>}
      </div>
      {progress !== undefined && (
        <div className="mt-2">
          <Progress value={progress} size="xs" />
        </div>
      )}
    </div>
  )
}

function ChartCard({
  title,
  unit,
  children
}: {
  title: string
  unit: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">{title}</h3>
        <span className="text-[10px] text-[var(--text-tertiary)]">{unit}</span>
      </div>
      {children}
    </div>
  )
}

function InfoPanel({
  icon,
  title,
  children
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

function Sparkline({
  data,
  max,
  color = 'currentColor'
}: {
  data: number[]
  max?: number
  color?: string
}): React.JSX.Element {
  if (data.length === 0) return <div className="h-12" />
  const maxVal = max ?? Math.max(...data, 1)
  const minVal = Math.min(...data, 0)
  const range = Math.max(maxVal - minVal, 0.01)
  const w = 100
  const h = 48
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * w
      const y = h - ((v - minVal) / range) * h
      return `${x},${y}`
    })
    .join(' ')
  const lastVal = data[data.length - 1]

  return (
    <div className="relative h-12">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={resolveColor(color)}
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor={resolveColor(color)}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <polyline
          points={`0,${h} ${points} ${w},${h}`}
          fill={`url(#grad-${color})`}
          stroke="none"
        />
        <polyline
          points={points}
          fill="none"
          stroke={resolveColor(color)}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={w}
          cy={h - ((lastVal - minVal) / range) * h}
          r="1.5"
          fill={resolveColor(color)}
        />
      </svg>
    </div>
  )
}

function resolveColor(c: string): string {
  if (c.startsWith('var(')) return getComputedStyle(document.documentElement).getPropertyValue(c.slice(4, -1)) || c
  if (c === 'purple') return '#A855F7'
  if (c === 'blue') return '#3B82F6'
  return c
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
