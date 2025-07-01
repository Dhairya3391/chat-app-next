"use client"

import { motion, AnimatePresence } from "framer-motion"
import type { User } from "@/stores/chat-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Circle } from "lucide-react"
import { useState } from "react"

interface UsersListProps {
  users: User[]
  currentUsername: string
}

export function UsersList({ users, currentUsername }: UsersListProps) {
  const [open, setOpen] = useState(true)

  return (
    <Card className="h-full bg-anti_flash_white-500 dark:bg-black-100 border-taupe_gray-200 shadow-none">
      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-taupe_gray-200 bg-anti_flash_white-500 dark:bg-black-100">
        <CardTitle className="text-lg flex items-center gap-2 text-dim_gray-400">
          <Users className="w-5 h-5" />
          <span className="font-semibold text-dim_gray-500">Online ({users.length})</span>
        </CardTitle>
        <button
          className="ml-auto text-taupe_gray-400 hover:text-dim_gray-400 transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Hide online users" : "Show online users"}
        >
          {open ? "✕" : "☰"}
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            <AnimatePresence>
              {users.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center gap-2 p-2 rounded-lg group transition-colors duration-200 ${
                    user.username === currentUsername
                      ? "bg-dim_gray-100 border border-dim_gray-400 shadow-sm"
                      : "hover:bg-platinum-100"
                  }`}
                >
                  <motion.span
                    className={`w-2 h-2 rounded-full mr-1 ${user.username === currentUsername ? "bg-dim_gray-400" : "bg-green-500"}`}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1],
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  />
                  <span
                    className={`text-sm ${
                      user.username === currentUsername
                        ? "font-bold text-dim_gray-700"
                        : "text-dim_gray-400"
                    }`}
                  >
                    {user.username}
                    {user.username === currentUsername && " (You)"}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
