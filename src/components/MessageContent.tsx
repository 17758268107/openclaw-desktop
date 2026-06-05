import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from '@renderer/components/CodeBlock'
import { isInlineCode, escapeHtml } from '@renderer/lib/highlight-utils'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'

interface MessageContentProps {
  content: string
  isUser: boolean
}

function TableWithCopy({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const copy = async (): Promise<void> => {
    const text = containerRef.current?.innerText ?? ''
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div
      ref={containerRef}
      className="group relative my-2 overflow-x-auto rounded-md border border-[var(--border-subtle)]"
    >
      <button
        onClick={copy}
        className="absolute right-1 top-1 z-10 hidden rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/90 p-1 text-[var(--text-tertiary)] backdrop-blur group-hover:block hover:text-[var(--text-primary)]"
        title="复制表格"
      >
        {copied ? <Check size={12} className="text-[var(--accent-secondary)]" /> : <Copy size={12} />}
      </button>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  )
}

export function MessageContent({ content, isUser }: MessageContentProps): React.JSX.Element {
  const { t } = useTranslation()
  if (isUser) {
    return <div className="whitespace-pre-wrap break-words">{content}</div>
  }

  return (
    <div className="prose-custom">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const code = String(children).replace(/\n$/, '')
            if (isInlineCode(className, code)) {
              return (
                <code
                  className="rounded bg-[var(--bg-base)]/50 px-1 py-0.5 text-[var(--accent-primary)]"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return <CodeBlock className={className} content={code} />
          },
          pre({ children }) {
            return <>{children}</>
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>
          },
          ul({ children }) {
            return <ul className="mb-2 list-disc pl-4">{children}</ul>
          },
          ol({ children }) {
            return <ol className="mb-2 list-decimal pl-4">{children}</ol>
          },
          li({ children }) {
            return <li className="mb-0.5">{children}</li>
          },
          h1({ children }) {
            return <h1 className="mb-2 mt-3 text-lg font-bold">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="mb-2 mt-3 text-base font-bold">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="mb-1 mt-2 text-sm font-bold">{children}</h3>
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-2 border-l-2 border-[var(--accent-primary)] pl-3 text-[var(--text-secondary)]">
                {children}
              </blockquote>
            )
          },
          a({ href, children }) {
            return (
              <button
                onClick={() => href && window.openclawAPI.shell.openExternal(href)}
                className="text-[var(--accent-primary)] underline decoration-[var(--accent-primary)]/30 hover:decoration-[var(--accent-primary)]"
              >
                {children}
              </button>
            )
          },
          table({ children }) {
            return <TableWithCopy>{children}</TableWithCopy>
          },
          th({ children }) {
            return (
              <th className="border border-[var(--border-subtle)] bg-[var(--bg-overlay)] px-2 py-1 text-left text-xs font-medium">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="border border-[var(--border-subtle)] px-2 py-1 text-xs">{children}</td>
            )
          },
          hr() {
            return <hr className="my-3 border-[var(--border-subtle)]" />
          },
          strong({ children }) {
            return <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>
          },
          img({ src, alt }) {
            return src ? (
              <img
                src={src}
                alt={alt ?? ''}
                className="my-2 max-w-full rounded-lg border border-[var(--border-subtle)]"
                loading="lazy"
              />
            ) : null
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export function useLanguageVersion(): number {
  const { i18n } = useTranslation()
  const [, setVersion] = useState(0)
  useEffect(() => {
    const handler = (): void => setVersion((v) => v + 1)
    i18n.on('languageChanged', handler)
    return () => {
      i18n.off('languageChanged', handler)
    }
  }, [i18n])
  return 0
}

export { escapeHtml }
