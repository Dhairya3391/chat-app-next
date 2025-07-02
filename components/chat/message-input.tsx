"use client";

import type React from "react";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void> | void;
  disabled?: boolean;
  bannedUntil?: Date | null;
  value?: string;
  onChange?: (value: string) => void;
}

export const MessageInput = forwardRef<HTMLInputElement, MessageInputProps>(
  function MessageInput(
    { onSendMessage, disabled, bannedUntil, value, onChange },
    ref,
  ) {
    const [internalMessage, setInternalMessage] = useState("");
    const message = value !== undefined ? value : internalMessage;
    const setMessage = onChange ? onChange : setInternalMessage;
    const [sending, setSending] = useState(false);
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current!, []);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!message.trim() || disabled || sending) return;
      setSending(true);
      try {
        await onSendMessage(message.trim());
        setMessage("");
      } catch {
        toast({
          title: "Message failed",
          description: "Could not send your message. Please try again.",
          variant: "destructive",
        });
      } finally {
        setSending(false);
      }
    };

    const isBanned = !!(bannedUntil && new Date() < bannedUntil);
    let banSeconds = 0;
    if (isBanned && bannedUntil) {
      banSeconds = Math.ceil((bannedUntil.getTime() - Date.now()) / 1000);
    }

    return (
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-3 border-t border-taupe_gray-200 bg-anti_flash_white-500 dark:bg-black-100"
      >
        <Input
          type="text"
          placeholder={
            isBanned
              ? `Banned for ${banSeconds}s`
              : sending
                ? "Sending..."
                : "Type your message..."
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          disabled={Boolean(disabled) || Boolean(sending) || isBanned}
          className="flex-1 bg-anti_flash_white-500 dark:bg-black-100 border-taupe_gray-200 focus:border-dim_gray-400 focus:ring-dim_gray-400 text-black-600 dark:text-anti_flash_white-500 placeholder-taupe_gray-400 transition-colors"
          autoComplete="off"
          ref={inputRef}
        />
        <motion.div
          whileTap={{ scale: 0.9 }}
          animate={{ scale: sending ? 0.95 : 1 }}
          className="flex items-center"
        >
          <Button
            type="submit"
            disabled={
              !message.trim() ||
              Boolean(disabled) ||
              Boolean(sending) ||
              isBanned
            }
            size="icon"
            className="bg-dim_gray-400 hover:bg-dim_gray-500 text-anti_flash_white-500 disabled:bg-taupe_gray-200 disabled:text-taupe_gray-400 border border-taupe_gray-200 shadow-none"
          >
            <Send className={`w-4 h-4 ${sending ? "animate-pulse" : ""}`} />
          </Button>
        </motion.div>
      </form>
    );
  },
);
