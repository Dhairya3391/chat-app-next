"use client";

import { motion } from "framer-motion";
import type { Message } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import { generateColor } from "@/lib/color";
import { Pin, X } from "lucide-react";

interface MessageProps {
  message: Message;
  isOwn: boolean;
  isAdmin?: boolean;
  isPinned?: boolean;
  onPin?: (id: string) => void;
  onUnpin?: () => void;
}

export function ChatMessage({
  message,
  isOwn,
  isAdmin,
  isPinned,
  onPin,
  onUnpin,
}: MessageProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(date));
  };

  const sanitizedContent = DOMPurify.sanitize(message.content);

  const userColor = generateColor(message.username);

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
    );
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
          "max-w-[70%] rounded-xl px-4 py-2 border relative",
          isOwn
            ? "bg-dim_gray-100 text-anti_flash_white-500 border-dim_gray-400 shadow-md"
            : "bg-anti_flash_white-500 text-black-600 border-taupe_gray-200 shadow-sm",
        )}
      >
        {/* Pin icon for admin */}
        {isAdmin && !isPinned && (
          <button
            className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
            title="Pin message"
            onClick={() => onPin && onPin(message.id)}
          >
            <Pin className="w-4 h-4 text-dim_gray-400" />
          </button>
        )}
        {isAdmin && isPinned && (
          <button
            className="absolute -top-2 -right-2 bg-yellow-100 rounded-full p-1 shadow hover:bg-yellow-200"
            title="Unpin message"
            onClick={() => onUnpin && onUnpin()}
          >
            <X className="w-4 h-4 text-yellow-600" />
          </button>
        )}
        {!isOwn && (
          <div
            className="text-xs font-semibold mb-1"
            style={{
              color: userColor,
              backgroundColor: `${userColor}40`,
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            {message.username}
          </div>
        )}
        <div
          className={cn(
            "text-sm break-words",
            isOwn ? "text-anti_flash_white-500" : "text-black-600",
          )}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
        <div
          className={cn(
            "text-[10px] mt-1 text-right",
            isOwn ? "text-platinum-400" : "text-taupe_gray-400",
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </motion.div>
  );
}
