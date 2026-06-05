import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlay?: boolean
  showClose?: boolean
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-3xl',
  full: 'max-w-5xl'
}

/**
 * 通用模态对话框
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
  showClose = true
}: ModalProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal
        className={`relative z-10 w-full ${SIZE_CLASS[size]} rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-2xl animate-fade-in`}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between border-b border-[var(--border-subtle)] px-5 py-3">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{title}</h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{description}</p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="ml-3 rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger = false
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${
              danger
                ? 'bg-[var(--danger)] text-white hover:bg-[var(--danger)]/80'
                : 'bg-[var(--accent-primary)] text-[var(--bg-base)] hover:bg-[var(--accent-glow)]'
            }`}
          >
            {confirmText}
          </button>
        </>
      }
    >
      {description && (
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      )}
    </Modal>
  )
}