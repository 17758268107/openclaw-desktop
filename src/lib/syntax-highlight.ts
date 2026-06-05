import { escapeHtml } from '@renderer/lib/highlight-utils'

export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'python',
  'rust',
  'go',
  'java',
  'cpp',
  'c',
  'csharp',
  'html',
  'css',
  'json',
  'xml',
  'yaml',
  'markdown',
  'bash',
  'shell',
  'sql',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'plaintext'
]

type TokenRule = { type: string; pattern: RegExp }

const RULES: Record<string, TokenRule[]> = {
  javascript: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /(['"`])(?:\\.|(?!\1)[^\\])*\1/g },
    { type: 'keyword', pattern: /\b(import|export|from|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|this|super|static|async|await|try|catch|finally|throw|typeof|instanceof|void|null|undefined|true|false)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?(e\d+)?\b/gi },
    { type: 'function', pattern: /\b([a-zA-Z_$][\w$]*)\s*\(/g }
  ],
  typescript: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /(['"`])(?:\\.|(?!\1)[^\\])*\1/g },
    { type: 'keyword', pattern: /\b(import|export|from|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|implements|interface|type|enum|public|private|protected|readonly|static|async|await|try|catch|finally|throw|typeof|instanceof|void|null|undefined|true|false|as|in|of|keyof)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?(e\d+)?\b/gi },
    { type: 'function', pattern: /\b([a-zA-Z_$][\w$]*)\s*[<(]/g }
  ],
  jsx: [],
  tsx: [],
  python: [
    { type: 'comment', pattern: /#[^\n]*/g },
    { type: 'string', pattern: /("""[\s\S]*?"""|'''[\s\S]*?'''|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g },
    { type: 'keyword', pattern: /\b(def|class|import|from|as|return|if|elif|else|for|while|break|continue|pass|try|except|finally|raise|with|lambda|yield|async|await|global|nonlocal|is|in|not|and|or|None|True|False|self)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?(e\d+)?\b/gi },
    { type: 'function', pattern: /\b([a-zA-Z_][\w]*)\s*\(/g }
  ],
  rust: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /"(?:\\.|[^"\\])*"/g },
    { type: 'keyword', pattern: /\b(fn|let|mut|const|static|pub|use|mod|struct|enum|trait|impl|for|in|while|loop|if|else|match|return|break|continue|as|where|self|Self|true|false|Option|Result|Vec|String)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?(usize|isize|u32|u64|i32|i64|f32|f64)?\b/gi },
    { type: 'function', pattern: /\b([a-zA-Z_][\w]*)\s*[<(]/g }
  ],
  go: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /"(?:\\.|[^"\\])*"/g },
    { type: 'keyword', pattern: /\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var|true|false|nil)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?\b/gi },
    { type: 'function', pattern: /\b([a-zA-Z_][\w]*)\s*\(/g }
  ],
  java: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /"(?:\\.|[^"\\])*"/g },
    { type: 'keyword', pattern: /\b(public|private|protected|class|interface|enum|extends|implements|static|final|abstract|void|return|if|else|for|while|do|switch|case|break|continue|new|this|super|try|catch|finally|throw|throws|import|package|null|true|false)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?[fFdDlL]?\b/g },
    { type: 'function', pattern: /\b([a-zA-Z_$][\w$]*)\s*\(/g }
  ],
  bash: [
    { type: 'comment', pattern: /#[^\n]*/g },
    { type: 'string', pattern: /(['"])(?:\\.|(?!\1)[^\\])*\1/g },
    { type: 'keyword', pattern: /\b(if|then|else|elif|fi|case|esac|for|in|while|do|done|function|return|exit|export|alias|source|set|unset|shift)\b/g },
    { type: 'number', pattern: /\b\d+\b/g }
  ],
  shell: [],
  json: [
    { type: 'string', pattern: /"(?:\\.|[^"\\])*"/g },
    { type: 'number', pattern: /-?\b\d+(\.\d+)?([eE][+-]?\d+)?\b/g },
    { type: 'literal', pattern: /\b(true|false|null)\b/g }
  ],
  yaml: [
    { type: 'comment', pattern: /#[^\n]*/g },
    { type: 'string', pattern: /(['"])(?:\\.|(?!\1)[^\\])*\1/g },
    { type: 'literal', pattern: /\b(true|false|null|yes|no|on|off)\b/gi }
  ],
  html: [
    { type: 'comment', pattern: /<!--[\s\S]*?-->/g },
    { type: 'tag', pattern: /<\/?[a-zA-Z][\w-]*(\s+[^>]*)?\/?>/g }
  ],
  xml: [
    { type: 'comment', pattern: /<!--[\s\S]*?-->/g },
    { type: 'tag', pattern: /<\/?[a-zA-Z][\w-]*(\s+[^>]*)?\/?>/g }
  ],
  css: [
    { type: 'comment', pattern: /\/\*[\s\S]*?\*\//g },
    { type: 'string', pattern: /(['"])(?:\\.|(?!\1)[^\\])*\1/g },
    { type: 'atrule', pattern: /@[a-zA-Z-]+/g },
    { type: 'number', pattern: /\b-?\d+(\.\d+)?(px|em|rem|%|vh|vw|pt|pc|cm|mm|in)?\b/g },
    { type: 'property', pattern: /([a-zA-Z-]+)\s*:/g }
  ],
  sql: [
    { type: 'comment', pattern: /(--[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /'(?:''|[^'])*'/g },
    { type: 'keyword', pattern: /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MAX|MIN|AND|OR|NOT|NULL|IS|IN|EXISTS|BETWEEN|LIKE|TRUE|FALSE)\b/gi }
  ],
  markdown: [],
  cpp: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /"(?:\\.|[^"\\])*"/g },
    { type: 'keyword', pattern: /\b(int|float|double|char|bool|void|auto|const|static|extern|return|if|else|for|while|do|switch|case|break|continue|new|delete|class|struct|public|private|protected|virtual|override|this|nullptr|true|false|namespace|using|template|typename)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?(u?int|float|double)?\b/gi }
  ],
  c: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /"(?:\\.|[^"\\])*"/g },
    { type: 'keyword', pattern: /\b(int|float|double|char|void|const|static|extern|return|if|else|for|while|do|switch|case|break|continue|struct|union|enum|typedef|sizeof|include|define|NULL)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?(u?int|float|double)?\b/gi }
  ],
  csharp: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /"(?:\\.|[^"\\])*"/g },
    { type: 'keyword', pattern: /\b(public|private|protected|internal|class|interface|struct|enum|void|int|float|double|string|bool|var|const|static|readonly|return|if|else|for|foreach|while|do|switch|case|break|continue|new|this|base|null|true|false|namespace|using|async|await|try|catch|finally|throw|namespace)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?(f|m|u|l)?\b/gi }
  ],
  php: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/g },
    { type: 'string', pattern: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g },
    { type: 'keyword', pattern: /\b(echo|print|if|else|elseif|endif|for|foreach|as|endforeach|while|endwhile|do|function|return|class|interface|extends|implements|public|private|protected|static|var|new|use|namespace|null|true|false)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?\b/gi }
  ],
  ruby: [
    { type: 'comment', pattern: /#[^\n]*/g },
    { type: 'string', pattern: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g },
    { type: 'keyword', pattern: /\b(def|end|class|module|if|elsif|else|unless|case|when|while|until|for|in|do|begin|rescue|ensure|raise|return|yield|require|include|extend|attr_accessor|self|nil|true|false)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?\b/gi }
  ],
  swift: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /"(?:\\.|[^"\\])*"/g },
    { type: 'keyword', pattern: /\b(func|var|let|class|struct|enum|protocol|extension|public|private|internal|fileprivate|static|final|return|if|else|guard|for|in|while|switch|case|default|break|continue|self|Self|init|deinit|nil|true|false|import)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?\b/gi }
  ],
  kotlin: [
    { type: 'comment', pattern: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g },
    { type: 'string', pattern: /"(?:\\.|[^"\\])*"/g },
    { type: 'keyword', pattern: /\b(fun|val|var|class|object|interface|enum|public|private|protected|internal|return|if|else|when|for|while|do|break|continue|this|super|null|true|false|import|package)\b/g },
    { type: 'number', pattern: /\b\d+(\.\d+)?[fLu]?\b/gi }
  ]
}

interface Token {
  type: string
  start: number
  end: number
}

function tokenize(code: string, rules: TokenRule[]): Token[] {
  const tokens: Token[] = []
  for (const rule of rules) {
    rule.pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = rule.pattern.exec(code)) !== null) {
      const start = match.index
      const end = start + match[0].length
      const overlap = tokens.some((t) => start < t.end && end > t.start)
      if (!overlap) {
        tokens.push({ type: rule.type, start, end })
      }
    }
  }
  tokens.sort((a, b) => a.start - b.start)
  return tokens
}

function applyTokens(code: string, tokens: Token[]): string {
  if (tokens.length === 0) return escapeHtml(code)
  let result = ''
  let cursor = 0
  for (const token of tokens) {
    if (token.start > cursor) {
      result += escapeHtml(code.slice(cursor, token.start))
    }
    const content = code.slice(token.start, token.end)
    result += `<span class="hljs-${token.type}">${escapeHtml(content)}</span>`
    cursor = token.end
  }
  if (cursor < code.length) {
    result += escapeHtml(code.slice(cursor))
  }
  return result
}

export function highlightCode(code: string, language: string): string {
  const rules = RULES[language]
  if (!rules || rules.length === 0) {
    return escapeHtml(code)
  }
  const tokens = tokenize(code, rules)
  return applyTokens(code, tokens)
}
