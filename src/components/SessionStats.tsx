import { Cpu, Hash, Clock, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import type { Message } from '@renderer/types'

interface SessionStatsProps {
  messages: Message[]
  startedAt?: number
}

/**
 * 会话统计面板：显示 Token 总用量、消息数、时长、平均响应速度
 */
export function SessionStats({ messages, startedAt }: SessionStatsProps): React.JSX.Element {
  const stats = useMemo(() => {
    const totalTokens = messages.reduce(
      (sum, m) => sum + (m.tokenUsage?.total ?? 0),
      0
    )
    const userMsgs = messages.filter((m) => m.role === 'user').length
    const assistantMsgs = messages.filter((m) => m.role === 'assistant').length

    // 计算平均响应速度（最后一个 user msg 和下一个 assistant msg 的时间差）
    const responseTimes: number[] = []
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
        const dt = messages[i + 1].timestamp - messages[i].timestamp
        if (dt > 0 && dt < 60000) responseTimes.push(dt)
      }
    }
    const avgResponse =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0

    const start = startedAt ?? messages[0]?.timestamp ?? Date.now()
    const elapsed = Date.now() - start

    return { totalTokens, userMsgs, assistantMsgs, avgResponse, elapsed }
  }, [messages, startedAt])

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return '0s'
    const s = Math.floor(ms / 1000)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const remS = s % 60
    if (m < 60) return `${m}m ${remS}s`
    const h = Math.floor(m / 60)
    const remM = m % 60
    return `${h}h ${remM}m`
  }

  const formatTokens = (n: number): string => {
    if (n < 1000) return String(n)
    if (n < 10000) return (n / 1000).toFixed(1) + 'k'
    return Math.round(n / 1000) + 'k'
  }

  return (
    <div className="flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
      <span className="flex items-center gap-1" title="总 Token 用量">
        <Cpu size={10} className="text-[var(--accent-primary)]" />
        <span className="tabular-nums">{formatTokens(stats.totalTokens)}</span>
      </span>
      <span className="flex items-center gap-1" title="消息数">
        <Hash size={10} />
        <span className="tabular-nums">
          {stats.userMsgs}/{stats.assistantMsgs}
        </span>
      </span>
      <span className="flex items-center gap-1" title="会话时长">
        <Clock size={10} />
        <span>{formatDuration(stats.elapsed)}</span>
      </span>
      {stats.avgResponse > 0 && (
        <span className="flex items-center gap-1" title="平均响应时间">
          <TrendingUp size={10} className="text-[var(--accent-secondary)]" />
          <span>{(stats.avgResponse / 1000).toFixed(1)}s</span>
        </span>
      )}
    </div>
  )
}