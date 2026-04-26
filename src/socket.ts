import http from "http";
import { Server } from "socket.io";
import { initializeSocketService } from "./socket.service";
import app from "./app";

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const PORT = process.env.PORT || 3010;

export const startSocketServer = () => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Socket Server running on port ${PORT}`);
    initializeSocketService(io);
    console.log("🔌 Socket service initialized");
  });
};
