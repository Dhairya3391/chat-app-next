import { create } from "zustand"

export interface Message {
  id: string
  username: string
  content: string
  timestamp: Date
  type: "user" | "system"
}

export interface User {
  id: string
  username: string
  joinedAt: Date
}

interface ChatState {
  // Connection state
  isConnected: boolean
  isJoined: boolean
  currentUsername: string | null

  // Chat data
  messages: Message[]
  users: User[]

  // UI state
  isJoining: boolean
  joinError: string | null

  // Actions
  setConnected: (connected: boolean) => void
  setJoined: (joined: boolean) => void
  setCurrentUsername: (username: string | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  setUsers: (users: User[]) => void
  setJoining: (joining: boolean) => void
  setJoinError: (error: string | null) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  isConnected: false,
  isJoined: false,
  currentUsername: null,
  messages: [],
  users: [],
  isJoining: false,
  joinError: null,

  // Actions
  setConnected: (connected) => set({ isConnected: connected }),
  setJoined: (joined) => set({ isJoined: joined }),
  setCurrentUsername: (username) => set({ currentUsername: username }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setUsers: (users) => set({ users }),
  setJoining: (joining) => set({ isJoining: joining }),
  setJoinError: (error) => set({ joinError: error }),
  reset: () =>
    set({
      isConnected: false,
      isJoined: false,
      currentUsername: null,
      messages: [],
      users: [],
      isJoining: false,
      joinError: null,
    }),
}))
