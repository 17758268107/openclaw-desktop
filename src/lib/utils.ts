export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(timestamp: number): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function groupSessionsByDate(sessions: { updatedAt: number }[]): Map<string, number[]> {
  const groups = new Map<string, number[]>()
  for (const session of sessions) {
    const now = new Date()
    const date = new Date(session.updatedAt)
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)
    let key: string
    if (days === 0) key = '今天'
    else if (days === 1) key = '昨天'
    else if (days < 7) key = '最近7天'
    else if (days < 30) key = '最近30天'
    else key = '更早'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(session.updatedAt)
  }
  return groups
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as unknown as T
}

/**
 * 估算字符串的 Token 数量
 * 中文字符按 1.5 token/字，英文按 0.25 token/字符计算 (粗略)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  let cn = 0
  let en = 0
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code > 0x4e00 && code < 0x9fff) cn++
    else en++
  }
  return Math.ceil(cn * 1.5 + en * 0.25)
}

/**
 * 格式化 Token 数量
 */
export function formatTokenCount(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10000) return (n / 1000).toFixed(1) + 'k'
  if (n < 1000000) return Math.round(n / 1000) + 'k'
  return (n / 1000000).toFixed(1) + 'M'
}

/**
 * 格式化持续时间（毫秒）
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0s'
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const remS = s % 60
  if (m < 60) return remS > 0 ? `${m}m ${remS}s` : `${m}m`
  const h = Math.floor(m / 60)
  const remM = m % 60
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`
}

/**
 * 从文本中提取 @agent 提及
 */
export function extractAgentMentions(text: string): string[] {
  const matches = text.matchAll(/@(\w+)/g)
  return Array.from(matches, (m) => m[1])
}

/**
 * 高亮文本中的关键词
 */
export function highlightMatches(
  text: string,
  query: string
): { text: string; matched: boolean }[] {
  if (!query) return [{ text, matched: false }]
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((p) => ({ text: p, matched: p.toLowerCase() === query.toLowerCase() }))
}
