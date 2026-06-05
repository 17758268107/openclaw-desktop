import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <AlertTriangle size={48} className="text-[var(--danger)]" />
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">出现错误</h2>
          <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">
            {this.state.error?.message ?? '发生了未知错误'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] hover:bg-[var(--accent-glow)]"
          >
            <RefreshCw size={14} />
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
