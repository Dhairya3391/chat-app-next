"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MessageCircle } from "lucide-react";

interface UsernameFormProps {
  onSubmit: (username: string, isAdmin: boolean) => void;
  isLoading: boolean;
  error: string | null;
  buttonLabel?: string;
}

export function UsernameForm({
  onSubmit,
  isLoading,
  error,
  buttonLabel = "Join Chat",
}: UsernameFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUsername = localStorage.getItem("chat-username");
      if (savedUsername) {
        setUsername(savedUsername);
      }
    }
  }, []);

  useEffect(() => {
    if (username.trim() === "noobokay") {
      setShowPassword(true);
    } else {
      setShowPassword(false);
      setPassword("");
      setLocalError(null);
    }
  }, [username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || isLoading) return;
    if (username.trim() === "noobokay") {
      if (password !== "noobokay") {
        setLocalError("Incorrect password for admin user.");
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("chat-username", username.trim());
      }
      onSubmit(username.trim(), true);
    } else {
      if (typeof window !== "undefined") {
        localStorage.setItem("chat-username", username.trim());
      }
      onSubmit(username.trim(), false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center"
            >
              <MessageCircle className="w-8 h-8 text-blue-600" />
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              Join Global Chat
            </CardTitle>
            <CardDescription>
              Choose a unique username to start chatting with people around the
              world
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter your username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  disabled={isLoading}
                  className="text-center text-lg"
                />
                {username.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    {username.length}/20 characters
                  </p>
                )}
              </div>
              {showPassword && (
                <div>
                  <Input
                    type="password"
                    placeholder="Enter admin password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="text-center text-lg"
                  />
                </div>
              )}

              {(error || localError) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert variant="destructive">
                    <AlertDescription>{error || localError}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  !username.trim() || isLoading || (showPassword && !password)
                }
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {buttonLabel === "Join Chat" ? "Joining..." : "Rejoining..."}
                  </>
                ) : (
                  buttonLabel
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
