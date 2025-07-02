"use client";

import { useEffect, useState } from "react";
import { useChatStore, Message, User } from "@/stores/chat-store";
import { socketManager } from "@/lib/socket";
import { UsernameForm } from "@/components/chat/username-form";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useToast } from "@/components/ui/use-toast";

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
  } = useChatStore();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    return () => {
      socketManager.disconnect();
      reset();
    };
  }, [reset]);

  const handleJoin = (username: string, isAdminFlag: boolean) => {
    setIsAdmin(isAdminFlag);
    setJoining(true);
    setJoinError(null);
    // Only connect when user clicks join/rejoin
    const socket = socketManager.connect(username);

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", username);
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setJoined(false);
      reset();
    });
    socket.on(
      "join-success",
      (data: { username: string; users: User[]; messages: Message[] }) => {
        setJoining(false);
        setJoinError(null);
        setJoined(true);
        setCurrentUsername(data.username);
        setUsers(data.users);
        setMessages(
          data.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        );
      },
    );
    socket.on("join-error", (error: string) => {
      setJoining(false);
      setJoinError(error);
      setConnected(false);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("join-success");
      socket.off("join-error");
      socket.off("new-message");
      socket.off("user-joined");
      socket.off("user-left");
    });
    socket.on("new-message", (message: Message) => {
      addMessage({
        ...message,
        timestamp: new Date(message.timestamp),
      });
    });
    socket.on(
      "user-joined",
      (data: { user: User; message: Message; users: User[] }) => {
        setUsers(data.users);
        addMessage({
          ...data.message,
          timestamp: new Date(data.message.timestamp),
        });
      },
    );
    socket.on("user-left", (data: { userId: string; message: Message }) => {
      setUsers(
        useChatStore.getState().users.filter((user) => user.id !== data.userId),
      );
      addMessage({
        ...data.message,
        timestamp: new Date(data.message.timestamp),
      });
    });
  };

  // Manual reconnect handler
  const handleReconnect = () => {
    let savedUsername = null;
    if (typeof window !== "undefined") {
      savedUsername = localStorage.getItem("chat-username");
    }
    if (savedUsername) {
      handleJoin(savedUsername, isAdmin);
    }
  };

  useEffect(() => {
    const socket = socketManager.getSocket();
    if (socket) {
      socket.on("error", (error: string) => {
        console.error("Socket error:", error);
        toast({
          title: "Socket Error",
          description: error || "An unexpected socket error occurred.",
          variant: "destructive",
        });
      });
    }
    return () => {
      if (socket) {
        socket.off("error");
      }
    };
  }, [toast]);

  const handleSendMessage = async (message: string) => {
    const socket = socketManager.getSocket();
    if (!socket || !isConnected) {
      toast({
        title: "Not connected",
        description:
          "You are not connected to the server. Please refresh or rejoin.",
        variant: "destructive",
      });
      throw new Error("Not connected");
    }
    return new Promise<void>((resolve, reject) => {
      let acknowledged = false;
      socket.emit("send-message", message);
      // Optimistically resolve after a short delay (simulate server ack)
      setTimeout(() => {
        if (!acknowledged) resolve();
      }, 300);
      // Optionally, listen for an error event from the server
      socket.once("error", (err: string) => {
        acknowledged = true;
        toast({
          title: "Message failed",
          description: err || "Could not send your message.",
          variant: "destructive",
        });
        reject(new Error(err));
      });
    });
  };

  if (!isJoined) {
    // If not joined, show join form or reconnect button if previously joined
    let hasSavedUsername = false;
    if (typeof window !== "undefined") {
      hasSavedUsername = !!localStorage.getItem("chat-username");
    }
    if (!isConnected && hasSavedUsername) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="mb-4 text-lg text-red-600">Disconnected from chat.</p>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
            onClick={handleReconnect}
          >
            Rejoin Chat
          </button>
        </div>
      );
    }
    return (
      <UsernameForm
        onSubmit={handleJoin}
        isLoading={isJoining}
        error={joinError}
      />
    );
  }

  return <ChatInterface onSendMessage={handleSendMessage} isAdmin={isAdmin} />;
}
