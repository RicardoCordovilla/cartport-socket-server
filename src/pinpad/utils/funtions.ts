import axios from "axios";
import net from "net";
import { PaymentResponse, PaymentResponseData } from "../../types/pinpad";
import { getPinpadConfig } from "../pinpad.config";

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

  // Obtener configuración actual para el securityData
  const config = getPinpadConfig();
  
  // El formato parece ser: "01" + datos + "02" (STX y ETX)
  // Convertir a hexadecimal y completar con datos
  const lrcHex = lrc.toString(16).padStart(2, "0").toUpperCase();

  // Generar un componente de seguridad de 32 caracteres
  // El patrón parece ser consistente en los ejemplos
  const securityData =
    config.securityData.padEnd(32, "0").substring(0, 30) + lrcHex;

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
      data: {
        tipoMensaje: "",
        codigoRespuesta: "",
        codigoRed: "",
        codigoAutorizador: "",
        mensajeRespuesta: "Respuesta inválida",
        secuencial: "",
        lote: "",
        hora: "",
        fecha: "",
        numeroAutorizacion: "",
        terminalId: "",
        merchantId: "",
        tarjetaTruncada: "",
        fechaVencimiento: "",
        modoLectura: "",
        nombreTarjetahabiente: "",
      },
      rawResponse: response,
    };
  }
}

/**
 * Parsea la respuesta de configuración del PinPad (CP)
 * Estructura de respuesta:
 * - Tipo Mensaje (2 AN): "CP"
 * - Código Respuesta (2 N): "00" = éxito
 * - Mensaje Respuesta (20 AN): Descripción del resultado
 * - Componente Seguridad (32 AN): Hash de seguridad
 */
export function parseConfigResponse(response: string): {
  success: boolean;
  message: string;
  data: {
    tipoMensaje: string;
    codigoRespuesta: string;
    mensajeRespuesta: string;
  };
  rawResponse: string;
} {
  try {
    // Remover los primeros 4 caracteres (longitud en hex)
    const data = response.substring(4);

    const tipoMensaje = data.substring(0, 2);
    const codigoRespuesta = data.substring(2, 4);
    const mensajeRespuesta = data.substring(4, 24).trim();

    const success = codigoRespuesta === "00";

    return {
      success,
      message: success ? "Configuración aplicada correctamente" : mensajeRespuesta,
      data: {
        tipoMensaje,
        codigoRespuesta,
        mensajeRespuesta,
      },
      rawResponse: response,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al parsear respuesta de configuración",
      data: {
        tipoMensaje: "",
        codigoRespuesta: "",
        mensajeRespuesta: "Respuesta inválida",
      },
      rawResponse: response,
    };
  }
}

/**
 * Parsea la respuesta del proceso de control del PinPad (PC)
 * Estructura de respuesta según documentación:
 * - Tipo de mensaje (02 AN): "PC" = Proceso de control
 * - Código de respuesta de mensaje (02 AN): 
 *   - "00" = Ejecución exitosa
 *   - "01" = Error en trama
 *   - "02" = Error conexión Pinpad
 *   - "20" = Error durante proceso
 *   - "ER" = Error conexión Pinpad
 * - Filler (02 AN): Filler
 * - Mensaje de respuesta (20 AN): AUTORIZADO, ERROR EN TRAMA, ERR. CONEXIÓN PINPAD
 */
export function parseControlResponse(response: string): {
  success: boolean;
  message: string;
  data: {
    tipoMensaje: string;
    codigoRespuesta: string;
    filler: string;
    mensajeRespuesta: string;
  };
  rawResponse: string;
} {
  try {
    // Remover los primeros 4 caracteres (longitud en hex)
    const data = response.substring(4);

    const tipoMensaje = data.substring(0, 2);
    const codigoRespuesta = data.substring(2, 4);
    const filler = data.substring(4, 6);
    const mensajeRespuesta = data.substring(6, 26).trim();

    const success = codigoRespuesta === "00";

    // Mapear códigos de error a mensajes descriptivos
    let mensajeDescriptivo = mensajeRespuesta;
    if (!success) {
      switch (codigoRespuesta) {
        case "01":
          mensajeDescriptivo = mensajeRespuesta || "Error en trama";
          break;
        case "02":
        case "ER":
          mensajeDescriptivo = mensajeRespuesta || "Error conexión Pinpad";
          break;
        case "20":
          mensajeDescriptivo = mensajeRespuesta || "Error durante proceso";
          break;
        default:
          mensajeDescriptivo = mensajeRespuesta || "Error desconocido";
      }
    }

    return {
      success,
      message: success ? "Proceso de control ejecutado correctamente" : mensajeDescriptivo,
      data: {
        tipoMensaje,
        codigoRespuesta,
        filler,
        mensajeRespuesta,
      },
      rawResponse: response,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al parsear respuesta del proceso de control",
      data: {
        tipoMensaje: "",
        codigoRespuesta: "",
        filler: "",
        mensajeRespuesta: "Respuesta inválida",
      },
      rawResponse: response,
    };
  }
}

export async function logPinPadOperation(logData: PaymentResponseData) {
  try {
    // Obtener configuración actual para la URL del API de logs
    const config = getPinpadConfig();
    
    // Enviar los datos al servicio remoto usando la URL configurada
    const response = await axios.post(config.logApiUrl, logData);

    console.log(
      "✅ Log registrado exitosamente en el servicio remoto:",
      response.data
    );
  } catch (error) {
    console.error(
      "❌ Error al registrar el log en el servicio remoto:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Envía una trama al PinPad y espera la respuesta
 */
export async function sendToPinPad(frame: string): Promise<string> {
  const startTime = Date.now(); // Registrar el tiempo de inicio
  const config = getPinpadConfig(); // Obtener configuración actual
  const pinpadIp = config.host; // IP del PinPad desde configuración dinámica

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let responseData = "";

    const timeout = setTimeout(() => {
      client.destroy();
      const errorMessage = "Timeout al comunicarse con el PinPad";
      reject(new Error(errorMessage));
    }, config.timeout);

    client.connect(config.port, pinpadIp, () => {
      // console.log("Conectado al PinPad");
      client.write(frame);
    });

    client.on("data", (data) => {
      responseData += data.toString();
      clearTimeout(timeout);
      client.destroy();

      const responseTime = Date.now() - startTime;
      const responseCode = responseData.substring(2, 4); // Código de respuesta
      const success = responseCode === "00";

      resolve(responseData);
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    client.on("close", () => {
      if (!responseData) {
        clearTimeout(timeout);
        const errorMessage = "Conexión cerrada sin respuesta";
        reject(new Error(errorMessage));
      }
    });
  });
}
