export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  reasoning?: string
  timestamp: number
  agentId?: string
  toolName?: string
  tokenUsage?: { input: number; output: number; total: number }
  status?: 'pending' | 'streaming' | 'done' | 'error'
  error?: string
}

export interface Session {
  id: string
  title: string
  agentId: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface Agent {
  id: string
  name: string
  description?: string
  avatar?: string
  skills?: string[]
  connected?: boolean
}

export interface GatewayHealth {
  ok: boolean
  status: string
  agents?: Agent[]
  plugins?: string[]
  uptime?: number
  version?: string
}
