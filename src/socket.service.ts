import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { parsePaymentResponse, sendToPinPad } from "./pinpad/utils/funtions";
import { buildPaymentFrame } from "./pinpad/pinpad.controller";
import { getPinpadConfig } from "./pinpad/pinpad.config";
import { printPaymentTicket } from "./printer/tickets";

interface WebSocketWithId extends WebSocket {
  id?: string;
}

interface MessageData {
  to?: "esp" | "web" | "all";
  event?: string;
  from?: string;
  data?: {
    type?: string;
    method?: string;
    totalPrice?: number; // Hacer opcional para mensajes que no requieren precio
    cartQuantity?: number;
    message?: string;
    error?: string;
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
          if (data.data) {
            if (data.data.type === "navigate" && data.data.method === "card") {
              // Validar que totalPrice esté definido
              if (!data.data.totalPrice || data.data.totalPrice <= 0) {
                console.error("❌ totalPrice no válido:", data.data.totalPrice);
                broadcastJSON({
                  event: "webapp:message",
                  data: {
                    type: "card_payment_error",
                    message: "Monto total no válido",
                  },
                });
                return;
              }

              // Obtener configuración actual del PinPad
              const config = getPinpadConfig();
              
              // Verificar que la configuración esté completa
              if (!config.merchantData.mid || !config.merchantData.tid || !config.securityData) {
                console.error("❌ Configuración del PinPad incompleta");
                broadcastJSON({
                  event: "webapp:message",
                  data: {
                    type: "card_payment_error",
                    message: "Configuración del PinPad incompleta",
                  },
                });
                return;
              }

              const totalPrice = data.data.totalPrice;
              const params = {
                monto: totalPrice,
                montoBaseIva: totalPrice * 0.15,
                montoBaseNoIva: totalPrice * 0.15,
                iva: 15,
                mid: config.merchantData.mid,
                tid: config.merchantData.tid,
                cid: "CAJA01",
                numeroFactura: "1233454",
              };
              const frame = buildPaymentFrame(params);
              sendToPinPad(frame).then((response) => {
                const parsedResponse = parsePaymentResponse(response);
                console.log("Respuesta del PinPad:", parsedResponse.data);
                if (
                  parsedResponse.data.codigoRespuesta === "00" &&
                  parsedResponse.data.mensajeRespuesta.includes("APROBADA")
                ) {
                  broadcastJSON({
                    event: "webapp:message",
                    data: {
                      type: "card_payment_success",
                      totalPrice: 0,
                    },
                  });
                }
                if (
                  parsedResponse.data.codigoRespuesta === "00" &&
                  parsedResponse.data.mensajeRespuesta.includes("RECHAZADA")
                ) {
                  broadcastJSON({
                    event: "webapp:message",
                    data: {
                      type: "card_payment_error",
                      totalPrice: 0,
                    },
                  });
                }
              }).catch((error) => {
                console.error("❌ Error en comunicación con PinPad:", error);
                broadcastJSON({
                  event: "webapp:message",
                  data: {
                    type: "card_payment_error",
                    message: "Error de comunicación con PinPad",
                    totalPrice: 0,
                  },
                });
              });
            }

            if (data.data.type === "print_ticket") {
              // Validar que totalPrice esté definido
              if (!data.data.totalPrice || data.data.totalPrice <= 0) {
                console.error("❌ totalPrice no válido para impresión:", data.data.totalPrice);
                broadcastJSON({
                  event: "webapp:message",
                  data: {
                    type: "print_error",
                    message: "Monto total no válido para impresión",
                  },
                });
                return;
              }

              const total = data.data.totalPrice;
              const subtotal = parseFloat((total / 1.15).toFixed(2));
              const tax = parseFloat((total - subtotal).toFixed(2));
              const paid = data.data.insertedAmount || total;
              const change = paid - total;
              
              // Usar la nueva función unificada de impresión con ESC/POS para corte automático
              printPaymentTicket(
                { 
                  type: 'escpos'  // Cambiar de 'usb' a 'escpos' para corte automático real
                  // vendorId y productId se detectan automáticamente
                },
                {
                  companyName: "SERVICIOS DE GESTION AEROPORTUARIA",
                  location: "AEROGERPSA S.A.\nVia a Tababela",
                  airportName: "AEROPUERTO INT. MARISCAL SUCRE - QUITO",
                  phoneNumber: "022818462",
                  ticketNumber: `A${Date.now().toString().slice(-9)}`, // Número único basado en timestamp
                  date: new Date().toLocaleDateString('es-EC'),
                  time: new Date().toLocaleTimeString('es-EC'),
                  serviceType: "Coche Portaequipajes",
                  subtotal: subtotal,
                  tax: tax,
                  taxRate: 15,
                  total: total,
                  paid: paid,
                  change: change,
                  changeError: 0.0,
                  website: "www.aerogerpsa.com",
                }
              )
                .then(() => {
                  console.log("✅ Ticket impreso correctamente por USB");
                  // Notificar a la webapp que la impresión fue exitosa
                  broadcastJSON({
                    event: "webapp:message",
                    data: {
                      type: "print_success",
                      message: "Ticket impreso correctamente",
                    },
                  });
                })
                .catch((err) => {
                  console.error("❌ Error imprimiendo ticket:", err);
                  // Notificar a la webapp que hubo un error en la impresión
                  broadcastJSON({
                    event: "webapp:message",
                    data: {
                      type: "print_error",
                      message: "Error al imprimir ticket",
                      error: err.message,
                    },
                  });
                });
            }
          }
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
