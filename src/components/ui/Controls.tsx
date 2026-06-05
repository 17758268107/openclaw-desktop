import { useRef, useState, useEffect, type ReactNode } from 'react'

/**
 * 通用滑动开关 (Switch)
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  description
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  label?: string
  description?: string
}): React.JSX.Element {
  const w = size === 'sm' ? 'w-8' : 'w-10'
  const h = size === 'sm' ? 'h-4' : 'h-5'
  const dot = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const offset = size === 'sm' ? 'left-[16px]' : 'left-[18px]'

  return (
    <label
      className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      {label && (
        <div className="min-w-0 flex-1">
          <div className="text-sm text-[var(--text-secondary)]">{label}</div>
          {description && (
            <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{description}</div>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative ${w} ${h} shrink-0 rounded-full border transition-colors ${
          checked
            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/20'
            : 'border-[var(--border-subtle)] bg-[var(--bg-overlay)]'
        }`}
      >
        <span
          className={`absolute top-0.5 ${dot} rounded-full transition-all ${
            checked ? `${offset} bg-[var(--accent-primary)]` : 'left-0.5 bg-[var(--text-tertiary)]'
          }`}
        />
      </button>
    </label>
  )
}

/**
 * 滑块
 */
export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  unit,
  marks
}: {
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  label?: string
  unit?: string
  marks?: Array<{ value: number; label: string }>
}): React.JSX.Element {
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">{label}</span>
          <span className="font-mono text-[var(--text-primary)]">
            {value}
            {unit ?? ''}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--bg-overlay)] accent-[var(--accent-primary)]"
        style={{
          background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${
            ((value - min) / (max - min)) * 100
          }%, var(--bg-overlay) ${
            ((value - min) / (max - min)) * 100
          }%, var(--bg-overlay) 100%)`
        }}
      />
      {marks && (
        <div className="mt-1.5 flex justify-between text-[9px] text-[var(--text-tertiary)]">
          {marks.map((m) => (
            <span key={m.value}>{m.label}</span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 单选按钮组
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'md'
}: {
  value: T
  options: Array<{ value: T; label: string; icon?: ReactNode }>
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}): React.JSX.Element {
  const pad = size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
  return (
    <div className="inline-flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 rounded font-medium transition-colors ${pad} ${
            value === opt.value
              ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/**
 * 通用下拉选择
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  size = 'md'
}: {
  value: T
  options: Array<{ value: T; label: string; icon?: ReactNode; description?: string }>
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] transition-colors hover:border-[var(--accent-primary)]/40 ${
          size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
        }`}
      >
        <span className="flex items-center gap-1.5">
          {current?.icon}
          <span className="text-[var(--text-primary)]">{current?.label}</span>
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`text-[var(--text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4 L5 7 L8 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-1 shadow-xl animate-fade-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`flex w-full items-start gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                value === opt.value
                  ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
              }`}
            >
              {opt.icon && <span className="mt-0.5">{opt.icon}</span>}
              <div className="min-w-0 flex-1">
                <div className="truncate">{opt.label}</div>
                {opt.description && (
                  <div className="truncate text-[10px] text-[var(--text-tertiary)]">
                    {opt.description}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Tabs 选项卡
 */
export function Tabs<T extends string>({
  value,
  tabs,
  onChange,
  size = 'md',
  variant = 'underline'
}: {
  value: T
  tabs: Array<{ value: T; label: string; icon?: ReactNode; badge?: number | string }>
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  variant?: 'underline' | 'pill'
}): React.JSX.Element {
  if (variant === 'pill') {
    return (
      <div className="inline-flex gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              value === t.value
                ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && (
              <span className="rounded-full bg-[var(--bg-overlay)]/30 px-1.5 py-0.5 text-[9px]">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className="flex gap-1 border-b border-[var(--border-subtle)]">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`relative flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            size === 'sm' ? 'text-xs' : 'text-sm'
          } ${
            value === t.value
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {t.icon}
          {t.label}
          {t.badge !== undefined && (
            <span className="rounded-full bg-[var(--bg-overlay)] px-1.5 py-0.5 text-[9px]">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * 标签 (Tag) 组件
 */
export function Tag({
  children,
  variant = 'default',
  onRemove,
  size = 'sm'
}: {
  children: ReactNode
  variant?: 'default' | 'accent' | 'success' | 'danger' | 'warning'
  onRemove?: () => void
  size?: 'sm' | 'md'
}): React.JSX.Element {
  const colors: Record<NonNullable<typeof variant>, string> = {
    default: 'bg-[var(--bg-overlay)] text-[var(--text-secondary)]',
    accent: 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]',
    success: 'bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)]',
    danger: 'bg-[var(--danger)]/15 text-[var(--danger)]',
    warning: 'bg-[var(--accent-warning,#f59e0b)]/15 text-[var(--accent-warning,#f59e0b)]'
  }
  const sizeCls = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${colors[variant]} ${sizeCls}`}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded-full hover:bg-white/10"
          title="移除"
        >
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M1 1 L7 7 M7 1 L1 7" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      )}
    </span>
  )
}

/**
 * 空状态组件
 */
export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-overlay)] text-[var(--text-tertiary)]">
        {icon}
      </div>
      <h3 className="text-base font-medium text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--text-tertiary)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * 进度条
 */
export function Progress({
  value,
  max = 100,
  variant = 'accent',
  size = 'sm',
  showLabel = false
}: {
  value: number
  max?: number
  variant?: 'accent' | 'success' | 'warning' | 'danger'
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
}): React.JSX.Element {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const colors: Record<NonNullable<typeof variant>, string> = {
    accent: 'bg-[var(--accent-primary)]',
    success: 'bg-[var(--accent-secondary)]',
    warning: 'bg-[var(--accent-warning,#f59e0b)]',
    danger: 'bg-[var(--danger)]'
  }
  const heights: Record<NonNullable<typeof size>, string> = {
    xs: 'h-0.5',
    sm: 'h-1',
    md: 'h-2'
  }
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 overflow-hidden rounded-full bg-[var(--bg-overlay)] ${heights[size]}`}>
        <div
          className={`h-full ${colors[variant]} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] tabular-nums text-[var(--text-tertiary)]">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}

/**
 * Input 输入框
 */
export function Input({
  value,
  onChange,
  placeholder,
  className = '',
  type = 'text',
  disabled = false
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  type?: string
  disabled?: boolean
}): React.JSX.Element {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-colors focus:border-[var(--accent-primary)] disabled:opacity-50 ${className}`}
    />
  )
}

/**
 * Tooltip 简易版
 */
export function Tooltip({
  content,
  children,
  side = 'top'
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}): React.JSX.Element {
  const sides: Record<NonNullable<typeof side>, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5'
  }
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        className={`pointer-events-none absolute z-30 whitespace-nowrap rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-[10px] text-[var(--text-primary)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${sides[side]}`}
      >
        {content}
      </span>
    </span>
  )
}