import { create } from 'zustand'
import { gatewayRequest } from '@renderer/lib/gateway-client'

interface Memo {
  id: string
  content: string
  created_at: string
  updated_at: string
  tags?: string[]
}

interface FileEntry {
  name: string
  path: string
  isDir: boolean
  size?: number
  modified?: string
}

interface SidebarStats {
  memoCount: number
  fileCount: number
  loading: boolean
  lastFetched: number

  refresh: () => Promise<void>
}

export const useSidebarStats = create<SidebarStats>((set, get) => ({
  memoCount: 0,
  fileCount: 0,
  loading: false,
  lastFetched: 0,

  refresh: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const [memoRes, wsRes] = await Promise.all([
        gatewayRequest('/v1/memos'),
        gatewayRequest('/v1/workspace')
      ])

      let memoCount = 0
      if (memoRes.ok && memoRes.data) {
        const data = memoRes.data as { memos?: Memo[] } | Memo[]
        const list = Array.isArray(data) ? data : (data.memos ?? [])
        memoCount = list.length
      }

      let fileCount = 0
      if (wsRes.ok && wsRes.data) {
        const data = wsRes.data as { files?: FileEntry[] }
        const list = data.files ?? []
        fileCount = list.filter((f) => !f.isDir).length
      }

      set({ memoCount, fileCount, lastFetched: Date.now() })
    } catch {
      // keep previous values on error
    } finally {
      set({ loading: false })
    }
  }
}))
