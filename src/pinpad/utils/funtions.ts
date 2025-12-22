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

/**
 * Parsea la respuesta de lectura de tarjeta del PinPad (LT)
 * Estructura de respuesta según documentación:
 * - Tipo de mensaje (02 AN): "LT" = Lectura de Tarjeta
 * - Código de respuesta (02 AN): 
 *   - "00" = Lectura exitosa
 *   - "01" = Error en trama
 *   - "02" = Error conexión Pinpad
 *   - "20" = Error durante proceso / Tarjeta no leída
 *   - "ER" = Error conexión Pinpad
 * - Modo de lectura (02 AN): "B" = Banda, "C" = Chip, "L" = Contactless
 * - BIN de tarjeta (06 AN): Primeros 6 dígitos de la tarjeta
 * - Tarjeta truncada (25 AN): Número de tarjeta enmascarado
 * - Fecha de vencimiento (04 AN): MMYY
 * - Nombre del tarjetahabiente (40 AN): Nombre del cliente
 * - Código de banco (03 AN): Código del banco emisor
 * - Nombre del banco (30 AN): Nombre del banco emisor
 * - Nombre grupo tarjeta (25 AN): Tipo de tarjeta (VISA, MASTERCARD, etc.)
 * - Track II encriptado (variable): Datos encriptados de la tarjeta
 */
export function parseReadCardResponse(response: string): {
  success: boolean;
  message: string;
  data: {
    tipoMensaje: string;
    codigoRespuesta: string;
    modoLectura: string;
    binTarjeta: string;
    tarjetaTruncada: string;
    fechaVencimiento: string;
    nombreTarjetahabiente: string;
    codigoBanco: string;
    nombreBanco: string;
    nombreGrupoTarjeta: string;
    trackIIEncriptado: string;
  };
  rawResponse: string;
} {
  try {
    // Remover los primeros 4 caracteres (longitud en hex)
    const data = response.substring(4);

    const tipoMensaje = data.substring(0, 2);
    const codigoRespuesta = data.substring(2, 4);
    
    // Si hay error, los demás campos pueden no estar presentes
    if (codigoRespuesta !== "00") {
      let mensajeError = "Error en lectura de tarjeta";
      switch (codigoRespuesta) {
        case "01":
          mensajeError = "Error en trama";
          break;
        case "02":
        case "ER":
          mensajeError = "Error conexión Pinpad";
          break;
        case "20":
          mensajeError = "Tarjeta no leída o cancelado por usuario";
          break;
        default:
          mensajeError = "Error desconocido";
      }
      
      return {
        success: false,
        message: mensajeError,
        data: {
          tipoMensaje,
          codigoRespuesta,
          modoLectura: "",
          binTarjeta: "",
          tarjetaTruncada: "",
          fechaVencimiento: "",
          nombreTarjetahabiente: "",
          codigoBanco: "",
          nombreBanco: "",
          nombreGrupoTarjeta: "",
          trackIIEncriptado: "",
        },
        rawResponse: response,
      };
    }

    // Parsear campos de respuesta exitosa
    let offset = 4; // Después de tipo mensaje y código respuesta
    
    const modoLectura = data.substring(offset, offset + 2).trim();
    offset += 2;
    
    const binTarjeta = data.substring(offset, offset + 6).trim();
    offset += 6;
    
    const tarjetaTruncada = data.substring(offset, offset + 25).trim();
    offset += 25;
    
    const fechaVencimiento = data.substring(offset, offset + 4).trim();
    offset += 4;
    
    const nombreTarjetahabiente = data.substring(offset, offset + 40).trim();
    offset += 40;
    
    const codigoBanco = data.substring(offset, offset + 3).trim();
    offset += 3;
    
    const nombreBanco = data.substring(offset, offset + 30).trim();
    offset += 30;
    
    const nombreGrupoTarjeta = data.substring(offset, offset + 25).trim();
    offset += 25;
    
    // El resto es el track II encriptado (variable)
    const trackIIEncriptado = data.substring(offset).trim();

    return {
      success: true,
      message: "Lectura de tarjeta exitosa",
      data: {
        tipoMensaje,
        codigoRespuesta,
        modoLectura,
        binTarjeta,
        tarjetaTruncada,
        fechaVencimiento,
        nombreTarjetahabiente,
        codigoBanco,
        nombreBanco,
        nombreGrupoTarjeta,
        trackIIEncriptado,
      },
      rawResponse: response,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al parsear respuesta de lectura de tarjeta",
      data: {
        tipoMensaje: "",
        codigoRespuesta: "",
        modoLectura: "",
        binTarjeta: "",
        tarjetaTruncada: "",
        fechaVencimiento: "",
        nombreTarjetahabiente: "",
        codigoBanco: "",
        nombreBanco: "",
        nombreGrupoTarjeta: "",
        trackIIEncriptado: "",
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
