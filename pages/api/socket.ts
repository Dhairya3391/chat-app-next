import type { Server as NetServer } from "http"
import { Server as ServerIO } from "socket.io"

export const runtime = "nodejs"

// In-memory storage
const connectedUsers = new Map<string, { id: string; username: string; joinedAt: Date }>()
const messages: Array<{
  id: string
  username: string
  content: string
  timestamp: Date
  type: "user" | "system"
}> = []

let io: ServerIO | undefined

const SocketHandler = (req: any, res: any) => {
  if (!io) {
    const httpServer: NetServer = res.socket.server as any
    io = new ServerIO(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id)

      // Handle username validation and user join
      socket.on("join", (username: string) => {
        try {
          // Validate username
          if (!username || username.trim().length === 0) {
            socket.emit("join-error", "Username cannot be empty")
            return
          }

          if (username.length > 20) {
            socket.emit("join-error", "Username must be under 20 characters")
            return
          }

          // Check if username is already taken (case-insensitive)
          const normalizedUsername = username.trim().toLowerCase()
          const isUsernameTaken = Array.from(connectedUsers.values()).some(
            (user) => user.username.toLowerCase() === normalizedUsername,
          )

          if (isUsernameTaken) {
            socket.emit("join-error", "Username is already taken")
            return
          }

          // Add user to connected users
          const userData = {
            id: socket.id,
            username: username.trim(),
            joinedAt: new Date(),
          }
          connectedUsers.set(socket.id, userData)

          // Create system message for user join (exclude the joining user)
          const joinMessage = {
            id: `system-${Date.now()}-${Math.random()}`,
            username: "System",
            content: `${userData.username} joined the chat`,
            timestamp: new Date(),
            type: "system" as const,
          }
          messages.push(joinMessage)

          // Send join success to the user
          socket.emit("join-success", {
            username: userData.username,
            users: Array.from(connectedUsers.values()),
            messages: messages.slice(-50), // Send last 50 messages
          })

          // Broadcast system message to all other users
          socket.broadcast.emit("user-joined", {
            user: userData,
            message: joinMessage,
            users: Array.from(connectedUsers.values()),
          })

          console.log(`User ${userData.username} joined`)
        } catch (error) {
          console.error("Error in join handler:", error)
          socket.emit("join-error", "An error occurred while joining")
        }
      })

      // Handle new messages
      socket.on("send-message", (content: string) => {
        try {
          const user = connectedUsers.get(socket.id)
          if (!user) {
            socket.emit("error", "User not found")
            return
          }

          // Validate message
          if (!content || content.trim().length === 0) {
            return
          }

          if (content.length > 500) {
            socket.emit("error", "Message too long (max 500 characters)")
            return
          }

          const message = {
            id: `msg-${Date.now()}-${Math.random()}`,
            username: user.username,
            content: content.trim(),
            timestamp: new Date(),
            type: "user" as const,
          }

          messages.push(message)

          // Keep only last 100 messages in memory
          if (messages.length > 100) {
            messages.splice(0, messages.length - 100)
          }

          // Broadcast message to all users
          if (io) {
            io.emit("new-message", message)
          }

          console.log(`Message from ${user.username}: ${content}`)
        } catch (error) {
          console.error("Error in send-message handler:", error)
          socket.emit("error", "Failed to send message")
        }
      })

      // Handle user disconnect
      socket.on("disconnect", () => {
        try {
          const user = connectedUsers.get(socket.id)
          if (user) {
            connectedUsers.delete(socket.id)

            // Create system message for user leave
            const leaveMessage = {
              id: `system-${Date.now()}-${Math.random()}`,
              username: "System",
              content: `${user.username} left the chat`,
              timestamp: new Date(),
              type: "system" as const,
            }
            messages.push(leaveMessage)

            // Broadcast to all remaining users
            socket.broadcast.emit("user-left", {
              userId: socket.id,
              message: leaveMessage,
              users: Array.from(connectedUsers.values()),
            })

            console.log(`User ${user.username} disconnected`)
          }
        } catch (error) {
          console.error("Error in disconnect handler:", error)
        }
      })
    })
  }
  res.end()
}

export default SocketHandler 