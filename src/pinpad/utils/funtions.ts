import axios from "axios";
import net from "net";
import { PaymentResponse } from "../../types/pinpad";
import { PINPAD_CONFIG } from "../pinpad.config";

/**
 * Calcula el componente de seguridad (LL) para la trama
 * Basado en el ejemplo del documento, parece ser un checksum o hash
 */
export function calculateSecurityComponent(frame: string): string {
  // Los ejemplos del documento muestran un componente de 32 caracteres hexadecimales

  // Por ahora, vamos a generar un LRC (Longitudinal Redundancy Check)
  // que es común en protocolos de comunicación

  let lrc = 0;
  for (let i = 0; i < frame.length; i++) {
    lrc ^= frame.charCodeAt(i);
  }

  // El formato parece ser: "01" + datos + "02" (STX y ETX)
  // Convertir a hexadecimal y completar con datos
  const lrcHex = lrc.toString(16).padStart(2, "0").toUpperCase();

  // Generar un componente de seguridad de 32 caracteres
  // El patrón parece ser consistente en los ejemplos
  const securityData = PINPAD_CONFIG.securityData.padEnd(32, "0").substring(0, 30) + lrcHex;

  return securityData;
}

/**
 * Parsea la respuesta del proceso de pago
 */
export function parsePaymentResponse(response: string): PaymentResponse {
  try {
    // Remover los primeros 4 caracteres (longitud)
    const data = response.substring(4);

    const tipoMensaje = data.substring(0, 2);
    const codigoRespuesta = data.substring(2, 4);
    const codigoRed = data.substring(4, 6);
    const codigoAutorizador = data.substring(6, 8);
    const mensajeRespuesta = data.substring(8, 28).trim();
    const secuencial = data.substring(28, 34);
    const lote = data.substring(34, 40);
    const hora = data.substring(40, 46);
    const fecha = data.substring(46, 54);
    const numeroAutorizacion = data.substring(54, 60).trim();
    const terminalId = data.substring(60, 68).trim();
    const merchantId = data.substring(68, 83).trim();

    // Saltar campos opcionales y llegar a datos de tarjeta
    let offset = 83;
    offset += 12; // Valor interés
    offset += 80; // Mensaje publicidad
    offset += 3; // Código banco
    offset += 30; // Nombre banco
    offset += 25; // Nombre grupo tarjeta
    const modoLectura = data.substring(offset, offset + 2);
    offset += 2;
    const nombreTarjetahabiente = data.substring(offset, offset + 40).trim();
    offset += 40;
    offset += 12; // Monto fijo
    offset += 20; // App label
    offset += 20; // AID
    offset += 22; // Criptograma
    offset += 15; // Verificación PIN
    offset += 16; // ARQC
    offset += 10; // TVR
    offset += 4; // TSI
    const tarjetaTruncada = data.substring(offset, offset + 25).trim();
    offset += 25;
    const fechaVencimiento = data.substring(offset, offset + 4);

    const success = codigoRespuesta === "00" && codigoAutorizador === "00";

    return {
      success,
      message: success ? "Transacción aprobada" : mensajeRespuesta,
      data: {
        tipoMensaje,
        codigoRespuesta,
        codigoRed,
        codigoAutorizador,
        mensajeRespuesta,
        secuencial,
        lote,
        hora,
        fecha,
        numeroAutorizacion,
        terminalId,
        merchantId,
        tarjetaTruncada,
        fechaVencimiento,
        modoLectura,
        nombreTarjetahabiente,
      },
      rawResponse: response,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al parsear respuesta del PinPad",
      rawResponse: response,
    };
  }
}

export async function logPinPadOperation(logData: any) {
  try {
    const response = await axios.post(
      process.env.LOG_API_URL || "http://localhost:9000/pinpad",
      logData
    );
    console.log("✅ Log registrado exitosamente:", response.data);
  } catch (error) {
    console.error(
      "❌ Error al registrar el log:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Envía una trama al PinPad y espera la respuesta
 */
export async function sendToPinPad(frame: string): Promise<string> {
  const startTime = Date.now(); // Registrar el tiempo de inicio
  const pinpadIp = PINPAD_CONFIG.host; // IP del PinPad

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let responseData = "";

    const timeout = setTimeout(() => {
      client.destroy();
      const errorMessage = "Timeout al comunicarse con el PinPad";
      logPinPadOperation({
        operationType: frame.substring(0, 2), // Tipo de operación (primeros 2 caracteres de la trama)
        requestFrame: frame,
        responseFrame: null,
        responseCode: null,
        responseMessage: null,
        success: false,
        amount: null,
        merchantId: PINPAD_CONFIG.merchantData.mid,
        terminalId: PINPAD_CONFIG.merchantData.tid,
        cajaId: process.env.CAJA_ID || "CAJA001",
        cardNumber: null,
        authorizationNumber: null,
        batchNumber: null,
        sequentialNumber: null,
        invoiceNumber: null,
        metadata: { extraData: "Timeout" },
        responseTime: Date.now() - startTime,
        errorMessage,
        pinpadIp,
      });
      reject(new Error(errorMessage));
    }, PINPAD_CONFIG.timeout);

    client.connect(PINPAD_CONFIG.port, pinpadIp, () => {
      console.log("Conectado al PinPad");
      client.write(frame);
    });

    client.on("data", (data) => {
      responseData += data.toString();
      clearTimeout(timeout);
      client.destroy();

      // Registrar el log después de recibir la respuesta
      const responseTime = Date.now() - startTime;
      const responseCode = responseData.substring(2, 4); // Código de respuesta (posición 2-4)
      const success = responseCode === "00";

      logPinPadOperation({
        operationType: frame.substring(0, 2), // Tipo de operación (primeros 2 caracteres de la trama)
        requestFrame: frame,
        responseFrame: responseData,
        responseCode,
        responseMessage: success
          ? "Operación exitosa"
          : "Error en la operación",
        success,
        amount: parseFloat(frame.substring(12, 24)) / 100 || null, // Monto total (posición 12-24)
        merchantId: PINPAD_CONFIG.merchantData.mid,
        terminalId: PINPAD_CONFIG.merchantData.tid,
        cajaId: process.env.CAJA_ID || "CAJA001",
        cardNumber: responseData.substring(6, 31).trim() || null, // Tarjeta truncada (posición 6-31)
        authorizationNumber: responseData.substring(54, 60).trim() || null, // Número de autorización (posición 54-60)
        batchNumber: responseData.substring(34, 40) || null, // Lote (posición 34-40)
        sequentialNumber: responseData.substring(28, 34) || null, // Secuencial (posición 28-34)
        invoiceNumber: null, // Número de factura (opcional, depende del contexto)
        metadata: { extraData: "Información adicional" },
        responseTime,
        errorMessage: null,
        pinpadIp,
      });

      resolve(responseData);
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      logPinPadOperation({
        operationType: frame.substring(0, 2),
        requestFrame: frame,
        responseFrame: null,
        responseCode: null,
        responseMessage: null,
        success: false,
        amount: null,
        merchantId: PINPAD_CONFIG.merchantData.mid,
        terminalId: PINPAD_CONFIG.merchantData.tid,
        cajaId: process.env.CAJA_ID || "CAJA001",
        cardNumber: null,
        authorizationNumber: null,
        batchNumber: null,
        sequentialNumber: null,
        invoiceNumber: null,
        metadata: { extraData: "Error de conexión" },
        responseTime: Date.now() - startTime,
        errorMessage: err.message,
        pinpadIp,
      });
      reject(err);
    });

    client.on("close", () => {
      if (!responseData) {
        clearTimeout(timeout);
        const errorMessage = "Conexión cerrada sin respuesta";
        logPinPadOperation({
          operationType: frame.substring(0, 2),
          requestFrame: frame,
          responseFrame: null,
          responseCode: null,
          responseMessage: null,
          success: false,
          amount: null,
          merchantId: PINPAD_CONFIG.merchantData.mid,
          terminalId: PINPAD_CONFIG.merchantData.tid,
          cajaId: process.env.CAJA_ID || "CAJA001",
          cardNumber: null,
          authorizationNumber: null,
          batchNumber: null,
          sequentialNumber: null,
          invoiceNumber: null,
          metadata: { extraData: "Conexión cerrada" },
          responseTime: Date.now() - startTime,
          errorMessage,
          pinpadIp,
        });
        reject(new Error(errorMessage));
      }
    });
  });
}

