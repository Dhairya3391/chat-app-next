"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useChatStore } from "@/stores/chat-store"
import { ChatMessage } from "./message"
import { UsersList } from "./users-list"
import { MessageInput } from "./message-input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Wifi, WifiOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void
}

export function ChatInterface({ onSendMessage }: ChatInterfaceProps) {
  const { messages, users, currentUsername, isConnected } = useChatStore()
  const { toast } = useToast()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [connectionToastDisplayed, setConnectionToastDisplayed] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!isConnected && !connectionToastDisplayed) {
      toast({
        title: "Disconnected",
        description: "You are not connected to the chat server.",
        variant: "destructive",
      })
      setConnectionToastDisplayed(true)
    } else if (isConnected && connectionToastDisplayed) {
      toast({
        title: "Connected",
        description: "You are now connected to the chat server.",
        variant: "default",
      })
      setConnectionToastDisplayed(false)
    }
  }, [isConnected, connectionToastDisplayed, toast])

  // Focus input on '/' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !(document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'))
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev)
  }

  return (
    <div className="min-h-screen bg-anti_flash_white-500 dark:bg-black-100 p-0 md:p-4 transition-colors duration-300">
      <div
        className={`max-w-7xl mx-auto grid grid-cols-1 ${isSidebarOpen ? "lg:grid-cols-4" : "lg:grid-cols-[1fr_auto]"} gap-0 md:gap-4`} style={{height: '100dvh'}}
      >
        {/* Main Chat Area */}
        <div className={`${isSidebarOpen ? "lg:col-span-3" : "lg:col-span-1"} flex flex-col min-h-0`}>
          <Card className="flex-1 flex flex-col bg-platinum-500 border-taupe_gray-200 shadow-none min-h-0">
            {/* Fixed Header */}
            <CardHeader className="shrink-0 sticky top-0 z-10 pb-2 border-b border-taupe_gray-200 bg-anti_flash_white-500 dark:bg-black-100">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-dim_gray-400">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-semibold text-dim_gray-500">Global Chat</span>
                </div>
                <button
                  className="block lg:hidden px-2 py-1 rounded text-taupe_gray-400 hover:bg-platinum-100"
                  onClick={toggleSidebar}
                  aria-label={isSidebarOpen ? "Hide online users" : "Show online users"}
                >
                  {isSidebarOpen ? "Hide Users" : "Show Users"}
                </button>
                <div className="hidden lg:flex items-center gap-2 text-sm">
                  {isConnected ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-red-500" />
                      <span className="text-red-600">Disconnected</span>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>

            {/* Scrollable Messages Area */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto p-2 md:p-4 space-y-2 bg-anti_flash_white-500 dark:bg-black-100 transition-colors duration-300">
                <AnimatePresence>
                  {messages.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center h-full text-taupe_gray-300"
                    >
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-taupe_gray-200" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          isOwn={message.username === currentUsername && message.type === "user"}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </AnimatePresence>
              </div>
              {/* Fixed Input Bar */}
              <div className="shrink-0 sticky bottom-0 z-10 bg-anti_flash_white-500 dark:bg-black-100 border-t border-taupe_gray-200">
                <MessageInput ref={inputRef} onSendMessage={onSendMessage} disabled={!isConnected} />
              </div>
            </div>
          </Card>
        </div>

        {/* Users Sidebar */}
        <motion.div
          key="sidebar"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.3 }}
          className={`${isSidebarOpen ? "lg:col-span-1" : "lg:col-span-1 lg:w-16"} flex flex-col min-h-0 bg-anti_flash_white-500 dark:bg-black-100 border-l border-taupe_gray-200`}
        >
          <div className="flex-1 min-h-0 flex flex-col">
            <UsersList users={users} currentUsername={currentUsername || ""} isCollapsed={!isSidebarOpen} onToggle={toggleSidebar} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
