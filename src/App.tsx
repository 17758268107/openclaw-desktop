import { useState, useEffect, useMemo } from 'react'
import { Toaster, toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import i18n from '@renderer/lib/i18n'
import { SessionList } from '@renderer/components/SessionList'
import { ChatArea } from '@renderer/components/ChatArea'
import { MemoryView } from '@renderer/components/MemoryView'
import { WorkspaceView } from '@renderer/components/WorkspaceView'
import { GatewayPanel } from '@renderer/components/GatewayPanel'
import { CommandPalette, type CommandItem } from '@renderer/components/CommandPalette'
import { PluginsView } from '@renderer/views/PluginsView'
import { SkillsView } from '@renderer/views/SkillsView'
import { MarketplaceView } from '@renderer/views/MarketplaceView'
import { BackupView } from '@renderer/views/BackupView'
import { TelemetryView } from '@renderer/views/TelemetryView'
import { CronView } from '@renderer/views/CronView'
import { DiagnosticsView } from '@renderer/views/DiagnosticsView'
import { useGatewayStore } from '@renderer/stores/gateway'
import { useChatStore } from '@renderer/stores/chat'
import { useAppearanceStore } from '@renderer/stores/appearance'
import { useSidebarStats } from '@renderer/stores/sidebar-stats'
import { useChatPrefsStore } from '@renderer/stores/chat-prefs'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  MessageSquare,
  FolderOpen,
  Brain,
  Palette,
  Keyboard,
  Globe,
  Info,
  Moon,
  Sun,
  Monitor,
  Server,
  Plus,
  Trash2,
  Search,
  Command as CommandIcon,
  Zap,
  Puzzle,
  Store,
  Database,
  Activity,
  Calendar,
  Stethoscope,
  Clock
} from 'lucide-react'

type StartupScreen = 'splash' | 'welcome' | 'setup' | 'main'
type MainView =
  | 'chat'
  | 'memory'
  | 'workspace'
  | 'settings'
  | 'gateway'
  | 'plugins'
  | 'skills'
  | 'marketplace'
  | 'backup'
  | 'telemetry'
  | 'cron'
  | 'diagnostics'

function SplashScreen({ onComplete: _onComplete }: { onComplete: () => void }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[var(--bg-base)]">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="text-6xl">🦞</div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          OpenClaw Desktop
        </h1>
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-breathe" />
          <div
            className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-breathe"
            style={{ animationDelay: '0.3s' }}
          />
          <div
            className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-breathe"
            style={{ animationDelay: '0.6s' }}
          />
        </div>
      </div>
    </div>
  )
}

function WelcomeScreen({ onStart }: { onStart: () => void }): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[var(--bg-base)]">
      <div className="flex max-w-lg flex-col items-center gap-8 px-6 animate-fade-in">
        <div className="text-7xl">🦞</div>
        <h1 className="text-center text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          欢迎使用 OpenClaw Desktop
        </h1>
        <p className="text-center text-lg leading-relaxed text-[var(--text-secondary)]">
          将 OpenClaw AI Agent 的全部能力收口进一个桌面工作台。
          <br />
          多 Agent 对话、记忆、技能、插件——全部在你手中。
        </p>
        <button
          onClick={onStart}
          className="rounded-md bg-[var(--accent-primary)] px-8 py-3 text-sm font-semibold text-[var(--bg-base)] transition-colors hover:bg-[var(--accent-glow)]"
        >
          开始设置
        </button>
      </div>
    </div>
  )
}

function SetupScreen({ onComplete }: { onComplete: () => void }): React.JSX.Element {
  const [step, setStep] = useState(0)
  const [gatewayUrl, setGatewayUrl] = useState('http://127.0.0.1:18789')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [healthData, setHealthData] = useState<{
    version?: string
    agents?: unknown[]
    plugins?: unknown[]
  } | null>(null)

  const testConnection = async (): Promise<void> => {
    setTesting(true)
    setTestResult(null)
    try {
      await window.openclawAPI.settings.set('gateway', {
        mode: 'local',
        url: gatewayUrl,
        tokenSecretRef: ''
      })
      await window.openclawAPI.gateway.updateUrl(gatewayUrl)
      const health = await window.openclawAPI.gateway.health()
      setTestResult(health.ok ? 'ok' : 'fail')
      if (health.ok) setHealthData(health as { version?: string; agents?: unknown[]; plugins?: unknown[] })
    } catch (err) {
      console.error('[setup] testConnection failed:', err)
      setTestResult('fail')
    } finally {
      setTesting(false)
    }
  }

  const finish = async (): Promise<void> => {
    await window.openclawAPI.settings.set('setupComplete', true)
    onComplete()
  }

  const steps = [
    {
      title: '连接 Gateway',
      content: (
        <div className="flex flex-col gap-4">
          <label className="text-sm text-[var(--text-secondary)]">Gateway 地址</label>
          <input
            type="text"
            value={gatewayUrl}
            onChange={(e) => setGatewayUrl(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-4 py-3 text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-primary)]"
            placeholder="http://127.0.0.1:18789"
          />
          <button
            onClick={testConnection}
            disabled={testing}
            className="rounded-md border border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
          {testResult === 'ok' && (
            <div className="rounded-lg border border-[var(--accent-secondary)]/20 bg-[var(--accent-secondary)]/5 p-3">
              <div className="text-sm text-[var(--accent-secondary)]">✓ 连接成功</div>
              {healthData && (
                <div className="mt-2 text-xs text-[var(--text-tertiary)]">
                  {healthData.version && <span>版本: {healthData.version} · </span>}
                  {healthData.agents && <span>Agents: {healthData.agents.length} · </span>}
                  {healthData.plugins && <span>插件: {healthData.plugins.length}</span>}
                </div>
              )}
            </div>
          )}
          {testResult === 'fail' && (
            <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-3">
              <div className="text-sm text-[var(--danger)]">✗ 连接失败，请检查 Gateway 是否运行</div>
              <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                {`已尝试: ${gatewayUrl}/health`}
              </div>
              <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                提示：可在终端运行 <code className="rounded bg-[var(--bg-overlay)] px-1 py-0.5">openclaw status</code> 确认 Gateway 是否在 18789 端口运行。
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      title: '完成设置',
      content: (
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl">🎉</div>
          <p className="text-[var(--text-secondary)]">一切准备就绪！点击完成开始使用。</p>
        </div>
      )
    }
  ]

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[var(--bg-base)]">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-8 rounded-full transition-colors ${
                i <= step ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-subtle)]'
              }`}
            />
          ))}
        </div>
        <h2 className="mb-6 text-center text-xl font-semibold text-[var(--text-primary)]">
          {steps[step].title}
        </h2>
        {steps[step].content}
        <div className="mt-8 flex justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="rounded-md px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              上一步
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={step < steps.length - 1 ? () => setStep(step + 1) : finish}
            disabled={step === 0 && testResult !== 'ok'}
            className="rounded-md bg-[var(--accent-primary)] px-6 py-2 text-sm font-semibold text-[var(--bg-base)] transition-colors hover:bg-[var(--accent-glow)] disabled:opacity-40"
          >
            {step < steps.length - 1 ? '下一步' : '完成'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TopBar(): React.JSX.Element {
  const { status, connected, checkHealth, version } = useGatewayStore()
  const { agents, activeAgentId, setActiveAgent, sessions } = useChatStore()
  const [agentMenuOpen, setAgentMenuOpen] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const handleRefresh = async (): Promise<void> => {
    await checkHealth()
    toast.success('连接状态已刷新')
  }

  const activeAgent = agents.find((a) => a.id === activeAgentId)

  return (
    <div className="titlebar-drag glass flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setAgentMenuOpen(!agentMenuOpen)}
            className="flex items-center gap-1.5 rounded-md bg-[var(--bg-overlay)]/80 px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
          >
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-secondary)]" />
            {activeAgent?.name ?? activeAgentId}
            <ChevronDown size={12} />
          </button>
          {agentMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAgentMenuOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-1 shadow-xl animate-fade-in">
                <div className="border-b border-[var(--border-subtle)] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  切换 Agent
                </div>
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setActiveAgent(agent.id)
                      setAgentMenuOpen(false)
                      toast.success(`已切换到 ${agent.name}`)
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                      agent.id === activeAgentId
                        ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-[var(--accent-secondary)]" />
                    <span className="font-medium">{agent.name}</span>
                    {agent.description && (
                      <span className="ml-auto truncate text-[10px] text-[var(--text-tertiary)]">
                        {agent.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {version && (
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/50 px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
            v{version}
          </span>
        )}

        <div className="hidden items-center gap-2 md:flex">
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
            <Brain size={10} />
            {sessions.length} 会话
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">·</span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
            <Clock size={10} />
            {new Date(now).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <kbd className="hidden items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/60 px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] md:flex">
          <CommandIcon size={9} /> K
        </kbd>
        <button
          onClick={handleRefresh}
          className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          title="刷新连接"
        >
          <RefreshCw size={14} className={status === 'checking' ? 'animate-spin' : ''} />
        </button>
        <div
          className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] ${
            connected
              ? 'border-[var(--accent-secondary)]/30 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]'
              : 'border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]'
          }`}
        >
          {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
          <span>{connected ? '已连接' : '未连接'}</span>
        </div>
      </div>
    </div>
  )
}

function SettingsView(): React.JSX.Element {
  const { url, setUrl, checkHealth } = useGatewayStore()
  const { theme, setTheme, accentColor, setAccentColor, fontSize, setFontSize } = useAppearanceStore()
  const { showMessageTimestamps, setShowMessageTimestamps, compactMessages, setCompactMessages, showTokenEstimate, setShowTokenEstimate, agentMentionEnabled, setAgentMentionEnabled } = useChatPrefsStore()
  const [gatewayInput, setGatewayInput] = useState(url || 'http://127.0.0.1:18789')
  const [saved, setSaved] = useState(false)
  const [language, setLanguage] = useState(i18n.language)
  const [proxy, setProxy] = useState({ enabled: false, server: '', bypass: 'localhost,127.0.0.1' })
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [minimizeToTray, setMinimizeToTray] = useState(true)
  const [launchAtStartup, setLaunchAtStartup] = useState(false)
  const [shortcut, setShortcut] = useState('CommandOrControl+Shift+Space')
  const [recordingShortcut, setRecordingShortcut] = useState(false)

  const handleLanguageChange = (lng: string): void => {
    setLanguage(lng)
    i18n.changeLanguage(lng)
  }

  const handleSave = async (): Promise<void> => {
    setUrl(gatewayInput)
    await window.openclawAPI.settings.set('gateway', {
      mode: 'local',
      url: gatewayInput,
      tokenSecretRef: ''
    })
    await checkHealth()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    toast.success('Gateway 地址已更新')
  }

  const handleProxySave = async (): Promise<void> => {
    await window.openclawAPI.settings.set('proxy', proxy)
    toast.success('代理设置已保存')
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-8">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="mb-6 text-xl font-semibold text-[var(--text-primary)]">设置</h2>

        <div className="space-y-6">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Wifi size={14} />
              连接
            </h3>
            <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4">
              <label className="text-xs text-[var(--text-tertiary)]">Gateway 地址</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gatewayInput}
                  onChange={(e) => setGatewayInput(e.target.value)}
                  className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
                <button
                  onClick={handleSave}
                  className="rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)]"
                >
                  {saved ? '已保存' : '保存'}
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                修改后点击保存将立即重连 Gateway
              </p>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Palette size={14} />
              外观
            </h3>
            <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4">
              <div>
                <label className="text-xs text-[var(--text-tertiary)]">主题</label>
                <div className="mt-1.5 flex gap-2">
                  {[
                    { value: 'dark' as const, icon: <Moon size={14} />, label: '深色' },
                    { value: 'light' as const, icon: <Sun size={14} />, label: '浅色' },
                    { value: 'system' as const, icon: <Monitor size={14} />, label: '跟随系统' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                        theme === opt.value
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                          : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)]">主色</label>
                <div className="mt-1.5 flex gap-1.5">
                  {[
                    { value: 'amber', color: '#F59E0B' },
                    { value: 'teal', color: '#14B8A6' },
                    { value: 'blue', color: '#3B82F6' },
                    { value: 'purple', color: '#A855F7' },
                    { value: 'pink', color: '#EC4899' },
                    { value: 'green', color: '#22C55E' }
                  ].map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setAccentColor?.(c.value)}
                      className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                        accentColor === c.value
                          ? 'border-white shadow-lg'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.value}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)]">字体大小</label>
                <div className="mt-1.5 flex gap-2">
                  {[
                    { value: 'sm', label: '小' },
                    { value: 'md', label: '中' },
                    { value: 'lg', label: '大' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFontSize(opt.value as 'sm' | 'md' | 'lg')}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                        fontSize === opt.value
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                          : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Globe size={14} />
              语言
            </h3>
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
                <option value="ja-JP">日本語</option>
              </select>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Globe size={14} />
              代理
            </h3>
            <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4">
              <ToggleRow
                label="启用代理"
                description="通过 HTTP/HTTPS 代理访问 Gateway"
                value={proxy.enabled}
                onChange={(v) => setProxy((p) => ({ ...p, enabled: v }))}
              />
              <input
                type="text"
                placeholder="http://127.0.0.1:7890"
                value={proxy.server}
                onChange={(e) => setProxy((p) => ({ ...p, server: e.target.value }))}
                disabled={!proxy.enabled}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
              />
              <input
                type="text"
                placeholder="绕过: localhost,127.0.0.1"
                value={proxy.bypass}
                onChange={(e) => setProxy((p) => ({ ...p, bypass: e.target.value }))}
                disabled={!proxy.enabled}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
              />
              <button
                onClick={handleProxySave}
                className="rounded-md bg-[var(--accent-primary)] px-4 py-1.5 text-sm font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)]"
              >
                保存代理
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Zap size={14} />
              系统
            </h3>
            <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4">
              <ToggleRow
                label="开机自启"
                description="系统启动时自动运行 OpenClaw"
                value={launchAtStartup}
                onChange={setLaunchAtStartup}
              />
              <ToggleRow
                label="最小化到托盘"
                description="关闭窗口时不退出，仅最小化到系统托盘"
                value={minimizeToTray}
                onChange={setMinimizeToTray}
              />
              <ToggleRow
                label="自动检查更新"
                description="发现新版本时下载并提示安装"
                value={autoUpdate}
                onChange={setAutoUpdate}
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Keyboard size={14} />
              快捷键
            </h3>
            <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4 text-sm">
              <ShortcutRow label="命令面板" keys={['Ctrl', 'K']} />
              <ShortcutRow label="消息内搜索" keys={['Ctrl', 'F']} />
              <ShortcutRow label="发送消息" keys={['Enter']} />
              <ShortcutRow label="换行" keys={['Shift', 'Enter']} />
              <ShortcutRow label="新会话" keys={['Ctrl', 'N']} />
              <ShortcutRow label="切换 Agent" keys={['@agent']} />
              <ShortcutRow label="技能命令" keys={['/skill']} />
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
                <span className="text-[var(--text-secondary)]">显示/隐藏窗口</span>
                {recordingShortcut ? (
                  <input
                    autoFocus
                    value={shortcut}
                    onChange={(e) => setShortcut(e.target.value)}
                    onBlur={() => setRecordingShortcut(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setRecordingShortcut(false)
                    }}
                    className="w-48 rounded border border-[var(--accent-primary)] bg-[var(--bg-elevated)] px-2 py-1 text-center font-mono text-xs text-[var(--text-primary)] outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setRecordingShortcut(true)}
                    className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-xs text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50"
                  >
                    {shortcut}
                  </button>
                )}
              </div>
              <ShortcutRow label="关闭弹窗" keys={['Esc']} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Zap size={14} />
              消息
            </h3>
            <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4">
              <ToggleRow
                label="显示消息时间戳"
                description="在每条消息前显示发送时间"
                value={showMessageTimestamps}
                onChange={setShowMessageTimestamps}
              />
              <ToggleRow
                label="消息密度: 紧凑"
                description="减小消息间距，显示更多内容"
                value={compactMessages}
                onChange={setCompactMessages}
              />
              <ToggleRow
                label="输入时显示 Token 估算"
                description="实时显示当前输入的 Token 用量"
                value={showTokenEstimate}
                onChange={setShowTokenEstimate}
              />
              <ToggleRow
                label="发送时检查 Agent 提及"
                description="自动高亮 @agent 提及并展开菜单"
                value={agentMentionEnabled}
                onChange={setAgentMentionEnabled}
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Info size={14} />
              关于
            </h3>
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4 text-sm text-[var(--text-secondary)]">
              <div className="flex justify-between py-1">
                <span>版本</span>
                <span className="text-[var(--text-tertiary)]">2026.6.1</span>
              </div>
              <div className="flex justify-between py-1">
                <span>框架</span>
                <span className="text-[var(--text-tertiary)]">Tauri + Rust + React + Vite</span>
              </div>
              <div className="flex justify-between py-1">
                <span>项目</span>
                <button
                  onClick={() =>
                    window.openclawAPI.shell.openExternal(
                      'https://github.com/17758268107/openclaw-desktop'
                    )
                  }
                  className="text-[var(--accent-primary)] hover:underline"
                >
                  GitHub
                </button>
              </div>
              <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                <button
                  onClick={async () => {
                    if (window.confirm('确定要重置所有设置吗？此操作不可撤销。')) {
                      await window.openclawAPI.settings.reset()
                      toast.success('设置已重置')
                      setTimeout(() => window.location.reload(), 1000)
                    }
                  }}
                  className="text-xs text-[var(--danger)] hover:underline"
                >
                  重置所有设置
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-[var(--text-tertiary)]">+</span>}
            <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-1.5 py-0.5 text-xs text-[var(--text-tertiary)]">
              {k}
            </kbd>
          </span>
        ))}
      </span>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  value,
  onChange
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
}): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-[var(--text-secondary)]">{label}</div>
        {description && (
          <div className="text-[10px] text-[var(--text-tertiary)]">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
          value
            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/20'
            : 'border-[var(--border-subtle)] bg-[var(--bg-overlay)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
            value
              ? 'left-[18px] bg-[var(--accent-primary)]'
              : 'left-0.5 bg-[var(--text-tertiary)]'
          }`}
        />
      </button>
    </label>
  )
}

function NavButton({
  icon,
  label,
  active,
  collapsed,
  count,
  onClick
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  collapsed: boolean
  count?: number
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-[var(--bg-overlay)] text-[var(--accent-primary)]'
          : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
      }`}
      title={label}
    >
      {icon}
      {!collapsed && <span className="flex-1 truncate text-left">{label}</span>}
      {!collapsed && typeof count === 'number' && count > 0 && (
        <span
          className={`min-w-[18px] rounded-full px-1.5 text-center text-[10px] font-medium tabular-nums ${
            active
              ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]'
              : 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)]'
          }`}
        >
          {count > 999 ? '999+' : count}
        </span>
      )}
    </button>
  )
}

function MainScreen(): React.JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [view, setView] = useState<MainView>('chat')
  const [cmdOpen, setCmdOpen] = useState(false)
  const { checkHealth, setUrl, connected, status } = useGatewayStore()
  const { init: initAppearance } = useAppearanceStore()
  const { sessions, activeSessionId, createSession, agents, activeAgentId, setActiveAgent, deleteSession } = useChatStore()
  const { memoCount, fileCount, refresh: refreshSidebarStats } = useSidebarStats()
  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const activeMessageCount = activeSession?.messages.length ?? 0

  useEffect(() => {
    initAppearance()
  }, [initAppearance])

  useEffect(() => {
    const initGateway = async (): Promise<void> => {
      try {
        const settings = await window.openclawAPI.settings.getAll()
        const gw = settings.gateway as { url?: string } | undefined
        if (gw?.url) {
          setUrl(gw.url)
        }
      } catch {
        // use defaults
      }
      await checkHealth()
    }
    initGateway()

    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [checkHealth, setUrl])

  useEffect(() => {
    if (!connected) return
    refreshSidebarStats()
  }, [connected, refreshSidebarStats])

  // 同步网关状态到托盘菜单
  useEffect(() => {
    const trayStatus: 'connected' | 'disconnected' | 'checking' = connected
      ? 'connected'
      : status === 'checking'
      ? 'checking'
      : 'disconnected'
    window.openclawAPI?.tray?.updateStatus?.(trayStatus)
  }, [connected, status])

  // 全局快捷键: Cmd/Ctrl + K 打开命令面板
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      {
        id: 'view.chat',
        group: '视图',
        label: '切换到对话',
        icon: <MessageSquare size={14} />,
        action: () => setView('chat')
      },
      {
        id: 'view.memory',
        group: '视图',
        label: '切换到记忆',
        icon: <Brain size={14} />,
        action: () => setView('memory')
      },
      {
        id: 'view.workspace',
        group: '视图',
        label: '切换到工作空间',
        icon: <FolderOpen size={14} />,
        action: () => setView('workspace')
      },
      {
        id: 'view.gateway',
        group: '视图',
        label: '切换到网关',
        icon: <Server size={14} />,
        action: () => setView('gateway')
      },
      {
        id: 'view.plugins',
        group: '视图',
        label: '切换到插件',
        icon: <Puzzle size={14} />,
        action: () => setView('plugins')
      },
      {
        id: 'view.skills',
        group: '视图',
        label: '切换到技能',
        icon: <Zap size={14} />,
        action: () => setView('skills')
      },
      {
        id: 'view.marketplace',
        group: '视图',
        label: '切换到插件市场',
        icon: <Store size={14} />,
        action: () => setView('marketplace')
      },
      {
        id: 'view.backup',
        group: '视图',
        label: '切换到备份',
        icon: <Database size={14} />,
        action: () => setView('backup')
      },
      {
        id: 'view.cron',
        group: '视图',
        label: '切换到定时任务',
        icon: <Calendar size={14} />,
        action: () => setView('cron')
      },
      {
        id: 'view.telemetry',
        group: '视图',
        label: '切换到性能监控',
        icon: <Activity size={14} />,
        action: () => setView('telemetry')
      },
      {
        id: 'view.diagnostics',
        group: '视图',
        label: '切换到诊断',
        icon: <Stethoscope size={14} />,
        action: () => setView('diagnostics')
      },
      {
        id: 'view.settings',
        group: '视图',
        label: '切换到设置',
        icon: <Settings size={14} />,
        shortcut: ['Ctrl', ','],
        action: () => setView('settings')
      },
      {
        id: 'session.new',
        group: '会话',
        label: '新建会话',
        icon: <Plus size={14} />,
        shortcut: ['Ctrl', 'N'],
        action: () => {
          createSession()
          setView('chat')
          toast.success('新会话已创建')
        }
      },
      {
        id: 'session.delete',
        group: '会话',
        label: '删除当前会话',
        icon: <Trash2 size={14} />,
        action: () => {
          if (activeSessionId) {
            deleteSession(activeSessionId)
            toast.success('会话已删除')
          }
        }
      },
      {
        id: 'backup.now',
        group: '操作',
        label: '立即创建备份',
        icon: <Database size={14} />,
        action: () => toast.success('备份已启动')
      },
      {
        id: 'sidebar.toggle',
        group: '界面',
        label: sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏',
        icon: sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />,
        action: () => setSidebarCollapsed((v) => !v)
      },
      {
        id: 'gateway.refresh',
        group: '网关',
        label: '刷新连接状态',
        icon: <RefreshCw size={14} />,
        action: async () => {
          await checkHealth()
          toast.success('连接状态已刷新')
        }
      }
    ]
    agents.forEach((a) => {
      list.push({
        id: `agent.${a.id}`,
        group: 'Agent',
        label: `切换到 Agent: ${a.name}`,
        description: a.description,
        icon: <span className="text-xs">@</span>,
        action: () => {
          setActiveAgent(a.id)
          setView('chat')
          toast.success(`已切换到 ${a.name}`)
        }
      })
    })
    return list
  }, [agents, activeSessionId, sidebarCollapsed, createSession, deleteSession, setActiveAgent, checkHealth])

  return (
    <div className="flex h-full bg-[var(--bg-base)]">
      <aside
        className={`flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)] transition-all duration-200 ${
          sidebarCollapsed ? 'w-[60px]' : 'w-[260px]'
        }`}
      >
        <div className="titlebar-drag flex h-12 shrink-0 items-center justify-between px-3">
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold text-[var(--text-primary)]">🦞 OpenClaw</span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className="px-2 pb-1">
          <button
            onClick={() => setCmdOpen(true)}
            className="flex w-full items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-2.5 py-1.5 text-xs text-[var(--text-tertiary)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-secondary)]"
          >
            <Search size={12} />
            <span className="flex-1 text-left">搜索命令…</span>
            <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-base)] px-1 text-[10px]">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="flex flex-col gap-1 px-2 pb-2">
          <NavButton
            icon={<MessageSquare size={16} />}
            label="对话"
            active={view === 'chat'}
            collapsed={sidebarCollapsed}
            count={activeMessageCount > 0 ? activeMessageCount : sessions.length}
            onClick={() => setView('chat')}
          />
          <NavButton
            icon={<Brain size={16} />}
            label="记忆"
            active={view === 'memory'}
            collapsed={sidebarCollapsed}
            count={memoCount}
            onClick={() => setView('memory')}
          />
          <NavButton
            icon={<FolderOpen size={16} />}
            label="工作空间"
            active={view === 'workspace'}
            collapsed={sidebarCollapsed}
            count={fileCount}
            onClick={() => setView('workspace')}
          />
          <NavButton
            icon={<Server size={16} />}
            label="网关"
            active={view === 'gateway'}
            collapsed={sidebarCollapsed}
            onClick={() => setView('gateway')}
          />
        </div>

        {!sidebarCollapsed && (
          <div className="mx-3 mb-1 mt-2 px-2 text-[9px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
            扩展
          </div>
        )}
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          <NavButton
            icon={<Puzzle size={16} />}
            label="插件"
            active={view === 'plugins'}
            collapsed={sidebarCollapsed}
            onClick={() => setView('plugins')}
          />
          <NavButton
            icon={<Zap size={16} />}
            label="技能"
            active={view === 'skills'}
            collapsed={sidebarCollapsed}
            onClick={() => setView('skills')}
          />
          <NavButton
            icon={<Store size={16} />}
            label="插件市场"
            active={view === 'marketplace'}
            collapsed={sidebarCollapsed}
            onClick={() => setView('marketplace')}
          />
          <NavButton
            icon={<Database size={16} />}
            label="备份"
            active={view === 'backup'}
            collapsed={sidebarCollapsed}
            onClick={() => setView('backup')}
          />
          <NavButton
            icon={<Calendar size={16} />}
            label="定时任务"
            active={view === 'cron'}
            collapsed={sidebarCollapsed}
            onClick={() => setView('cron')}
          />
          <NavButton
            icon={<Activity size={16} />}
            label="性能监控"
            active={view === 'telemetry'}
            collapsed={sidebarCollapsed}
            onClick={() => setView('telemetry')}
          />
          <NavButton
            icon={<Stethoscope size={16} />}
            label="诊断"
            active={view === 'diagnostics'}
            collapsed={sidebarCollapsed}
            onClick={() => setView('diagnostics')}
          />
        </div>

        <div className="mt-auto border-t border-[var(--border-subtle)] px-2 py-2">
          <NavButton
            icon={<Settings size={16} />}
            label="设置"
            active={view === 'settings'}
            collapsed={sidebarCollapsed}
            onClick={() => setView('settings')}
          />
        </div>

        {view === 'chat' && (
          <>
            <div className="mx-2 border-t border-[var(--border-subtle)]" />
            <SessionList collapsed={sidebarCollapsed} />
          </>
        )}
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        {view === 'chat' && <ChatArea />}
        {view === 'memory' && <MemoryView />}
        {view === 'workspace' && <WorkspaceView />}
        {view === 'gateway' && <GatewayPanel />}
        {view === 'settings' && <SettingsView />}
        {view === 'plugins' && <PluginsView />}
        {view === 'skills' && <SkillsView />}
        {view === 'marketplace' && <MarketplaceView />}
        {view === 'backup' && <BackupView />}
        {view === 'telemetry' && <TelemetryView />}
        {view === 'cron' && <CronView />}
        {view === 'diagnostics' && <DiagnosticsView />}
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
    </div>
  )
}

export default function App(): React.JSX.Element {
  const { t } = useTranslation()
  const [screen, setScreen] = useState<StartupScreen>('splash')
  const [checking, setChecking] = useState(true)
  const [minSplashElapsed, setMinSplashElapsed] = useState(false)
  const [dataReady, setDataReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashElapsed(true), 600)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const init = async (): Promise<void> => {
      try {
        const [settings, generalSettings] = await Promise.all([
          window.openclawAPI.settings.getAll(),
          window.openclawAPI.settings.get('general') as Promise<{ language?: string } | null>
        ])

        if (generalSettings?.language && generalSettings.language !== i18n.language) {
          await i18n.changeLanguage(generalSettings.language)
        }

        if (settings.setupComplete) {
          setScreen('main')
        } else {
          setScreen('welcome')
        }
      } catch {
        setScreen('welcome')
      } finally {
        setDataReady(true)
        setChecking(false)
      }
    }
    init()
  }, [])

  if (checking || !minSplashElapsed || !dataReady) {
    return <SplashScreen onComplete={() => undefined} />
  }

  switch (screen) {
    case 'splash':
      return <SplashScreen onComplete={() => setScreen('welcome')} />
    case 'welcome':
      return <WelcomeScreen onStart={() => setScreen('setup')} />
    case 'setup':
      return <SetupScreen onComplete={() => setScreen('main')} />
    case 'main':
      return (
        <>
          <MainScreen />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)'
              }
            }}
          />
        </>
      )
  }
}
