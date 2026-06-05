import { create } from 'zustand'
import type { Agent, GatewayHealth } from '@renderer/types'

interface GatewayState {
  connected: boolean
  status: 'idle' | 'checking' | 'connected' | 'disconnected'
  health: GatewayHealth | null
  agents: Agent[]
  url: string
  error: string | null
  version: string | null
  uptime: number | null
  checkHealth: () => Promise<void>
  setUrl: (url: string) => void
}

export const useGatewayStore = create<GatewayState>((set, get) => ({
  connected: false,
  status: 'idle',
  health: null,
  agents: [],
  url: '',
  error: null,
  version: null,
  uptime: null,

  checkHealth: async () => {
    const state = get()
    if (state.status === 'checking') return

    set({ status: 'checking', error: null })
    try {
      const result = (await window.openclawAPI.gateway.health()) as
        | { ok: boolean; status?: string; error?: string; url?: string }
        | undefined
      if (result?.ok) {
        set({
          connected: true,
          status: 'connected',
          health: result as unknown as GatewayHealth,
          agents: (result as unknown as GatewayHealth).agents ?? [],
          version: (result as unknown as GatewayHealth).version ?? null,
          uptime: (result as unknown as GatewayHealth).uptime ?? null,
          error: null
        })
      } else {
        const msg =
          result?.status === 'unreachable'
            ? `无法连接 Gateway (${result?.url ?? state.url})`
            : result?.error ?? 'Gateway 不可用'
        set({
          connected: false,
          status: 'disconnected',
          error: msg
        })
      }
    } catch (err) {
      set({
        connected: false,
        status: 'disconnected',
        error: err instanceof Error ? err.message : '连接失败'
      })
    }
  },

  setUrl: (url: string) => {
    set({ url })
    window.openclawAPI.gateway.updateUrl(url)
  }
}))
