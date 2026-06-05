export function isInlineCode(className: string | undefined, code: string): boolean {
  if (className?.startsWith('language-')) return false
  if (code.includes('\n')) return false
  return true
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}
