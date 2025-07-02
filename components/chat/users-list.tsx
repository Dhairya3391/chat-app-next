"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@/stores/chat-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface UsersListProps {
  users: User[];
  currentUsername: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function UsersList({
  users,
  currentUsername,
  isCollapsed,
  onToggle,
}: UsersListProps) {
  return (
    <Card
      className={`flex flex-col min-h-0 flex-1 bg-anti_flash_white-500 dark:bg-black-100 border-taupe_gray-200 shadow-none ${isCollapsed ? "w-16" : "w-full"}`}
    >
      <CardHeader
        className={`pb-3 flex flex-row items-center ${isCollapsed ? "justify-center" : "justify-between"} border-b border-taupe_gray-200 bg-anti_flash_white-500 dark:bg-black-100`}
      >
        <CardTitle
          className={`text-lg flex items-center gap-2 text-dim_gray-400 ${isCollapsed ? "hidden" : ""}`}
        >
          <Users className="w-5 h-5" />
          <span className="font-semibold text-dim_gray-500">
            Online ({users.length})
          </span>
        </CardTitle>
        <button
          className="ml-auto text-taupe_gray-400 hover:text-dim_gray-400 transition-colors"
          onClick={onToggle}
          aria-label={!isCollapsed ? "Hide online users" : "Show online users"}
        >
          {!isCollapsed ? "✕" : "☰"}
        </button>
      </CardHeader>
      {!isCollapsed ? (
        <CardContent className="pt-0 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-2">
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
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeInOut",
                    }}
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
      ) : (
        <CardContent className="pt-0 flex flex-col items-center justify-center h-full">
          <span className="text-2xl font-bold text-dim_gray-500">
            {users.length}
          </span>
          <span className="text-xs text-dim_gray-400">Online</span>
        </CardContent>
      )}
    </Card>
  );
}
