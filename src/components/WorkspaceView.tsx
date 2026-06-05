import { useState, useEffect, useCallback } from 'react'
import { useGatewayStore } from '@renderer/stores/gateway'
import { FolderOpen, File, ChevronRight, RefreshCw, Save, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

interface FileEntry {
  name: string
  path: string
  isDir: boolean
  size?: number
  modified?: string
}

export function WorkspaceView(): React.JSX.Element {
  const { connected } = useGatewayStore()
  const [files, setFiles] = useState<FileEntry[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchFiles = useCallback(async (path?: string): Promise<void> => {
    if (!connected) return
    setLoading(true)
    try {
      const queryPath = path ? `?path=${encodeURIComponent(path)}` : ''
      const res = await window.openclawAPI.gateway.request(`/v1/workspace${queryPath}`)
      if (res.ok && res.data) {
        const data = res.data as { files?: FileEntry[]; path?: string }
        setFiles(data.files ?? [])
        setCurrentPath(data.path ?? path ?? '')
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [connected])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handleClick = async (entry: FileEntry): Promise<void> => {
    if (entry.isDir) {
      fetchFiles(entry.path)
    } else {
      try {
        const res = await window.openclawAPI.gateway.request(
          `/v1/workspace/file?path=${encodeURIComponent(entry.path)}`
        )
        if (res.ok && res.data) {
          const data = res.data as { content?: string }
          setEditingFile({ path: entry.path, content: data.content ?? '' })
        }
      } catch {
        toast.error('无法读取文件')
      }
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!editingFile) return
    setSaving(true)
    try {
      const res = await window.openclawAPI.gateway.request('/v1/workspace/file', {
        method: 'PUT',
        body: { path: editingFile.path, content: editingFile.content }
      })
      if (res.ok) {
        toast.success('文件已保存')
      } else {
        toast.error('保存失败')
      }
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = (): void => {
    if (editingFile) {
      setEditingFile(null)
      return
    }
    const parent = currentPath.split('/').slice(0, -1).join('/')
    fetchFiles(parent)
  }

  const pathParts = currentPath.split('/').filter(Boolean)

  if (!connected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <FolderOpen size={48} className="text-[var(--text-tertiary)]" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">工作空间</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            请先连接 Gateway 以浏览工作空间文件。
          </p>
        </div>
      </div>
    )
  }

  if (editingFile) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] p-3">
          <button
            onClick={handleBack}
            className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 truncate text-sm text-[var(--text-secondary)]">
            {editingFile.path}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)] disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
        <textarea
          value={editingFile.content}
          onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
          className="flex-1 resize-none bg-[var(--bg-base)] p-4 font-mono text-sm text-[var(--text-primary)] outline-none"
          spellCheck={false}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-tertiary)]">
        <button
          onClick={handleBack}
          disabled={!currentPath}
          className="rounded p-1 hover:text-[var(--text-primary)] disabled:opacity-30"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={() => fetchFiles('')}
          className="rounded px-1 py-0.5 hover:text-[var(--text-primary)]"
        >
          workspace
        </button>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight size={10} />
            <button
              onClick={() => fetchFiles(pathParts.slice(0, i + 1).join('/'))}
              className="rounded px-1 py-0.5 hover:text-[var(--text-primary)]"
            >
              {part}
            </button>
          </span>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => fetchFiles(currentPath)}
          disabled={loading}
          className="rounded p-1 hover:text-[var(--text-primary)]"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
            <FolderOpen size={32} className="mb-2" />
            <p className="text-sm">{loading ? '加载中...' : '空目录'}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {files
              .sort((a, b) => {
                if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
                return a.name.localeCompare(b.name)
              })
              .map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => handleClick(entry)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--bg-overlay)]"
                >
                  {entry.isDir ? (
                    <FolderOpen size={14} className="shrink-0 text-[var(--accent-primary)]" />
                  ) : (
                    <File size={14} className="shrink-0 text-[var(--text-tertiary)]" />
                  )}
                  <span className="flex-1 truncate text-[var(--text-primary)]">{entry.name}</span>
                  {entry.size !== undefined && !entry.isDir && (
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {formatSize(entry.size)}
                    </span>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
