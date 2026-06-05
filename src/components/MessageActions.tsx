import { useState } from 'react'
import { Copy, Check, RotateCcw, Pencil } from 'lucide-react'
import { toast } from 'sonner'

interface MessageActionsProps {
  content: string
  isUser: boolean
  onRegenerate?: () => void
  onEdit?: (newContent: string) => void
  streaming: boolean
}

export function MessageActions({
  content,
  isUser,
  onRegenerate,
  onEdit,
  streaming
}: MessageActionsProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(content)

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEdit = (): void => {
    setEditValue(content)
    setEditing(true)
  }

  const handleSaveEdit = (): void => {
    if (editValue.trim() && editValue !== content) {
      onEdit?.(editValue.trim())
    }
    setEditing(false)
  }

  const handleCancelEdit = (): void => {
    setEditing(false)
    setEditValue(content)
  }

  if (streaming) return <></>

  if (editing) {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full rounded-lg border border-[var(--accent-primary)] bg-[var(--bg-overlay)] p-2 text-sm text-[var(--text-primary)] outline-none"
          rows={3}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            className="rounded-md bg-[var(--accent-primary)] px-3 py-1 text-xs font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)]"
          >
            保存并重新发送
          </button>
          <button
            onClick={handleCancelEdit}
            className="rounded-md border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
        title="复制"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        <span>{copied ? '已复制' : '复制'}</span>
      </button>
      {isUser && onEdit && (
        <button
          onClick={handleEdit}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
          title="编辑并重新发送"
        >
          <Pencil size={11} />
          <span>编辑</span>
        </button>
      )}
      {!isUser && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
          title="重新生成"
        >
          <RotateCcw size={11} />
          <span>重新生成</span>
        </button>
      )}
    </div>
  )
}
