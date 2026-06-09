export {}

interface OpenClawAPI {
  app: {
    version(): Promise<string>
    platform(): Promise<NodeJS.Platform>
  }
  gateway: {
    health(): Promise<{ ok: boolean; status: string; [key: string]: unknown }>
    request<T = unknown>(
      path: string,
      init?: { method?: string; body?: unknown; headers?: Record<string, string> }
    ): Promise<{ ok: boolean; data?: T; error?: string }>
    streamUrl(): Promise<string>
    updateUrl(url: string): Promise<void>
    status(): Promise<{ url: string; connected: boolean }>
  }
  settings: {
    get<T = unknown>(key: string): Promise<T>
    set(key: string, value: unknown): Promise<void>
    getAll(): Promise<Record<string, unknown>>
    reset(): Promise<void>
  }
  shell: {
    openExternal(url: string): Promise<void>
    quit(): Promise<void>
  }
  window: {
    toggle(): Promise<void>
    minimize(): Promise<void>
    maximize(): Promise<void>
  }
  tray: {
    updateStatus(status: 'connected' | 'disconnected' | 'checking'): Promise<void>
  }
  shortcuts: {
    register(accelerator: string, action: string): Promise<{ ok: boolean; error?: string }>
    unregister(accelerator: string): Promise<void>
    isRegistered(accelerator: string): Promise<boolean>
  }
  updater: {
    checkForUpdates(): Promise<{ ok: boolean; [key: string]: unknown }>
    downloadUpdate(): Promise<{ ok: boolean; error?: string }>
    installAndRestart(): Promise<{ ok: boolean }>
  }
  openclawCli: {
    cronList(): Promise<{ ok: boolean; jobs: unknown[]; error?: string }>
    cronListText(): Promise<{ ok: boolean; text: string; stderr: string }>
    cronToggle(id: string, enabled: boolean): Promise<{ ok: boolean; error?: string }>
    cronRun(id: string): Promise<{ ok: boolean; error?: string }>
    sandboxList(): Promise<{ ok: boolean; text: string; stderr: string }>
    sandboxExplain(): Promise<{ ok: boolean; text: string; stderr: string }>
  }
  on(channel: string, callback: (...args: unknown[]) => void): () => void
}

declare global {
  interface Window {
    openclawAPI: OpenClawAPI
  }
}

/// <reference types="vite/client" />
