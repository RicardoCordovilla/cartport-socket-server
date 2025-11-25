import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";

interface WebSocketWithId extends WebSocket {
  id?: string;
}

interface MessageData {
  to?: "esp" | "web" | "all";
  event?: string;
  from?: string;
  data?: {
    [key: string]: any;
  };
}

export function initializeSocketService(wss: WebSocketServer) {
  // Helper functions for broadcasting
  function broadcastString(str: string, excludeWs?: WebSocket) {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
        client.send(str);
      }
    }
  }

  function broadcastJSON(obj: MessageData, excludeWs?: WebSocket) {
    broadcastString(JSON.stringify(obj), excludeWs);
  }

  wss.on("connection", (ws: WebSocketWithId, req: IncomingMessage) => {
    // Generate a simple ID for the WebSocket connection
    ws.id = Math.random().toString(36).substring(2, 15);
    const clientAddress = req.socket.remoteAddress || "unknown";
    console.log("🟢 Cliente conectado:", ws.id, "desde", clientAddress);

    ws.on("message", (message) => {
      try {
        const text = Buffer.isBuffer(message)
          ? message.toString("utf8")
          : String(message);
        console.log("📩 Mensaje recibido:", text);

        let data: MessageData;
        try {
          data = JSON.parse(text);
        } catch {
          console.error("❌ Error parsing JSON message");
          return;
        }

        // Enhanced routing based on 'to' field
        const target = data.to || "all";

        // Log based on message type or source
        if (data.event === "webapp:message") {
          console.log("📱 Mensaje desde webapp:", data);
        } else if (data.event === "esp32:message" || data.from === "esp32") {
          console.log("📡 Mensaje desde ESP32:", data);
        }

        // Route messages to appropriate clients, avoiding echo to sender
        for (const client of wss.clients) {
          if (client.readyState !== WebSocket.OPEN || client === ws) continue;

          // Send based on target specification
          if (target === "all" || target === "web" || target === "esp") {
            client.send(JSON.stringify(data));
          }
        }
      } catch (error) {
        console.error("❌ Error processing message:", error);
      }
    });

    ws.on("close", () => {
      console.log("🔴 Cliente desconectado:", ws.id);
    });

    ws.on("error", (error) => {
      console.error("❌ WebSocket error para cliente", ws.id, ":", error);
    });
  });
}
