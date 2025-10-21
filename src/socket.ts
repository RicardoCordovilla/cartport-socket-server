import http from "http";
import { WebSocketServer } from "ws";
import { initializeSocketService } from "./socket.service";
import app from "./app";

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const PORT = 3010;

export const startSocketServer = () => {
  // httpServer.listen(PORT, '0.0.0.0', () => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Socket Server running on port ${PORT}`);
    initializeSocketService(wss);
    console.log("🔌 Socket service initialized");
  });
};
