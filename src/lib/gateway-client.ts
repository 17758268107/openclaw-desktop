import type { GatewayHealth } from '@renderer/types'

export async function checkGatewayHealth(): Promise<GatewayHealth> {
  return window.openclawAPI.gateway.health()
}

export async function gatewayRequest(
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> }
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  return window.openclawAPI.gateway.request(path, {
    method: init?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: init?.body
  })
}

export async function fetchAgents(): Promise<unknown[]> {
  const res = await gatewayRequest('/v1/agents')
  if (res.ok && Array.isArray(res.data)) return res.data
  return []
}

export async function sendMessage(
  agentId: string,
  content: string,
  sessionId?: string
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  return gatewayRequest('/v1/chat', {
    method: 'POST',
    body: {
      agent_id: agentId,
      content,
      session_id: sessionId,
      stream: false
    }
  })
}

export async function sendMessageStream(
  agentId: string,
  content: string,
  onChunk: (chunk: string) => void,
  onReasoning?: (text: string) => void,
  onToolUsage?: (name: string, args: string) => void,
  onTokenUsage?: (usage: { input: number; output: number; total: number }) => void,
  onDone?: () => void,
  onError?: (error: string) => void,
  sessionId?: string,
  signal?: AbortSignal
): Promise<void> {
  const url = await window.openclawAPI.gateway.streamUrl()
  if (!url) {
    onError?.('Gateway not connected')
    return
  }

  const response = await fetch(`${url}/v1/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: agentId,
      content,
      session_id: sessionId
    }),
    signal
  })

  if (!response.ok) {
    onError?.(`HTTP ${response.status}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError?.('No response body')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6).trim()
        if (jsonStr === '[DONE]') {
          onDone?.()
          return
        }
        try {
          const event = JSON.parse(jsonStr) as {
            channel?: string
            content?: string
            reasoning?: string
            tool_name?: string
            tool_args?: string
            usage?: { input: number; output: number; total: number }
            error?: string
          }
          switch (event.channel) {
            case 'chunk':
              if (event.content) onChunk(event.content)
              break
            case 'reasoning':
              if (event.reasoning) onReasoning?.(event.reasoning)
              break
            case 'tool':
              if (event.tool_name) onToolUsage?.(event.tool_name, event.tool_args ?? '')
              break
            case 'usage':
              if (event.usage) onTokenUsage?.(event.usage)
              break
            case 'done':
              onDone?.()
              return
            case 'error':
              onError?.(event.error ?? 'Unknown error')
              return
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
    onDone?.()
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    onError?.((err as Error).message)
  }
}
