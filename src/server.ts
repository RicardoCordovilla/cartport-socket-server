import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
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
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  initializeSocketService(io);
  console.log("🔌 Socket service initialized");
});
