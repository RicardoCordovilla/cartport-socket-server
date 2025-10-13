import http from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer} from "ws";
import { initializeSocketService } from "./socket.service";

const app = express();
app.use(
  cors({
    // origin: ["http://localhost:5173", "http://192.168.100.191:5173"],
    origin: "*"
  })
);
app.use(express.json());

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const PORT = 3010;

// httpServer.listen(PORT, '0.0.0.0', () => {
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  initializeSocketService(wss);
  console.log("🔌 Socket service initialized");
});
