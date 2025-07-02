import type { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";

export const runtime = "nodejs";

// In-memory storage
const connectedUsers = new Map<
  string,
  { id: string; username: string; joinedAt: Date }
>();
const messages: Array<{
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  type: "user" | "system";
}> = [];
let pinnedMessage: null | {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  type: string;
} = null;

let io: ServerIO | undefined;

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!io) {
    if (!res.socket || !("server" in res.socket)) {
      throw new Error("Socket server is not available on the response object");
    }
    const httpServer: NetServer = (
      res.socket as unknown as { server: NetServer }
    ).server;
    io = new ServerIO(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);

      // --- Admin Commands ---
      // Pin a message (by ID)
      socket.on("admin-pin-message", (msgId) => {
        const msg = messages.find((m) => m.id === msgId);
        if (msg) {
          pinnedMessage = msg;
          if (io) io.emit("pin-message", msg);
        }
      });

      // Unpin the current pinned message
      socket.on("admin-unpin-message", () => {
        pinnedMessage = null;
        if (io) io.emit("unpin-message");
      });

      // Clear all messages for everyone
      socket.on("admin-clear-messages", () => {
        messages.length = 0;
        const sysMsg = {
          id: `system-${Date.now()}-${Math.random()}`,
          username: "System",
          content: `Chat was cleared by admin`,
          timestamp: new Date(),
          type: "system" as const,
        };
        messages.push(sysMsg);
        if (io) io.emit("clear-messages", sysMsg);
      });

      // Ban a user for everyone
      socket.on("admin-ban-user", ({ username, duration }) => {
        // Broadcast ban event to all clients
        if (io) io.emit("ban-user", { username, until: Date.now() + duration });
        // System message
        const sysMsg = {
          id: `system-${Date.now()}-${Math.random()}`,
          username: "System",
          content: `@${username} was banned by admin for ${Math.round(duration / 60000)} min`,
          timestamp: new Date(),
          type: "system" as const,
        };
        messages.push(sysMsg);
        if (io) io.emit("new-message", sysMsg);
      });

      // Unban a user for everyone
      socket.on("admin-unban-user", (username) => {
        if (io) io.emit("unban-user", username);
        const sysMsg = {
          id: `system-${Date.now()}-${Math.random()}`,
          username: "System",
          content: `@${username} was unbanned by admin`,
          timestamp: new Date(),
          type: "system" as const,
        };
        messages.push(sysMsg);
        if (io) io.emit("new-message", sysMsg);
      });

      // Kick a user (force disconnect)
      socket.on("admin-kick-user", (username) => {
        const user = Array.from(connectedUsers.values()).find(
          (u) => u.username === username,
        );
        if (user && io) {
          io.to(user.id).emit("kicked");
          connectedUsers.delete(user.id);
          const sysMsg = {
            id: `system-${Date.now()}-${Math.random()}`,
            username: "System",
            content: `@${username} was kicked by admin`,
            timestamp: new Date(),
            type: "system" as const,
          };
          messages.push(sysMsg);
          io.emit("new-message", sysMsg);
          io.emit("user-left", { userId: user.id, message: sysMsg });
        }
      });

      // Announce a message to all users
      socket.on("admin-announce", (content) => {
        const sysMsg = {
          id: `system-${Date.now()}-${Math.random()}`,
          username: "System",
          content: `[Announcement] ${content}`,
          timestamp: new Date(),
          type: "system" as const,
        };
        messages.push(sysMsg);
        if (io) io.emit("new-message", sysMsg);
      });

      // List all users (send to admin only)
      socket.on("admin-list-users", () => {
        socket.emit("list-users", Array.from(connectedUsers.values()));
      });

      // Handle username validation and user join
      socket.on("join", (username: string) => {
        try {
          // Validate username
          if (!username || username.trim().length === 0) {
            socket.emit("join-error", "Username cannot be empty");
            return;
          }

          if (username.length > 20) {
            socket.emit("join-error", "Username must be under 20 characters");
            return;
          }

          // Check if username is already taken (case-insensitive)
          const normalizedUsername = username.trim().toLowerCase();
          const existingUser = Array.from(connectedUsers.values()).find(
            (user) => user.username.toLowerCase() === normalizedUsername,
          );

          if (existingUser) {
            connectedUsers.delete(existingUser.id);
          }

          // Add user to connected users
          const userData = {
            id: socket.id,
            username: username.trim(),
            joinedAt: new Date(),
          };
          connectedUsers.set(socket.id, userData);

          // Create system message for user join (exclude the joining user)
          const joinMessage = {
            id: `system-${Date.now()}-${Math.random()}`,
            username: "System",
            content: `${userData.username} joined the chat`,
            timestamp: new Date(),
            type: "system" as const,
          };
          messages.push(joinMessage);

          // Send join success to the user
          socket.emit("join-success", {
            username: userData.username,
            users: Array.from(connectedUsers.values()),
            messages: messages.slice(-50), // Send last 50 messages
            pinnedMessage,
          });

          // Broadcast system message to all other users
          socket.broadcast.emit("user-joined", {
            user: userData,
            message: joinMessage,
            users: Array.from(connectedUsers.values()),
          });

          console.log(`User ${userData.username} joined`);
        } catch (error) {
          console.error("Error in join handler:", error);
          socket.emit("join-error", "An error occurred while joining");
        }
      });

      // Handle new messages
      socket.on("send-message", (content: string) => {
        try {
          const user = connectedUsers.get(socket.id);
          if (!user) {
            socket.emit("error", "User not found");
            return;
          }

          // Validate message
          if (!content || content.trim().length === 0) {
            return;
          }

          if (content.length > 500) {
            socket.emit("error", "Message too long (max 500 characters)");
            return;
          }

          const message = {
            id: `msg-${Date.now()}-${Math.random()}`,
            username: user.username,
            content: content.trim(),
            timestamp: new Date(),
            type: "user" as const,
          };

          messages.push(message);

          // Keep only last 100 messages in memory
          if (messages.length > 100) {
            messages.splice(0, messages.length - 100);
          }

          // Broadcast message to all users
          if (io) {
            io.emit("new-message", message);
          }

          console.log(`Message from ${user.username}: ${content}`);
        } catch (error) {
          console.error("Error in send-message handler:", error);
          socket.emit("error", "Failed to send message");
        }
      });

      // Handle user disconnect
      socket.on("disconnect", () => {
        try {
          const user = connectedUsers.get(socket.id);
          if (user) {
            connectedUsers.delete(socket.id);

            // Create system message for user leave
            const leaveMessage = {
              id: `system-${Date.now()}-${Math.random()}`,
              username: "System",
              content: `${user.username} left the chat`,
              timestamp: new Date(),
              type: "system" as const,
            };
            messages.push(leaveMessage);

            // Broadcast to all remaining users
            socket.broadcast.emit("user-left", {
              userId: socket.id,
              message: leaveMessage,
            });

            console.log(`User ${user.username} disconnected`);
          }
        } catch (error) {
          console.error("Error in disconnect handler:", error);
        }
      });
    });
  }
  res.end();
};

export default SocketHandler;
