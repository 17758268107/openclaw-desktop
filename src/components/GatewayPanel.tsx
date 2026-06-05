import { useState, useEffect } from 'react'
import { useGatewayStore } from '../stores/gateway'
import { RefreshCw, Server, Activity, Settings, ArrowRight, Download, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

type UpdaterState = {
  checking: boolean
  available: boolean
  downloading: boolean
  downloaded: boolean
  progress: number
  version: string | null
  error: string | null
}

export function GatewayPanel(): React.JSX.Element {
  const { url, connected, checkHealth, status } = useGatewayStore()
  const [updater, setUpdater] = useState<UpdaterState>({
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    progress: 0,
    version: null,
    error: null
  })

  useEffect(() => {
    const unsubscribe = window.openclawAPI.on('updater:checking', () => {
      setUpdater((prev) => ({ ...prev, checking: true }))
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = window.openclawAPI.on('updater:available', (info: any) => {
      setUpdater((prev) => ({
        ...prev,
        checking: false,
        available: true,
        version: info.version || null
      }))
      toast.success(`发现新版本 ${info.version}`)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = window.openclawAPI.on('updater:not-available', () => {
      setUpdater((prev) => ({ ...prev, checking: false, available: false }))
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = window.openclawAPI.on('updater:error', (...args) => {
      const msg = typeof args[0] === 'string' ? args[0] : '更新检查失败'
      setUpdater((prev) => ({ ...prev, checking: false, error: msg }))
      toast.error(`更新检查失败: ${msg}`)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = window.openclawAPI.on('updater:progress', (progress: any) => {
      setUpdater((prev) => ({
        ...prev,
        downloading: true,
        progress: progress.percent || 0
      }))
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = window.openclawAPI.on('updater:downloaded', () => {
      setUpdater((prev) => ({ ...prev, downloading: false, downloaded: true }))
      toast.success('下载完成，点击安装')
    })
    return unsubscribe
  }, [])

  const handleCheckUpdates = async (): Promise<void> => {
    try {
      setUpdater((prev) => ({ ...prev, checking: true, error: null }))
      const result = await window.openclawAPI.updater.checkForUpdates()
      if (!result.ok) {
        setUpdater((prev) => ({ ...prev, checking: false, error: '检查失败' }))
      }
    } catch {
      setUpdater((prev) => ({ ...prev, checking: false, error: '检查失败' }))
    }
  }

  const handleDownload = async (): Promise<void> => {
    try {
      const result = await window.openclawAPI.updater.downloadUpdate()
      if (!result.ok) {
        toast.error('下载失败')
      }
    } catch {
      toast.error('下载失败')
    }
  }

  const handleInstall = async (): Promise<void> => {
    try {
      await window.openclawAPI.updater.installAndRestart()
    } catch {
      toast.error('安装失败')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <div
          className={`p-3 rounded-full ${
            connected ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
          }`}
        >
          <Server size={24} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">网关</h2>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                connected
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              {connected ? '已连接' : '未连接'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{url}</p>
        </div>
        <button
          onClick={checkHealth}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-colors"
        >
          <RefreshCw size={16} />
          刷新
        </button>
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-[var(--text-tertiary)]" />
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">自动更新</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            {updater.checking && <p className="text-sm text-[var(--text-tertiary)]">正在检查...</p>}
            {!updater.checking && !updater.available && <p className="text-sm text-[var(--text-secondary)]">已是最新版本</p>}
            {updater.available && !updater.downloading && !updater.downloaded && <p className="text-sm text-[var(--accent-primary)]">发现新版本 {updater.version}</p>}
            {updater.downloading && (
              <div className="w-full">
                <div className="h-2 w-full bg-[var(--bg-base)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)] transition-all duration-200"
                    style={{ width: `${updater.progress}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{Math.round(updater.progress)}%</p>
              </div>
            )}
            {updater.downloaded && (
              <p className="text-sm text-green-500 flex items-center gap-1">
                <CheckCircle2 size={16} />
                下载完成，点击安装
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!updater.available && (
              <button
                onClick={handleCheckUpdates}
                disabled={updater.checking}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={updater.checking ? 'animate-spin' : ''} />
                检查
              </button>
            )}
            {updater.available && !updater.downloading && !updater.downloaded && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--accent-primary)] text-[var(--bg-base)] hover:bg-[var(--accent-glow)] transition-colors"
              >
                <Download size={16} />
                下载
              </button>
            )}
            {updater.downloaded && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                <ArrowRight size={16} />
                安装并重启
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
