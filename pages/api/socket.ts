import type { Server as NetServer } from "http";
import { Server as ServerIO } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import bannedWords from "../../bannedWords.json";
import type { Socket as ServerSocket } from "socket.io";

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
let httpServerRef: NetServer | undefined; // Track the HTTP server for shutdown

// Persistent IP ban storage
const bannedIpsPath = path.resolve(process.cwd(), "bannedIps.json");
function loadBannedIps(): Record<string, number> {
  try {
    if (!fs.existsSync(bannedIpsPath)) return {};
    const data = fs.readFileSync(bannedIpsPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}
function saveBannedIps(bannedIps: Record<string, number>) {
  fs.writeFileSync(bannedIpsPath, JSON.stringify(bannedIps, null, 2));
}
function getIp(socket: ServerSocket): string {
  // Prefer x-forwarded-for for proxies, fallback to handshake address
  const xfwd = socket.handshake.headers["x-forwarded-for"];
  if (xfwd) return (Array.isArray(xfwd) ? xfwd[0] : xfwd).split(",")[0].trim();
  return socket.handshake.address as string;
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!io) {
    if (!res.socket || !("server" in res.socket)) {
      throw new Error("Socket server is not available on the response object");
    }
    const httpServer: NetServer = (
      res.socket as unknown as { server: NetServer }
    ).server;
    httpServerRef = httpServer;
    io = new ServerIO(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // --- Graceful shutdown logic ---
    const shutdown = async () => {
      if (io) {
        console.log("\n[Graceful Shutdown] Closing Socket.IO server...");
        await new Promise((resolve) => io!.close(resolve));
        io = undefined;
      }
      if (httpServerRef) {
        console.log("[Graceful Shutdown] Closing HTTP server...");
        httpServerRef.close?.(() => {
          console.log("[Graceful Shutdown] HTTP server closed.");
        });
        httpServerRef = undefined;
      }
      process.exit(0);
    };
    if (!process.env.__SOCKET_SHUTDOWN_ATTACHED) {
      process.env.__SOCKET_SHUTDOWN_ATTACHED = "1";
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    }
    // --- End graceful shutdown logic ---

    // --- File Transfer Logic ---
    const approvedUsers = new Set<string>();

    io.on("connection", (socket: ServerSocket) => {
      const ip = getIp(socket);
      let bannedIps: Record<string, number> = loadBannedIps();
      // Clean expired bans
      const now = Date.now();
      Object.entries(bannedIps).forEach(([bip, expiry]) => {
        if (expiry && expiry < now) delete bannedIps[bip];
      });
      saveBannedIps(bannedIps);
      if (bannedIps[ip] && bannedIps[ip] > now) {
        socket.emit("join-error", "You are banned by IP.");
        socket.disconnect();
        return;
      }
      console.log("User connected:", socket.id);

      socket.on("disconnect", (reason) => {
        console.log(`Socket ${socket.id} disconnected:`, reason);
      });

      // --- Admin Commands ---
      // Pin a message (by ID)
      socket.on("admin-pin-message", (msgId) => {
        try {
          const msg = messages.find((m) => m.id === msgId);
          if (msg) {
            pinnedMessage = msg;
            if (io) io.emit("pin-message", msg);
          }
        } catch (err) {
          console.error("Error in admin-pin-message handler:", err);
        }
      });

      // Unpin the current pinned message
      socket.on("admin-unpin-message", () => {
        try {
          pinnedMessage = null;
          if (io) io.emit("unpin-message");
        } catch (err) {
          console.error("Error in admin-unpin-message handler:", err);
        }
      });

      // Clear all messages for everyone
      socket.on("admin-clear-messages", () => {
        try {
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
        } catch (err) {
          console.error("Error in admin-clear-messages handler:", err);
        }
      });

      // Ban a user for everyone
      socket.on("admin-ban-user", ({ username, duration }) => {
        try {
          // Find user by username
          const user = Array.from(connectedUsers.values()).find(
            (u) => u.username === username,
          );
          if (user && io) {
            // Ban their IP
            const targetSocket = io.sockets.sockets.get(user.id);
            if (targetSocket) {
              const targetIp = getIp(targetSocket);
              bannedIps = loadBannedIps();
              bannedIps[targetIp] = Date.now() + duration;
              saveBannedIps(bannedIps);
            }
          }
          // Broadcast ban event to all clients
          if (io)
            io.emit("ban-user", { username, until: Date.now() + duration });
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
        } catch (err) {
          console.error("Error in admin-ban-user handler:", err);
        }
      });

      // Unban a user for everyone
      socket.on("admin-unban-user", (username) => {
        try {
          // Find user by username
          const user = Array.from(connectedUsers.values()).find(
            (u) => u.username === username,
          );
          if (user && io) {
            // Unban their IP
            const targetSocket = io.sockets.sockets.get(user.id);
            if (targetSocket) {
              const targetIp = getIp(targetSocket);
              bannedIps = loadBannedIps();
              delete bannedIps[targetIp];
              saveBannedIps(bannedIps);
            }
          }
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
        } catch (err) {
          console.error("Error in admin-unban-user handler:", err);
        }
      });

      // Kick a user (force disconnect)
      socket.on("admin-kick-user", (username) => {
        try {
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
        } catch (err) {
          console.error("Error in admin-kick-user handler:", err);
        }
      });

      // Announce a message to all users
      socket.on("admin-announce", (content) => {
        try {
          const sysMsg = {
            id: `system-${Date.now()}-${Math.random()}`,
            username: "System",
            content: `[Announcement] ${content}`,
            timestamp: new Date(),
            type: "system" as const,
          };
          messages.push(sysMsg);
          if (io) io.emit("new-message", sysMsg);
        } catch (err) {
          console.error("Error in admin-announce handler:", err);
        }
      });

      // Admin approve user for large files
      socket.on("admin-approve-user", (username: string) => {
        try {
          const adminUser = connectedUsers.get(socket.id);
          console.log(
            "Admin approve request from:",
            adminUser?.username,
            "for user:",
            username,
          );
          if (adminUser?.username === "noobokay") {
            approvedUsers.add(username);
            console.log(
              "User approved:",
              username,
              "Approved users:",
              Array.from(approvedUsers),
            );
            if (io) {
              io.emit("user-approved", username);
              // Send system message
              const sysMsg = {
                id: `system-${Date.now()}-${Math.random()}`,
                username: "System",
                content: `@${username} was approved for large file transfers by admin`,
                timestamp: new Date(),
                type: "system" as const,
              };
              messages.push(sysMsg);
              io.emit("new-message", sysMsg);
            }
          } else {
            console.log(
              "Non-admin user tried to approve:",
              adminUser?.username,
            );
          }
        } catch (err) {
          console.error("Error in admin-approve-user handler:", err);
        }
      });

      // File transfer request
      socket.on("file-transfer-request", (data) => {
        try {
          // data: { fileName, size, sender, recipients }
          const { fileName, size, sender, recipients } = data;
          // Enforce file size limit unless approved
          const isApproved = approvedUsers.has(sender);
          if (!isApproved && size > 100 * 1024 * 1024) {
            socket.emit("file-transfer-status", {
              status: "rejected",
              reason: "File too large. Ask admin to approve you.",
            });
            return;
          }
          // Send approval request to recipients
          (recipients.includes("ALL")
            ? Array.from(connectedUsers.values()).filter(
                (u) => u.username !== sender,
              )
            : Array.from(connectedUsers.values()).filter((u) =>
                recipients.includes(u.username),
              )
          ).forEach((user) => {
            io?.to(user.id).emit("file-transfer-approval-request", {
              fileName,
              size,
              sender,
            });
          });
          socket.emit("file-transfer-status", { status: "pending" });
        } catch (err) {
          console.error("Error in file-transfer-request handler:", err);
          socket.emit("file-transfer-status", {
            status: "rejected",
            reason: "Internal server error.",
          });
        }
      });

      // File transfer approval response
      socket.on("file-transfer-approval-response", (data) => {
        try {
          // data: { sender, recipient, fileName, accepted }
          const { sender, recipient, fileName, accepted } = data;
          const senderUser = Array.from(connectedUsers.values()).find(
            (u) => u.username === sender,
          );
          if (senderUser) {
            io?.to(senderUser.id).emit("file-transfer-status", {
              status: accepted ? "approved" : "rejected",
              recipient,
              fileName,
            });
          }
        } catch (err) {
          console.error(
            "Error in file-transfer-approval-response handler:",
            err,
          );
        }
      });

      // Handle username validation and user join
      socket.on("join", (username: string) => {
        try {
          // If admin is joining, unban their IP
          if (username && username.trim() === "noobokay") {
            const adminIp = getIp(socket);
            const bannedIps = loadBannedIps();
            if (bannedIps[adminIp]) {
              delete bannedIps[adminIp];
              saveBannedIps(bannedIps);
            }
          }
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
            if (io) {
              const oldSocket = io.sockets.sockets.get(existingUser.id);
              if (oldSocket) {
                oldSocket.emit("kicked", {
                  reason: "Another session joined with your username.",
                });
                oldSocket.disconnect(true);
              }
            }
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

          // Check IP ban before processing message
          bannedIps = loadBannedIps();
          if (bannedIps[ip] && bannedIps[ip] > Date.now()) {
            socket.emit("error", "You are banned by IP.");
            socket.disconnect();
            return;
          }

          // Check for banned words (curse word ban)
          if (
            (bannedWords as string[]).some((word: string) =>
              new RegExp(`\\b${word}\\b`, "i").test(content),
            )
          ) {
            // Ban this IP for 2 minutes
            bannedIps[ip] = Date.now() + 2 * 60 * 1000;
            saveBannedIps(bannedIps);
            socket.emit(
              "error",
              "You used a banned word and are banned by IP for 2 minutes.",
            );
            socket.disconnect();
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
