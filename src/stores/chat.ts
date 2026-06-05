import { create } from 'zustand'
import type { Message, Session, Agent } from '@renderer/types'
import { generateId } from '@renderer/lib/utils'

interface ChatState {
  sessions: Session[]
  activeSessionId: string | null
  agents: Agent[]
  activeAgentId: string
  streaming: boolean
  streamAbort: AbortController | null

  createSession: (agentId?: string) => string
  setActiveSession: (id: string) => void
  deleteSession: (id: string) => void
  addMessage: (sessionId: string, message: Message) => void
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void
  appendToMessage: (sessionId: string, messageId: string, text: string) => void
  appendReasoning: (sessionId: string, messageId: string, text: string) => void
  setActiveAgent: (id: string) => void
  setAgents: (agents: Agent[]) => void
  setStreaming: (streaming: boolean) => void
  setStreamAbort: (controller: AbortController | null) => void
  getActiveSession: () => Session | undefined
  getActiveAgent: () => Agent | undefined
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  agents: [
    { id: 'main', name: 'main', description: '主 Agent', connected: true }
  ],
  activeAgentId: 'main',
  streaming: false,
  streamAbort: null,

  createSession: (agentId?: string) => {
    const id = generateId()
    const session: Session = {
      id,
      title: '新会话',
      agentId: agentId ?? get().activeAgentId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    set((s) => ({
      sessions: [session, ...s.sessions],
      activeSessionId: id
    }))
    return id
  },

  setActiveSession: (id: string) => {
    set({ activeSessionId: id })
  },

  deleteSession: (id: string) => {
    set((s) => {
      const sessions = s.sessions.filter((ses) => ses.id !== id)
      const activeSessionId =
        s.activeSessionId === id ? (sessions[0]?.id ?? null) : s.activeSessionId
      return { sessions, activeSessionId }
    })
  },

  addMessage: (sessionId: string, message: Message) => {
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === sessionId
          ? {
              ...ses,
              messages: [...ses.messages, message],
              updatedAt: Date.now(),
              title:
                ses.messages.length === 0 && message.role === 'user'
                  ? message.content.slice(0, 30) || '新会话'
                  : ses.title
            }
          : ses
      )
    }))
  },

  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => {
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === sessionId
          ? {
              ...ses,
              messages: ses.messages.map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
              updatedAt: Date.now()
            }
          : ses
      )
    }))
  },

  appendToMessage: (sessionId: string, messageId: string, text: string) => {
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === sessionId
          ? {
              ...ses,
              messages: ses.messages.map((msg) =>
                msg.id === messageId ? { ...msg, content: msg.content + text } : msg
              )
            }
          : ses
      )
    }))
  },

  appendReasoning: (sessionId: string, messageId: string, text: string) => {
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === sessionId
          ? {
              ...ses,
              messages: ses.messages.map((msg) =>
                msg.id === messageId
                  ? { ...msg, reasoning: (msg.reasoning ?? '') + text }
                  : msg
              )
            }
          : ses
      )
    }))
  },

  setActiveAgent: (id: string) => {
    set({ activeAgentId: id })
  },

  setAgents: (agents: Agent[]) => {
    set({ agents })
  },

  setStreaming: (streaming: boolean) => {
    set({ streaming })
  },

  setStreamAbort: (controller: AbortController | null) => {
    set({ streamAbort: controller })
  },

  getActiveSession: () => {
    const s = get()
    return s.sessions.find((ses) => ses.id === s.activeSessionId)
  },

  getActiveAgent: () => {
    const s = get()
    return s.agents.find((a) => a.id === s.activeAgentId)
  }
}))
