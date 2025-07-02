"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/stores/chat-store";
import type { Message, User } from "@/stores/chat-store";
import { ChatMessage } from "./message";
import { UsersList } from "./users-list";
import { MessageInput } from "./message-input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Wifi, WifiOff, Pin, LogOut } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import bannedWords from "../../bannedWords.json" assert { type: "json" };
import { socketManager } from "@/lib/socket";
import { Button } from "@/components/ui/button";

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  isAdmin?: boolean;
}

export function ChatInterface({ onSendMessage, isAdmin }: ChatInterfaceProps) {
  const { messages, users, currentUsername, isConnected, setMessages } =
    useChatStore();
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [connectionToastDisplayed, setConnectionToastDisplayed] =
    useState(false);
  const [bannedUntil, setBannedUntil] = useState<Date | null>(null);
  const [bannedUsers, setBannedUsers] = useState<{ [username: string]: Date }>(
    {},
  );
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ref map for scrolling to messages
  const messageRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isConnected && !connectionToastDisplayed) {
      toast({
        title: "Disconnected",
        description: "You are not connected to the chat server.",
        variant: "destructive",
      });
      setConnectionToastDisplayed(true);
    } else if (isConnected && connectionToastDisplayed) {
      toast({
        title: "Connected",
        description: "You are now connected to the chat server.",
        variant: "default",
      });
      setConnectionToastDisplayed(false);
    }
  }, [isConnected, connectionToastDisplayed, toast]);

  // Focus input on '/' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(
          document.activeElement &&
          (document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA")
        )
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // Load bans from localStorage on mount/username change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const now = Date.now();
      const newBannedUsers: { [username: string]: Date } = {};
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("ban-")) {
          const username = key.replace("ban-", "");
          const expiry = parseInt(localStorage.getItem(key) || "0", 10);
          if (expiry > now) {
            newBannedUsers[username] = new Date(expiry);
          } else {
            localStorage.removeItem(key);
          }
        }
      });
      setBannedUsers(newBannedUsers);
    }
  }, [currentUsername]);

  // Helper: is current user banned?
  const isCurrentUserBanned = useMemo(() => {
    if (!currentUsername) return false;
    if (typeof window !== "undefined") {
      const expiry = localStorage.getItem("ban-" + currentUsername);
      if (expiry && parseInt(expiry, 10) > Date.now()) {
        return true;
      }
    }
    const until = bannedUsers[currentUsername];
    return until && new Date() < until;
  }, [bannedUsers, currentUsername]);

  // Helper to check for banned words
  const containsBannedWord = (text: string) => {
    return (bannedWords as string[]).some((word: string) =>
      new RegExp(`\\b${word}\\b`, "i").test(text),
    );
  };

  // Listen for pin/unpin events from server
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;
    const handlePin = (msg: Message) => setPinnedMessage(msg);
    const handleUnpin = () => setPinnedMessage(null);
    socket.on("pin-message", handlePin);
    socket.on("unpin-message", handleUnpin);
    return () => {
      socket.off("pin-message", handlePin);
      socket.off("unpin-message", handleUnpin);
    };
  }, []);

  // On join, set pinned message from server
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;
    const handleJoinSuccess = (data: { pinnedMessage?: Message }) => {
      if (data.pinnedMessage) setPinnedMessage(data.pinnedMessage);
    };
    socket.on("join-success", handleJoinSuccess);
    return () => {
      socket.off("join-success", handleJoinSuccess);
    };
  }, []);

  // Pin a message (admin only)
  const handlePinMessage = (msgId: string) => {
    const socket = socketManager.getSocket();
    if (socket) socket.emit("admin-pin-message", msgId);
  };
  // Unpin message (admin only)
  const handleUnpinMessage = () => {
    const socket = socketManager.getSocket();
    if (socket) socket.emit("admin-unpin-message");
  };

  // Scroll to pinned message
  const scrollToPinned = () => {
    if (pinnedMessage && messageRefs.current[pinnedMessage.id]) {
      messageRefs.current[pinnedMessage.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Admin command handler
  const handleSendMessage = async (message: string) => {
    if (isAdmin) {
      // Remove message length/ban limits for admin
      if (message.trim() === "/clear") {
        const socket = socketManager.getSocket();
        if (socket) socket.emit("admin-clear-messages");
        return;
      }
      if (message.trim().startsWith("/ban ")) {
        const match = message.trim().match(/^\/ban\s+@?(\w+)/);
        if (match) {
          const usernameToBan = match[1];
          const socket = socketManager.getSocket();
          if (socket)
            socket.emit("admin-ban-user", {
              username: usernameToBan,
              duration: 2 * 60 * 1000,
            });
          return;
        }
      }
      if (message.trim().startsWith("/unban ")) {
        const match = message.trim().match(/^\/unban\s+@?(\w+)/);
        if (match) {
          const usernameToUnban = match[1];
          const socket = socketManager.getSocket();
          if (socket) socket.emit("admin-unban-user", usernameToUnban);
          return;
        }
      }
      if (message.trim().startsWith("/kick ")) {
        const match = message.trim().match(/^\/kick\s+@?(\w+)/);
        if (match) {
          const usernameToKick = match[1];
          const socket = socketManager.getSocket();
          if (socket) socket.emit("admin-kick-user", usernameToKick);
          return;
        }
      }
      if (message.trim().startsWith("/announce ")) {
        const content = message.trim().replace("/announce ", "");
        const socket = socketManager.getSocket();
        if (socket) socket.emit("admin-announce", content);
        return;
      }
      if (message.trim() === "/users") {
        const socket = socketManager.getSocket();
        if (socket) socket.emit("admin-list-users");
        return;
      }
    }
    // Ban logic for normal users
    if (!isAdmin) {
      if (isCurrentUserBanned) {
        let seconds = 0;
        if (typeof window !== "undefined") {
          const expiry = localStorage.getItem("ban-" + currentUsername);
          if (expiry) {
            seconds = Math.ceil((parseInt(expiry, 10) - Date.now()) / 1000);
          }
        }
        toast({
          title: "Banned",
          description: `You are banned for ${seconds} more seconds.`,
          variant: "destructive",
        });
        return;
      }
      if (bannedUntil && new Date() < bannedUntil) {
        const seconds = Math.ceil((bannedUntil.getTime() - Date.now()) / 1000);
        toast({
          title: "Banned",
          description: `You are banned for ${seconds} more seconds.`,
          variant: "destructive",
        });
        return;
      }
      if (containsBannedWord(message)) {
        const banTime = new Date(Date.now() + 2 * 60 * 1000);
        setBannedUntil(banTime);
        if (currentUsername && typeof window !== "undefined") {
          localStorage.setItem(
            "ban-" + currentUsername,
            String(banTime.getTime()),
          );
        }
        toast({
          title: "Banned",
          description: "You used a banned word and are banned for 2 minutes.",
          variant: "destructive",
        });
        setMessages([
          ...messages,
          {
            id: `system-${Date.now()}`,
            username: "system",
            content: `${currentUsername} was banned for using inappropriate language.`,
            timestamp: new Date(),
            type: "system",
          },
        ]);
        return;
      }
      // Enforce message length for non-admins
      if (message.length > 500) {
        toast({
          title: "Too long",
          description: "Message too long (max 500 characters).",
          variant: "destructive",
        });
        return;
      }
    }
    await onSendMessage(message);
  };

  // Listen for clear-messages event from server
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;
    const handleClear = (sysMsg: Message) => {
      setMessages([sysMsg]);
    };
    socket.on("clear-messages", handleClear);
    return () => {
      socket.off("clear-messages", handleClear);
    };
  }, [setMessages]);

  // Listen for ban/unban events from server
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;
    const handleBan = ({
      username,
      until,
    }: {
      username: string;
      until: number;
    }) => {
      setBannedUsers((prev) => ({ ...prev, [username]: new Date(until) }));
    };
    const handleUnban = (username: string) => {
      setBannedUsers((prev) => {
        const copy = { ...prev };
        delete copy[username];
        return copy;
      });
      if (currentUsername === username && typeof window !== "undefined") {
        localStorage.removeItem("ban-" + username);
      }
    };
    socket.on("ban-user", handleBan);
    socket.on("unban-user", handleUnban);
    return () => {
      socket.off("ban-user", handleBan);
      socket.off("unban-user", handleUnban);
    };
  }, [currentUsername]);

  // Listen for kick event from server
  useEffect(() => {
    const socket = socketManager.getSocket();
    if (!socket) return;
    const handleKicked = () => {
      window.location.reload();
    };
    socket.on("kicked", handleKicked);
    return () => {
      socket.off("kicked", handleKicked);
    };
  }, []);

  // Listen for list-users event (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    const socket = socketManager.getSocket();
    if (!socket) return;
    const handleListUsers = (users: User[]) => {
      toast({
        title: "Users",
        description: users.map((u) => u.username).join(", "),
        variant: "default",
        duration: 6000,
      });
    };
    socket.on("list-users", handleListUsers);
    return () => {
      socket.off("list-users", handleListUsers);
    };
  }, [isAdmin, toast]);

  // For admin: autocomplete usernames for /ban
  const [banInput, setBanInput] = useState("");
  const [showBanAutocomplete, setShowBanAutocomplete] = useState(false);
  const banCandidates = useMemo(() => {
    if (!isAdmin || !banInput.startsWith("/ban ")) return [];
    const search = banInput.replace("/ban ", "").toLowerCase();
    return users
      .map((u) => u.username)
      .filter(
        (name) =>
          name.toLowerCase().includes(search) && name !== currentUsername,
      );
  }, [banInput, users, isAdmin, currentUsername]);

  return (
    <div className="h-screen overflow-hidden bg-anti_flash_white-500 dark:bg-black-100 p-0 md:p-4 transition-colors duration-300">
      <div
        className={`max-w-7xl mx-auto grid grid-cols-1 ${isSidebarOpen ? "lg:grid-cols-4" : "lg:grid-cols-[1fr_auto]"} gap-0 md:gap-4 h-full`}
      >
        {/* Main Chat Area */}
        <div
          className={`${isSidebarOpen ? "lg:col-span-3" : "lg:col-span-1"} flex flex-col min-h-0 h-full`}
        >
          <Card className="flex-1 flex flex-col bg-platinum-500 border-taupe_gray-200 shadow-none min-h-0 h-full">
            {/* Fixed Header */}
            <CardHeader className="shrink-0 sticky top-0 z-10 pb-2 border-b border-taupe_gray-200 bg-anti_flash_white-500 dark:bg-black-100">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-dim_gray-400">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-semibold text-dim_gray-500">
                    Global Chat
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        localStorage.clear();
                      }
                      window.location.reload();
                    }}
                    title="Leave Chat"
                  >
                    <LogOut className="w-4 h-4 mr-1" /> Leave
                  </Button>
                  <button
                    className="block lg:hidden px-2 py-1 rounded text-taupe_gray-400 hover:bg-platinum-100"
                    onClick={toggleSidebar}
                    aria-label={
                      isSidebarOpen ? "Hide online users" : "Show online users"
                    }
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
                </div>
              </CardTitle>
            </CardHeader>

            {/* Scrollable Messages Area */}
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Pinned Message (if any) */}
              {pinnedMessage && (
                <div
                  className="mb-2 px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black flex items-center gap-2 shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition relative group"
                  onClick={scrollToPinned}
                  title="Scroll to pinned message"
                >
                  <Pin className="w-4 h-4 text-black dark:text-white shrink-0" />
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-black dark:text-white mr-2">
                      Pinned:
                    </span>
                    <span className="text-black dark:text-white/80 truncate">
                      {pinnedMessage.content}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      className="ml-2 p-1 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-black dark:text-white opacity-80 group-hover:opacity-100 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpinMessage();
                      }}
                      title="Unpin"
                    >
                      <Pin className="w-4 h-4 rotate-45 text-black dark:text-white" />
                    </button>
                  )}
                </div>
              )}
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
                        <div
                          key={message.id}
                          ref={(el) => {
                            messageRefs.current[message.id] = el;
                          }}
                        >
                          <ChatMessage
                            message={message}
                            isOwn={
                              message.username === (currentUsername || "") &&
                              message.type === "user"
                            }
                            isAdmin={isAdmin}
                            isPinned={
                              !!(
                                pinnedMessage && pinnedMessage.id === message.id
                              )
                            }
                            onPin={handlePinMessage}
                            onUnpin={handleUnpinMessage}
                          />
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </AnimatePresence>
              </div>
              {/* Fixed Input Bar */}
              <div className="shrink-0 sticky bottom-0 z-10 bg-anti_flash_white-500 dark:bg-black-100 border-t border-taupe_gray-200">
                {/* Connection status and manual reconnect */}
                {!isConnected && (
                  <div className="flex items-center justify-center bg-red-100 text-red-700 py-2">
                    <span className="mr-4">Disconnected from server.</span>
                    <button
                      className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      onClick={() => {
                        const savedUsername =
                          typeof window !== "undefined"
                            ? localStorage.getItem("chat-username")
                            : null;
                        if (savedUsername) {
                          window.location.reload(); // Let the main page handle reconnect logic
                        }
                      }}
                    >
                      Rejoin Chat
                    </button>
                  </div>
                )}
                <MessageInput
                  ref={inputRef}
                  onSendMessage={handleSendMessage}
                  disabled={!isConnected || isCurrentUserBanned}
                  bannedUntil={
                    isCurrentUserBanned ? bannedUsers[currentUsername!] : null
                  }
                  value={isAdmin ? banInput : undefined}
                  onChange={isAdmin ? setBanInput : undefined}
                />
                {/* Admin autocomplete dropdown for /ban */}
                {isAdmin && showBanAutocomplete && banCandidates.length > 0 && (
                  <div className="absolute left-0 right-0 bg-white border rounded shadow z-50 mt-1 max-h-40 overflow-y-auto">
                    {banCandidates.map((name) => (
                      <div
                        key={name}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setBanInput(`/ban ${name}`);
                          setShowBanAutocomplete(false);
                          inputRef.current?.focus();
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
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
            <UsersList
              users={users}
              currentUsername={currentUsername || ""}
              isCollapsed={!isSidebarOpen}
              onToggle={toggleSidebar}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
