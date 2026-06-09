import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary'
import { CopilotKit } from '@copilotkit/react-core'
import App from './App'
import './lib/i18n'
import './styles/globals.css'
import './lib/tauri-api'

// 动态加载 CopilotKit 样式，避免 Tailwind/PostCSS 处理冲突
function loadCopilotKitStyles(): void {
  const styles = [
    '/node_modules/@copilotkit/react-core/dist/v2/index.css',
    '/node_modules/@copilotkit/react-ui/dist/index.css'
  ]
  styles.forEach((href) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  })
}
// 开发环境下直接加载样式，生产环境由构建工具处理
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ((import.meta as any).env?.DEV) {
  loadCopilotKitStyles()
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false
    }
  }
})

// CopilotKit runtime URL - 使用本地 OpenClaw Gateway 作为运行时后端
// 也可以配置为 CopilotKit Cloud: https://cloud.copilotkit.ai
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COPILOT_RUNTIME_URL =
  ((import.meta as any).env?.VITE_COPILOT_RUNTIME_URL as string) ||
  'http://127.0.0.1:18789/v1/chat/completions'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <CopilotKit runtimeUrl={COPILOT_RUNTIME_URL}>
            <App />
          </CopilotKit>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
