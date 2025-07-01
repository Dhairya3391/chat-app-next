"use client"

import { motion } from "framer-motion"
import type { Message } from "@/stores/chat-store"
import { cn } from "@/lib/utils"
import DOMPurify from "dompurify"

interface MessageProps {
  message: Message
  isOwn: boolean
}

export function ChatMessage({ message, isOwn }: MessageProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date))
  }

  const sanitizedContent = DOMPurify.sanitize(message.content)

  if (message.type === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center my-2"
      >
        <div
          className="bg-platinum-300 text-dim_gray-400 text-xs px-3 py-1 rounded-full border border-taupe_gray-300 shadow-none"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className={cn("flex mb-3", isOwn ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-xl px-4 py-2 border",
          isOwn
            ? "bg-dim_gray-100 text-anti_flash_white-500 border-dim_gray-400 shadow-md"
            : "bg-anti_flash_white-500 text-black-600 border-taupe_gray-200 shadow-sm",
        )}
      >
        {!isOwn && <div className="text-xs font-semibold text-dim_gray-400 mb-1">{message.username}</div>}
        <div
          className={cn("text-sm break-words", isOwn ? "text-anti_flash_white-500" : "text-black-600")}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
        <div className={cn("text-[10px] mt-1 text-right", isOwn ? "text-platinum-400" : "text-taupe_gray-400")}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </motion.div>
  )
}
