"use client"

import { useEffect } from "react"
import { useChatStore } from "@/stores/chat-store"
import { socketManager } from "@/lib/socket"
import { UsernameForm } from "@/components/chat/username-form"
import { ChatInterface } from "@/components/chat/chat-interface"
import { useToast } from "@/components/ui/use-toast"

export default function ChatPage() {
  const {
    isJoined,
    isJoining,
    joinError,
    isConnected,
    setConnected,
    setJoined,
    setCurrentUsername,
    setMessages,
    addMessage,
    setUsers,
    setJoining,
    setJoinError,
    reset,
  } = useChatStore()
  const { toast } = useToast()

  useEffect(() => {
    // Remove the automatic socket connection here
    // All socket event listeners should be set up after connecting in handleJoin
    // Cleanup on unmount
    return () => {
      socketManager.disconnect()
      reset()
    }
  }, [])

  const handleJoin = (username: string) => {
    const socket = socketManager.connect(username)
    setJoining(true)
    setJoinError(null)
    // Set up event listeners after connecting
    socket.on("connect", () => {
      console.log("Connected to server")
      setConnected(true)
      socket.emit("join", username)
    })
    socket.on("disconnect", () => {
      console.log("Disconnected from server")
      setConnected(false)
      setJoined(false)
    })
    socket.on("join-success", (data: { username: string; users: any[]; messages: any[] }) => {
      console.log("Join successful:", data)
      setJoining(false)
      setJoinError(null)
      setJoined(true)
      setCurrentUsername(data.username)
      setUsers(data.users)
      setMessages(
        data.messages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      )
    })
    socket.on("join-error", (error: string) => {
      console.log("Join error:", error)
      setJoining(false)
      setJoinError(error)
    })
    socket.on("new-message", (message: any) => {
      addMessage({
        ...message,
        timestamp: new Date(message.timestamp),
      })
    })
    socket.on("user-joined", (data: { user: any; message: any; users: any[] }) => {
      setUsers(data.users)
      addMessage({
        ...data.message,
        timestamp: new Date(data.message.timestamp),
      })
    })
    socket.on("user-left", (data: { userId: string; message: any }) => {
      setUsers(useChatStore.getState().users.filter((user) => user.id !== data.userId))
      addMessage({
        ...data.message,
        timestamp: new Date(data.message.timestamp),
      })
    })
    socket.on("error", (error: string) => {
      console.error("Socket error:", error)
    })
  }

  const handleSendMessage = async (message: string) => {
    const socket = socketManager.getSocket()
    if (!socket || !isConnected) {
      toast({
        title: "Not connected",
        description: "You are not connected to the server. Please refresh or rejoin.",
        variant: "destructive",
      })
      throw new Error("Not connected")
    }
    return new Promise<void>((resolve, reject) => {
      let acknowledged = false
      socket.emit("send-message", message)
      // Optimistically resolve after a short delay (simulate server ack)
      setTimeout(() => {
        if (!acknowledged) resolve()
      }, 300)
      // Optionally, listen for an error event from the server
      socket.once("error", (err: string) => {
        acknowledged = true
        toast({
          title: "Message failed",
          description: err || "Could not send your message.",
          variant: "destructive",
        })
        reject(new Error(err))
      })
    })
  }

  if (!isJoined) {
    return <UsernameForm onSubmit={handleJoin} isLoading={isJoining} error={joinError} />
  }

  return <ChatInterface onSendMessage={handleSendMessage} />
}
