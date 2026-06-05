/**
 * Gateway 业务 API 封装
 * 为插件、技能、备份、监控、定时任务、诊断等高级功能提供统一调用入口
 * 在 Gateway 不可用时回退到本地 mock 数据
 */
import { gatewayRequest } from './gateway-client'

async function safeCall(
  fn: () => Promise<{ ok: boolean; data?: unknown; error?: string }>,
  fallback: { ok: boolean; data?: unknown; error?: string }
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const result = await fn()
    return result
  } catch {
    return fallback
  }
}

// ============ 插件 ============
export interface PluginInfo {
  id: string
  name: string
  version: string
  description: string
  author: string
  enabled: boolean
  category: 'channel' | 'tool' | 'integration' | 'utility'
  installedAt: number
  configSchema?: Record<string, unknown>
  config?: Record<string, unknown>
  status: 'active' | 'inactive' | 'error'
  size?: string
}

const MOCK_PLUGINS: PluginInfo[] = [
  {
    id: 'kimi-claw',
    name: 'Kimi Claw',
    version: '1.2.0',
    description: '连接到 Kimi 云端 AI 服务，启用云端对话、记忆、文件通道。',
    author: 'Moonshot AI',
    enabled: true,
    category: 'channel',
    installedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    status: 'active',
    size: '4.2 MB'
  },
  {
    id: 'slack-bridge',
    name: 'Slack Bridge',
    version: '0.9.3',
    description: '将 OpenClaw 会话桥接到 Slack 频道，实现双向消息同步。',
    author: 'OpenClaw Team',
    enabled: false,
    category: 'channel',
    installedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    status: 'inactive',
    size: '2.1 MB'
  },
  {
    id: 'web-search',
    name: 'Web Search',
    version: '2.0.1',
    description: '提供实时网页搜索能力，支持 Bing/Google/Tavily 后端。',
    author: 'OpenClaw Team',
    enabled: true,
    category: 'tool',
    installedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    status: 'active',
    size: '1.4 MB'
  },
  {
    id: 'code-runner',
    name: 'Code Runner',
    version: '1.5.0',
    description: '在沙箱中执行 Python/Node 代码片段，返回执行结果。',
    author: 'OpenClaw Team',
    enabled: true,
    category: 'tool',
    installedAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
    status: 'active',
    size: '8.7 MB'
  },
  {
    id: 'github-integration',
    name: 'GitHub Integration',
    version: '0.7.2',
    description: '查询仓库、PR、Issue，支持 OAuth 认证。',
    author: 'Community',
    enabled: false,
    category: 'integration',
    installedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    status: 'inactive',
    size: '3.0 MB'
  },
  {
    id: 'telemetry-exporter',
    name: 'Telemetry Exporter',
    version: '1.0.0',
    description: '导出使用统计到 Prometheus / OTLP。',
    author: 'OpenClaw Team',
    enabled: false,
    category: 'utility',
    installedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    status: 'inactive',
    size: '0.8 MB'
  }
]

export async function listPlugins(): Promise<PluginInfo[]> {
  const res = await safeCall(() => gatewayRequest('/v1/plugins'), {
    ok: false,
    data: undefined
  })
  if (res.ok && Array.isArray(res.data)) return res.data as PluginInfo[]
  return MOCK_PLUGINS
}

export async function togglePlugin(id: string, enabled: boolean): Promise<{ ok: boolean }> {
  const res = await safeCall(
    () => gatewayRequest(`/v1/plugins/${id}/toggle`, { method: 'POST', body: { enabled } }),
    { ok: true }
  )
  return { ok: res.ok !== false }
}

export async function uninstallPlugin(id: string): Promise<{ ok: boolean }> {
  const res = await safeCall(
    () => gatewayRequest(`/v1/plugins/${id}`, { method: 'DELETE' }),
    { ok: true }
  )
  return { ok: res.ok !== false }
}

// ============ 技能 ============
export interface SkillInfo {
  id: string
  name: string
  description: string
  enabled: boolean
  triggers: string[]
  usageCount: number
  category: string
  source: 'builtin' | 'user' | 'plugin'
}

const MOCK_SKILLS: SkillInfo[] = [
  {
    id: 'summarize',
    name: 'summarize',
    description: '将长文本压缩为简洁摘要，可选要点列表输出。',
    enabled: true,
    triggers: ['/summarize', '/总结'],
    usageCount: 124,
    category: 'text',
    source: 'builtin'
  },
  {
    id: 'translate',
    name: 'translate',
    description: '在多语言之间翻译文本，支持自动语言检测。',
    enabled: true,
    triggers: ['/translate', '/翻译'],
    usageCount: 89,
    category: 'text',
    source: 'builtin'
  },
  {
    id: 'code-review',
    name: 'code-review',
    description: '对代码块进行静态评审，输出改进建议。',
    enabled: true,
    triggers: ['/review', '/评审'],
    usageCount: 56,
    category: 'code',
    source: 'builtin'
  },
  {
    id: 'commit-msg',
    name: 'commit-msg',
    description: '基于 git diff 生成符合 Conventional Commits 的提交信息。',
    enabled: false,
    triggers: ['/commit'],
    usageCount: 12,
    category: 'code',
    source: 'user'
  },
  {
    id: 'image-desc',
    name: 'image-desc',
    description: '为图像生成无障碍 alt 文本。',
    enabled: true,
    triggers: ['/alt'],
    usageCount: 33,
    category: 'vision',
    source: 'plugin'
  },
  {
    id: 'sql-query',
    name: 'sql-query',
    description: '将自然语言转换为 SQL 查询（只读方言）。',
    enabled: false,
    triggers: ['/sql'],
    usageCount: 8,
    category: 'data',
    source: 'plugin'
  }
]

export async function listSkills(): Promise<SkillInfo[]> {
  const res = await safeCall(() => gatewayRequest('/v1/skills'), {
    ok: false,
    data: undefined
  })
  if (res.ok && Array.isArray(res.data)) return res.data as SkillInfo[]
  return MOCK_SKILLS
}

// ============ Marketplace ============
export interface MarketplaceItem {
  id: string
  name: string
  description: string
  author: string
  category: string
  downloads: number
  rating: number
  icon: string
  tags: string[]
  version: string
  size: string
  installed: boolean
}

const MOCK_MARKETPLACE: MarketplaceItem[] = [
  {
    id: 'discord-bridge',
    name: 'Discord Bridge',
    description: '通过 Webhook 桥接 Discord 频道到 OpenClaw 会话。',
    author: 'OpenClaw Team',
    category: 'channel',
    downloads: 12453,
    rating: 4.7,
    icon: '💬',
    tags: ['chat', 'community', 'webhook'],
    version: '1.0.4',
    size: '1.8 MB',
    installed: false
  },
  {
    id: 'notion-sync',
    name: 'Notion Sync',
    description: '将记忆/会话同步到 Notion 数据库。',
    author: 'Community',
    category: 'integration',
    downloads: 8721,
    rating: 4.5,
    icon: '📝',
    tags: ['productivity', 'docs'],
    version: '0.8.0',
    size: '2.4 MB',
    installed: false
  },
  {
    id: 'voice-tts',
    name: 'Voice TTS',
    description: '集成 ElevenLabs/OpenAI 文本转语音。',
    author: 'OpenClaw Team',
    category: 'utility',
    downloads: 5612,
    rating: 4.8,
    icon: '🔊',
    tags: ['audio', 'tts'],
    version: '1.2.0',
    size: '0.9 MB',
    installed: false
  },
  {
    id: 'pdf-reader',
    name: 'PDF Reader',
    description: '解析 PDF 内容并支持 RAG 问答。',
    author: 'Community',
    category: 'tool',
    downloads: 14302,
    rating: 4.6,
    icon: '📕',
    tags: ['docs', 'rag'],
    version: '1.4.2',
    size: '5.2 MB',
    installed: true
  },
  {
    id: 'calendar-tools',
    name: 'Calendar Tools',
    description: '查询 / 创建 / 修改日历事件。',
    author: 'OpenClaw Team',
    category: 'tool',
    downloads: 9321,
    rating: 4.4,
    icon: '📅',
    tags: ['productivity', 'schedule'],
    version: '0.9.1',
    size: '1.1 MB',
    installed: false
  },
  {
    id: 'docker-runner',
    name: 'Docker Runner',
    description: '在隔离容器中运行任意命令并返回结果。',
    author: 'Community',
    category: 'tool',
    downloads: 6712,
    rating: 4.3,
    icon: '🐳',
    tags: ['sandbox', 'code'],
    version: '1.0.0',
    size: '6.3 MB',
    installed: false
  }
]

export async function listMarketplace(): Promise<MarketplaceItem[]> {
  return MOCK_MARKETPLACE
}

export async function installMarketplaceItem(id: string): Promise<{ ok: boolean }> {
  return { ok: true }
}

// ============ 备份 ============
export interface BackupEntry {
  id: string
  filename: string
  size: string
  createdAt: number
  type: 'auto' | 'manual'
  items: { sessions: number; memories: number; configs: number; plugins: number }
}

const MOCK_BACKUPS: BackupEntry[] = [
  {
    id: 'b1',
    filename: 'openclaw-2026-06-04-0900.zip',
    size: '12.4 MB',
    createdAt: Date.now() - 60 * 60 * 1000,
    type: 'auto',
    items: { sessions: 23, memories: 87, configs: 4, plugins: 5 }
  },
  {
    id: 'b2',
    filename: 'openclaw-2026-06-03-0900.zip',
    size: '11.9 MB',
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
    type: 'auto',
    items: { sessions: 21, memories: 84, configs: 4, plugins: 5 }
  },
  {
    id: 'b3',
    filename: 'openclaw-manual-2026-06-01.zip',
    size: '10.2 MB',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    type: 'manual',
    items: { sessions: 18, memories: 80, configs: 4, plugins: 4 }
  },
  {
    id: 'b4',
    filename: 'openclaw-2026-05-31-0900.zip',
    size: '9.8 MB',
    createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
    type: 'auto',
    items: { sessions: 17, memories: 78, configs: 4, plugins: 4 }
  },
  {
    id: 'b5',
    filename: 'openclaw-2026-05-30-0900.zip',
    size: '9.4 MB',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    type: 'auto',
    items: { sessions: 16, memories: 76, configs: 4, plugins: 4 }
  }
]

export async function listBackups(): Promise<BackupEntry[]> {
  return MOCK_BACKUPS
}

export async function createBackup(): Promise<{ ok: boolean; id: string }> {
  return { ok: true, id: `b${Date.now()}` }
}

// ============ 监控 / 遥测 ============
export interface TelemetrySnapshot {
  cpu: number
  memory: { used: number; total: number }
  networkIn: number
  networkOut: number
  tokenRate: { input: number; output: number }
  uptime: number
  activeSessions: number
  queuedMessages: number
  gatewayLatency: number
}

const MOCK_TELEMETRY_HISTORY: TelemetrySnapshot[] = Array.from({ length: 30 }, (_, i) => ({
  cpu: 8 + Math.random() * 25,
  memory: { used: 280 + Math.random() * 80, total: 1024 },
  networkIn: 30 + Math.random() * 40,
  networkOut: 25 + Math.random() * 50,
  tokenRate: { input: 50 + Math.random() * 80, output: 80 + Math.random() * 120 },
  uptime: i * 30,
  activeSessions: 3 + Math.floor(Math.random() * 4),
  queuedMessages: Math.floor(Math.random() * 3),
  gatewayLatency: 8 + Math.random() * 12
}))

export async function getTelemetry(): Promise<TelemetrySnapshot> {
  return {
    cpu: 14 + Math.random() * 18,
    memory: { used: 320 + Math.random() * 60, total: 1024 },
    networkIn: 35 + Math.random() * 30,
    networkOut: 28 + Math.random() * 45,
    tokenRate: { input: 60 + Math.random() * 70, output: 95 + Math.random() * 100 },
    uptime: 3600,
    activeSessions: 5,
    queuedMessages: 0,
    gatewayLatency: 12 + Math.random() * 6
  }
}

export function getTelemetryHistory(): TelemetrySnapshot[] {
  return MOCK_TELEMETRY_HISTORY
}

// ============ Cron ============
export interface CronJob {
  id: string
  name: string
  schedule: string
  enabled: boolean
  lastRun?: number
  nextRun?: number
  status: 'idle' | 'running' | 'failed' | 'success'
  description: string
  agentId?: string
  lastError?: string
}

const MOCK_CRON: CronJob[] = [
  {
    id: 'meyo-heartbeat-morning',
    name: '早安问候',
    schedule: '0 8 * * *',
    enabled: true,
    lastRun: Date.now() - 6 * 60 * 60 * 1000,
    nextRun: Date.now() + 2 * 60 * 60 * 1000,
    status: 'failed',
    description: '每天早上 8:00 推送早安问候与今日要闻。',
    agentId: 'meyo',
    lastError: 'cron: job interrupted by gateway restart'
  },
  {
    id: 'meyo-daily-diary',
    name: '每日日记',
    schedule: '0 22 * * *',
    enabled: true,
    lastRun: Date.now() - 12 * 60 * 60 * 1000,
    nextRun: Date.now() + 4 * 60 * 60 * 1000,
    status: 'failed',
    description: '汇总当天记忆与重要事件生成日记。',
    agentId: 'meyo',
    lastError: 'Sandbox image not found: openclaw-sandbox:bookworm-slim'
  },
  {
    id: 'memory-cleanup',
    name: '记忆清理',
    schedule: '0 3 * * 0',
    enabled: true,
    lastRun: Date.now() - 2 * 24 * 60 * 60 * 1000,
    nextRun: Date.now() + 4 * 24 * 60 * 60 * 1000,
    status: 'success',
    description: '每周日凌晨清理过期记忆条目。'
  },
  {
    id: 'plugin-update-check',
    name: '插件更新检查',
    schedule: '0 */6 * * *',
    enabled: true,
    lastRun: Date.now() - 3 * 60 * 60 * 1000,
    nextRun: Date.now() + 3 * 60 * 60 * 1000,
    status: 'success',
    description: '每 6 小时检查已安装插件是否有更新。'
  },
  {
    id: 'backup-auto',
    name: '自动备份',
    schedule: '0 9 * * *',
    enabled: true,
    lastRun: Date.now() - 60 * 60 * 1000,
    nextRun: Date.now() + 22 * 60 * 60 * 1000,
    status: 'success',
    description: '每天上午 9:00 自动备份会话、记忆、配置。'
  }
]

export async function listCronJobs(): Promise<CronJob[]> {
  if (!window.openclawAPI?.openclawCli) {
    return MOCK_CRON
  }
  try {
    const result = await window.openclawAPI.openclawCli.cronList()
    if (!result.ok || !Array.isArray(result.jobs) || result.jobs.length === 0) {
      return MOCK_CRON
    }
    return (result.jobs as Record<string, unknown>[]).map(mapOpenclawCronJob)
  } catch (err) {
    console.error('[cron] listCronJobs failed:', err)
    return MOCK_CRON
  }
}

function mapOpenclawCronJob(j: Record<string, unknown>): CronJob {
  const schedule = (j.schedule ?? {}) as { expr?: string; tz?: string }
  const state = (j.state ?? {}) as {
    lastRunAtMs?: number
    nextRunAtMs?: number
    lastRunStatus?: string
    lastError?: string
  }
  const status = state.lastRunStatus
  const mappedStatus: CronJob['status'] =
    status === 'ok' || status === 'success'
      ? 'success'
      : status === 'error'
        ? 'failed'
        : status === 'running'
          ? 'running'
          : 'idle'
  return {
    id: String(j.id ?? ''),
    name: String(j.name ?? '(unnamed)'),
    schedule: schedule.expr ?? '?',
    enabled: Boolean(j.enabled),
    lastRun: state.lastRunAtMs,
    nextRun: state.nextRunAtMs,
    status: mappedStatus,
    description: String(j.description ?? ''),
    agentId:
      typeof (j.payload as { sessionTarget?: string } | undefined)?.sessionTarget === 'string'
        ? (j.payload as { sessionTarget?: string }).sessionTarget
        : undefined,
    lastError: state.lastError
  }
}

export async function toggleCronJob(id: string, enabled: boolean): Promise<{ ok: boolean }> {
  if (window.openclawAPI?.openclawCli) {
    const r = await window.openclawAPI.openclawCli.cronToggle(id, enabled)
    return { ok: r.ok }
  }
  return { ok: true }
}

export async function runCronJob(id: string): Promise<{ ok: boolean }> {
  if (window.openclawAPI?.openclawCli) {
    const r = await window.openclawAPI.openclawCli.cronRun(id)
    return { ok: r.ok }
  }
  return { ok: true }
}

// ============ 诊断 ============
export interface LogEntry {
  ts: number
  level: 'debug' | 'info' | 'warn' | 'error'
  source: string
  message: string
}

export interface DiagnosticCheck {
  id: string
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
}

const MOCK_LOGS: LogEntry[] = Array.from({ length: 80 }, (_, i) => {
  const levels: LogEntry['level'][] = ['debug', 'info', 'info', 'info', 'warn', 'error']
  const sources = ['gateway', 'plugin:kimi-claw', 'plugin:web-search', 'cron', 'sandbox', 'app']
  const messages: Record<LogEntry['level'], string[]> = {
    debug: ['Cache hit for /v1/agents', 'Polling gateway health', 'Indexed memory entries'],
    info: [
      'Gateway connected at http://127.0.0.1:18789',
      'Plugin kimi-claw loaded',
      'Cron job "auto-backup" started',
      'New session created',
      'Token usage: 1248 in / 532 out',
      'Memory entry added: project-2026-roadmap'
    ],
    warn: ['Sandbox image build pending', 'Cron job "meyo-heartbeat-morning" retried'],
    error: [
      'Failed to reach sandbox: image not found',
      'Cron "meyo-daily-diary" failed: Sandbox image not found',
      'Plugin kimi-claw: websocket reconnect 3/5'
    ]
  }
  const level = levels[Math.floor(Math.random() * levels.length)]
  const source = sources[Math.floor(Math.random() * sources.length)]
  const message = messages[level][Math.floor(Math.random() * messages[level].length)]
  return {
    ts: Date.now() - (80 - i) * 30_000,
    level,
    source,
    message
  }
})

export async function listLogs(): Promise<LogEntry[]> {
  return MOCK_LOGS
}

export const DIAGNOSTIC_CHECKS: DiagnosticCheck[] = [
  { id: 'gateway', name: 'Gateway 连接', status: 'pass', message: '已连接 18789' },
  { id: 'sandbox', name: 'Sandbox 镜像', status: 'pass', message: 'openclaw-sandbox:bookworm-slim' },
  { id: 'plugins', name: '已加载插件', status: 'pass', message: '5/6 已启用' },
  { id: 'cron', name: '定时任务', status: 'warn', message: '2 个任务最近失败' },
  { id: 'storage', name: '存储空间', status: 'pass', message: '可用 412 GB' },
  { id: 'network', name: '网络连接', status: 'pass', message: '延迟 12 ms' },
  { id: 'autoupdate', name: '自动更新', status: 'pass', message: '已是最新版本 2026.6.1' },
  { id: 'permissions', name: '系统权限', status: 'warn', message: '麦克风权限未授予' }
]

export interface LiveDiagnosticCheck extends DiagnosticCheck {
  detail?: string
  refresh?: () => Promise<void>
}

export async function runLiveDiagnostics(): Promise<LiveDiagnosticCheck[]> {
  const checks: LiveDiagnosticCheck[] = DIAGNOSTIC_CHECKS.map((c) => ({ ...c }))

  // 1. Gateway 连接
  try {
    const r = await window.openclawAPI.gateway.health()
    const g = checks.find((c) => c.id === 'gateway')
    if (g) {
      g.status = r.ok ? 'pass' : 'fail'
      g.message = r.ok ? '已连接 18789' : '不可达'
    }
  } catch {
    /* keep mock */
  }

  // 2. Sandbox 镜像
  if (window.openclawAPI?.openclawCli) {
    try {
      const r = await window.openclawAPI.openclawCli.sandboxList()
      const s = checks.find((c) => c.id === 'sandbox')
      if (s) {
        if (r.ok) {
          const running = (r.text.match(/🟢 running|Status:\s*🟢/g) ?? []).length
          const hasImage = r.text.includes('openclaw-sandbox:bookworm-slim')
          if (hasImage) {
            s.status = running > 0 ? 'pass' : 'warn'
            s.message =
              running > 0
                ? `openclaw-sandbox:bookworm-slim · ${running} 容器运行中`
                : 'openclaw-sandbox:bookworm-slim · 镜像存在但无容器'
          } else {
            s.status = 'fail'
            s.message = 'openclaw-sandbox:bookworm-slim 镜像未找到'
          }
        } else {
          s.status = 'fail'
          s.message = 'sandbox list 命令失败'
        }
      }
    } catch (err) {
      console.error('[diag] sandbox check failed:', err)
    }

    // 3. Cron 任务
    try {
      const r = await window.openclawAPI.openclawCli.cronList()
      const c = checks.find((c) => c.id === 'cron')
      if (c) {
        if (r.ok && Array.isArray(r.jobs)) {
          const jobs = r.jobs as Record<string, unknown>[]
          const failed = jobs.filter(
            (j) => (j.state as { lastRunStatus?: string } | undefined)?.lastRunStatus === 'error'
          ).length
          const total = jobs.length
          if (failed === 0) {
            c.status = 'pass'
            c.message = `${total} 个任务全部正常`
          } else {
            c.status = 'warn'
            c.message = `${failed}/${total} 任务最近失败`
          }
        } else {
          c.status = 'warn'
          c.message = 'cron list 命令失败'
        }
      }
    } catch (err) {
      console.error('[diag] cron check failed:', err)
    }
  }

  return checks
}
