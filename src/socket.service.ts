import { Server } from "socket.io";

export function initializeSocketService(io: Server) {
  io.on("connection", (socket) => {
    console.log("🔌 Cliente conectado:", socket.id);

    socket.on("webapp:message", (data) => {
      console.log("📱 Mensaje desde webapp:", data);
      io.emit("webapp:message", data);
    });

    socket.on("esp32:message", (data) => {
      console.log("📡 Mensaje desde ESP32:", data);
      io.emit("webapp:message", data);
    });

    socket.on("disconnect", () => {
      console.log("❌ Cliente desconectado:", socket.id);
    });
  });
}
