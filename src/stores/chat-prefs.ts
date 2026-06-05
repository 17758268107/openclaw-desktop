import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatPrefsState {
  showMessageTimestamps: boolean
  compactMessages: boolean
  showTokenEstimate: boolean
  agentMentionEnabled: boolean
  showTimestampsRelative: boolean
  autoScrollToBottom: boolean
  codeLineNumbers: boolean
  setShowMessageTimestamps: (v: boolean) => void
  setCompactMessages: (v: boolean) => void
  setShowTokenEstimate: (v: boolean) => void
  setAgentMentionEnabled: (v: boolean) => void
  setShowTimestampsRelative: (v: boolean) => void
  setAutoScrollToBottom: (v: boolean) => void
  setCodeLineNumbers: (v: boolean) => void
}

export const useChatPrefsStore = create<ChatPrefsState>()(
  persist(
    (set) => ({
      showMessageTimestamps: true,
      compactMessages: false,
      showTokenEstimate: true,
      agentMentionEnabled: true,
      showTimestampsRelative: true,
      autoScrollToBottom: true,
      codeLineNumbers: true,
      setShowMessageTimestamps: (v) => set({ showMessageTimestamps: v }),
      setCompactMessages: (v) => set({ compactMessages: v }),
      setShowTokenEstimate: (v) => set({ showTokenEstimate: v }),
      setAgentMentionEnabled: (v) => set({ agentMentionEnabled: v }),
      setShowTimestampsRelative: (v) => set({ showTimestampsRelative: v }),
      setAutoScrollToBottom: (v) => set({ autoScrollToBottom: v }),
      setCodeLineNumbers: (v) => set({ codeLineNumbers: v })
    }),
    {
      name: 'openclaw-chat-prefs'
    }
  )
)