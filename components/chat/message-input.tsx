"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void> | void
  disabled?: boolean
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled || sending) return
    setSending(true)
    try {
      await onSendMessage(message.trim())
      setMessage("")
    } catch (err) {
      toast({
        title: "Message failed",
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 p-3 border-t border-taupe_gray-200 bg-anti_flash_white-500 dark:bg-black-100"
    >
      <Input
        type="text"
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={500}
        disabled={disabled || sending}
        className="flex-1 bg-anti_flash_white-500 dark:bg-black-100 border-taupe_gray-200 focus:border-dim_gray-400 focus:ring-dim_gray-400 text-black-600 dark:text-anti_flash_white-500 placeholder-taupe_gray-400 transition-colors"
        autoComplete="off"
      />
      <motion.div
        whileTap={{ scale: 0.9 }}
        animate={{ scale: sending ? 0.95 : 1 }}
        className="flex items-center"
      >
        <Button
          type="submit"
          disabled={!message.trim() || disabled || sending}
          size="icon"
          className="bg-dim_gray-400 hover:bg-dim_gray-500 text-anti_flash_white-500 disabled:bg-taupe_gray-200 disabled:text-taupe_gray-400 border border-taupe_gray-200 shadow-none"
        >
          <Send className={`w-4 h-4 ${sending ? "animate-pulse" : ""}`} />
        </Button>
      </motion.div>
    </form>
  )
}
