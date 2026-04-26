import { Server, Socket } from "socket.io";

interface MessageData {
  to?: string;
  event?: string;
  from?: string;
  data?: {
    [key: string]: any;
  };
}

export function initializeSocketService(io: Server) {
  io.on("connection", (socket: Socket) => {
    const clientAddress = socket.handshake.address || "unknown";
    const token = socket.handshake.auth?.token;

    console.log("🟢 Cliente conectado:", socket.id, "desde", clientAddress);
    if (token) {
      console.log("🔑 Token recibido");
    }

    // Handle generic message event (mirrors previous ws.on("message"))
    socket.on("message", (data: MessageData) => {
      try {
        console.log("📩 Mensaje recibido:", data);
        console.log("📱 Mensaje desde cloud:", data);

        // Broadcast to all other clients (excluding sender)
        socket.broadcast.emit("message", data);
      } catch (error) {
        console.error("❌ Error processing message:", error);
      }
    });

    // Handle any custom event and broadcast to others
    socket.onAny((eventName: string, data: MessageData) => {
      if (eventName === "message") return; // Already handled above

      try {
        console.log(`📩 Evento '${eventName}' recibido:`, data);

        // Broadcast to all other clients (excluding sender)
        socket.broadcast.emit(eventName, data);
      } catch (error) {
        console.error(`❌ Error processing event '${eventName}':`, error);
      }
    });

    socket.on("disconnect", (reason: string) => {
      console.log("🔴 Cliente desconectado:", socket.id, "- Razón:", reason);
    });

    socket.on("error", (error: Error) => {
      console.error("❌ Socket error para cliente", socket.id, ":", error);
    });
  });

  // Helper function to broadcast to all connected clients
  function broadcastToAll(event: string, data: MessageData) {
    io.emit(event, data);
  }

  // Helper function to send to a specific socket by ID
  function sendToSocket(socketId: string, event: string, data: MessageData) {
    io.to(socketId).emit(event, data);
  }
}
