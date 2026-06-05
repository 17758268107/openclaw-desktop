import { useState, useEffect, useMemo } from 'react'
import { Copy, Check, FileCode } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { highlightCode, SUPPORTED_LANGUAGES } from '@renderer/lib/syntax-highlight'

interface CodeBlockProps {
  className?: string
  content: string
}

const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  xml: 'XML',
  yaml: 'YAML',
  markdown: 'Markdown',
  bash: 'Bash',
  shell: 'Shell',
  sql: 'SQL',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  plaintext: 'Plain Text'
}

export function CodeBlock({ className, content }: CodeBlockProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const { t } = useTranslation()
  const language = className?.replace('language-', '') ?? 'plaintext'

  const html = useMemo(() => {
    return highlightCode(content, language)
  }, [content, language])

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isSupported = SUPPORTED_LANGUAGES.includes(language)
  const label = LANGUAGE_LABELS[language] ?? language

  return (
    <div className="group/code relative my-2 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
          <FileCode size={10} />
          <span className="font-mono">{label}</span>
          {!isSupported && (
            <span className="ml-1 text-[9px] text-[var(--text-tertiary)]/60">
              ({t('codeBlock.notHighlighted')})
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover/code:opacity-100"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? t('codeBlock.copied') : t('codeBlock.copy')}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 leading-relaxed">
        <code
          className={`hljs text-xs ${isSupported ? `language-${language}` : ''}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  )
}
