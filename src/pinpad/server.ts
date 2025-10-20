// src/index.ts
import express, { Request, Response } from "express";
import net from "net";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configuración del PinPad
const PINPAD_CONFIG = {
  host: process.env.PINPAD_HOST || "192.168.100.198", // IP del PinPad
  port: parseInt(process.env.PINPAD_PORT || "9999"),
  timeout: 60000, // 60 segundos
  // Datos del comercio (desde Datafast)
  merchantData: {
    mid: process.env.MID || "",
    tid: process.env.TID || "",
    claveTecnica: process.env.CLAVE_TECNICA || "",
  },
  // Configuración de red del PinPad
  network: {
    ip: process.env.PINPAD_HOST,
    mask: "255.255.255.0",
    gateway: "192.168.100.1",
  },
};

// Interfaz para la respuesta del proceso de pago
interface PaymentResponse {
  success: boolean;
  message: string;
  data?: {
    tipoMensaje: string;
    codigoRespuesta: string;
    codigoRed: string;
    codigoAutorizador: string;
    mensajeRespuesta: string;
    secuencial: string;
    lote: string;
    hora: string;
    fecha: string;
    numeroAutorizacion: string;
    terminalId: string;
    merchantId: string;
    tarjetaTruncada: string;
    fechaVencimiento: string;
    modoLectura: string;
    nombreTarjetahabiente: string;
  };
  rawResponse?: string;
}

/**
 * Calcula el componente de seguridad (LL) para la trama
 * Basado en el ejemplo del documento, parece ser un checksum o hash
 */
function calculateSecurityComponent(frame: string): string {
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
  const securityData = process.env.SECURITY_LL || "";

  return securityData;
}

/**
 * Construye la trama de configuración del PinPad con componente de seguridad
 */
/**
 * Construye la trama de configuración del PinPad con componente de seguridad
 */
function buildConfigFrame(ip: string, mask: string, gateway: string): string {
  const tipo = "CP";
  const ipPadded = ip.padEnd(15, " ");
  const maskPadded = mask.padEnd(15, " ");
  const gatewayPadded = gateway.padEnd(15, " ");

  // Host y puerto (espacios en blanco para usar valores por defecto)
  const hostPrimary = "".padEnd(15, " ");
  const portPrimary = "".padEnd(6, " ");
  const hostAlternate = "".padEnd(15, " ");
  const portAlternate = "".padEnd(6, " ");

  // Fillers
  const filler1 = "".padEnd(15, " ");
  const filler2 = "".padEnd(6, " ");
  const filler3 = "".padEnd(15, " ");
  const filler4 = "".padEnd(6, " ");

  // Puerto de escucha (default 9999)
  const listenPort = "009999";

  const frame =
    tipo +
    ipPadded +
    maskPadded +
    gatewayPadded +
    hostPrimary +
    portPrimary +
    hostAlternate +
    portAlternate +
    filler1 +
    filler2 +
    filler3 +
    filler4 +
    listenPort;

  // Agregar componente de seguridad
  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  // Agregar longitud en hexadecimal al inicio
  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();

  console.log(`\n=== DEBUG CONFIG FRAME ===`);
  console.log(`Frame sin seguridad: ${frame.length} chars`);
  console.log(`Security component: ${securityComponent}`);
  console.log(`Frame completo: ${frameWithSecurity.length} chars`);
  console.log(`===========================\n`);

  return lengthHex + frameWithSecurity;
}

/**
 * Construye la trama de proceso de control
 */
function buildControlFrame(params: {
  lote: string;
  secuencial: string;
  mid: string;
  tid: string;
  cid: string;
}): string {
  const tipo = "PC";
  const lote = params.lote.padStart(6, "0");
  const secuencial = params.secuencial.padStart(6, "0");

  // CRÍTICO: El documento dice "Filler 12 N" pero debe ser espacios
  const filler1 = " ".repeat(12);

  const mid = params.mid.substring(0, 15).padEnd(15, " ");
  const tid = params.tid.substring(0, 8).padEnd(8, " ");

  // Filler 23 AN
  const filler2 = " ".repeat(23);

  const cid = params.cid.substring(0, 15).padEnd(15, " ");

  // Filler 01 N - Valor fijo "1"
  const filler3 = "1";

  const frame =
    tipo + lote + secuencial + filler1 + mid + tid + filler2 + cid + filler3;

  // Agregar componente de seguridad
  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  // La longitud debe ser: 88 + 32 = 120
  console.log(`\n=== DEBUG PROCESO CONTROL ===`);
  console.log(`Longitud sin seguridad: ${frame.length} (esperado: 88)`);
  console.log(`Tipo: '${tipo}'`);
  console.log(`Lote: '${lote}'`);
  console.log(`Secuencial: '${secuencial}'`);
  console.log(`Filler1 (12): length=${filler1.length}`);
  console.log(`MID: '${mid}' length=${mid.length}`);
  console.log(`TID: '${tid}' length=${tid.length}`);
  console.log(`Filler2 (23): length=${filler2.length}`);
  console.log(`CID: '${cid}' length=${cid.length}`);
  console.log(`Filler3: '${filler3}'`);
  console.log(`Security: ${securityComponent}`);
  console.log(`Longitud total: ${frameWithSecurity.length}`);
  console.log(`Trama completa: ${frameWithSecurity}`);
  console.log(`=============================\n`);

  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();
  return lengthHex + frameWithSecurity;
}

/**
 * Construye la trama de configuración básica
 */
function buildBasicConfigFrame(): string {
  const tipo = "CB";
  const frame = tipo;

  // Agregar componente de seguridad
  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();

  console.log(`\n=== DEBUG CONFIG BASICA ===`);
  console.log(`Frame: ${frame}`);
  console.log(`Security: ${securityComponent}`);
  console.log(`Total: ${frameWithSecurity.length} chars`);
  console.log(`===========================\n`);

  return lengthHex + frameWithSecurity;
}

/**
 * Construye la trama de lectura de tarjeta
 */
function buildReadCardFrame(): string {
  const tipo = "LT";
  const frame = tipo;

  // Agregar componente de seguridad
  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  console.log(`\n=== DEBUG LECTURA TARJETA ===`);
  console.log(`Frame: ${frame}`);
  console.log(`Security: ${securityComponent}`);
  console.log(`Total: ${frameWithSecurity.length} chars`);
  console.log(`=============================\n`);

  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();
  return lengthHex + frameWithSecurity;
}

/**
 * Construye la trama de proceso de pago
 */
function buildPaymentFrame(params: {
  monto: number;
  montoBaseIva: number;
  montoBaseNoIva: number;
  iva: number;
  mid: string;
  tid: string;
  cid: string;
  numeroFactura?: string;
}): string {
  // Tipo de mensaje y transacción
  const tipo = "PP";
  const tipoTransaccion = "01"; // Compra corriente
  const codigoRed = "1"; // Datafast (1 carácter)
  const codigoDiferido = "00"; // Corriente
  const plazoDiferido = "00";
  const mesesGracia = "00";
  const filler1 = " ";

  // Montos (12 dígitos: 10 enteros, 2 decimales, sin puntuación)
  const montoTotal = Math.round(params.monto * 100)
    .toString()
    .padStart(12, "0");
  const montoBase12 = Math.round(params.montoBaseIva * 100)
    .toString()
    .padStart(12, "0");
  const montoBase0 = Math.round(params.montoBaseNoIva * 100)
    .toString()
    .padStart(12, "0");
  const impuestoIva = Math.round(params.iva * 100)
    .toString()
    .padStart(12, "0");

  // Campos opcionales - 12 caracteres cada uno (espacios cuando no aplican)
  const impuestoServicio = " ".repeat(12);
  const propina = " ".repeat(12);
  const montoFijo = " ".repeat(12);

  // Secuencial - 6 caracteres (espacios para compras nuevas)
  const secuencial = " ".repeat(6);

  // Fecha y hora actual - IMPORTANTE: formato correcto
  const now = new Date();
  const hora =
    now.getHours().toString().padStart(2, "0") +
    now.getMinutes().toString().padStart(2, "0") +
    now.getSeconds().toString().padStart(2, "0");
  const fecha =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");

  // Número de autorización - 6 caracteres (espacios para compras nuevas)
  const numeroAutorizacion = " ".repeat(6);

  // Identificadores - deben mantener exactamente las longitudes especificadas
  const mid = params.mid.substring(0, 15).padEnd(15, " ");
  const tid = params.tid.substring(0, 8).padEnd(8, " ");
  const cid = params.cid.substring(0, 15).padEnd(15, " ");

  // OTT - 10 caracteres (espacios cuando no aplica)
  const ott = " ".repeat(10);

  // Número de factura - 15 caracteres
  const numeroFactura = (params.numeroFactura || "")
    .substring(0, 15)
    .padEnd(15, " ");

  // Push vendedor - 15 caracteres (espacios cuando no aplica)
  const pushVendedor = " ".repeat(15);

  // Filler final - 20 caracteres
  const filler2 = " ".repeat(20);

  // Construir la trama en el orden exacto según la especificación
  const frame =
    tipo + // 2 - PP
    tipoTransaccion + // 2 - 01
    codigoRed + // 1 - 1
    codigoDiferido + // 2 - 00
    plazoDiferido + // 2 - 00
    mesesGracia + // 2 - 00
    filler1 + // 1 - espacio
    montoTotal + // 12
    montoBase12 + // 12
    montoBase0 + // 12
    impuestoIva + // 12
    impuestoServicio + // 12
    propina + // 12
    montoFijo + // 12
    secuencial + // 6
    hora + // 6
    fecha + // 8
    numeroAutorizacion + // 6
    mid + // 15
    tid + // 8
    cid + // 15
    ott + // 10
    numeroFactura + // 15
    pushVendedor + // 15
    filler2; // 20

  // Agregar componente de seguridad
  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  // Total esperado: 220 + 32 = 252 caracteres
  console.log(`\n=== DEBUG TRAMA PAGO ===`);
  console.log(`Longitud sin seguridad: ${frame.length} (esperado: 220)`);
  console.log(`Tipo: ${tipo}`);
  console.log(`Transacción: ${tipoTransaccion}`);
  console.log(`Red: ${codigoRed}`);
  console.log(`Diferido: ${codigoDiferido}`);
  console.log(`Monto Total: ${montoTotal} (${params.monto})`);
  console.log(`Base 12%: ${montoBase12} (${params.montoBaseIva})`);
  console.log(`Base 0%: ${montoBase0} (${params.montoBaseNoIva})`);
  console.log(`IVA: ${impuestoIva} (${params.iva})`);
  console.log(`Hora: ${hora}`);
  console.log(`Fecha: ${fecha}`);
  console.log(`MID: '${mid}'`);
  console.log(`TID: '${tid}'`);
  console.log(`CID: '${cid}'`);
  console.log(`Factura: '${numeroFactura}'`);
  console.log(`Security: ${securityComponent}`);
  console.log(`Longitud total: ${frameWithSecurity.length}`);
  console.log(`===================\n`);

  // Agregar longitud en hexadecimal al inicio
  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();

  return lengthHex + frameWithSecurity;
}

/**
 * Parsea la respuesta del proceso de pago
 */
function parsePaymentResponse(response: string): PaymentResponse {
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

/**
 * Envía una trama al PinPad y espera la respuesta
 */
function sendToPinPad(frame: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let responseData = "";

    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error("Timeout al comunicarse con el PinPad"));
    }, PINPAD_CONFIG.timeout);

    client.connect(PINPAD_CONFIG.port, PINPAD_CONFIG.host, () => {
      console.log("Conectado al PinPad");
      client.write(frame);
    });

    client.on("data", (data) => {
      responseData += data.toString();
      clearTimeout(timeout);
      client.destroy();
      resolve(responseData);
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    client.on("close", () => {
      if (!responseData) {
        clearTimeout(timeout);
        reject(new Error("Conexión cerrada sin respuesta"));
      }
    });
  });
}

// ENDPOINTS

/**
 * POST /api/pinpad/config
 * Configura el PinPad con IP, máscara y gateway
 */
app.post("/api/pinpad/config", async (req: Request, res: Response) => {
  try {
    const { ip, mask, gateway } = req.body;

    if (!ip || !mask || !gateway) {
      return res.status(400).json({
        error: "Se requieren los campos: ip, mask, gateway",
      });
    }

    const frame = buildConfigFrame(ip, mask, gateway);
    const response = await sendToPinPad(frame);

    res.json({
      success: true,
      message: "PinPad configurado exitosamente",
      response: response,
    });
  } catch (error) {
    console.error("Error al configurar PinPad:", error);
    res.status(500).json({
      error: "Error al configurar el PinPad",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

/**
 * GET /api/pinpad/payment
 * Procesa un pago a través del PinPad
 * Query params: monto, montoBaseIva, montoBaseNoIva, iva, cid, numeroFactura (opcional)
 * MID y TID se toman de la configuración del servidor
 */
app.get("/api/pinpad/payment", async (req: Request, res: Response) => {
  try {
    const {
      monto,
      montoBaseIva,
      montoBaseNoIva,
      iva,
      cid,
      numeroFactura,
      // Permitir override de MID/TID si es necesario
      mid: midOverride,
      tid: tidOverride,
    } = req.query;

    // Validaciones
    if (!monto || !montoBaseIva || !montoBaseNoIva || !iva || !cid) {
      return res.status(400).json({
        error:
          "Parámetros requeridos: monto, montoBaseIva, montoBaseNoIva, iva, cid",
        info: "MID y TID se toman de la configuración del servidor (se pueden override)",
      });
    }

    const params = {
      monto: parseFloat(monto as string),
      montoBaseIva: parseFloat(montoBaseIva as string),
      montoBaseNoIva: parseFloat(montoBaseNoIva as string),
      iva: parseFloat(iva as string),
      mid: (midOverride as string) || PINPAD_CONFIG.merchantData.mid,
      tid: (tidOverride as string) || PINPAD_CONFIG.merchantData.tid,
      cid: cid as string,
      numeroFactura: numeroFactura as string | undefined,
    };

    // Validar que los montos sean números válidos
    if (
      isNaN(params.monto) ||
      isNaN(params.montoBaseIva) ||
      isNaN(params.montoBaseNoIva) ||
      isNaN(params.iva)
    ) {
      return res.status(400).json({
        error: "Los montos deben ser números válidos",
      });
    }

    console.log("Procesando pago:", params);

    const frame = buildPaymentFrame(params);
    const response = await sendToPinPad(frame);
    const parsedResponse = parsePaymentResponse(response);

    if (parsedResponse.success) {
      res.json(parsedResponse);
    } else {
      res.status(400).json(parsedResponse);
    }
  } catch (error) {
    console.error("Error al procesar pago:", error);
    res.status(500).json({
      error: "Error al procesar el pago",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

/**
 * GET /api/pinpad/health
 * Verifica el estado del servicio
 */
app.get("/api/pinpad/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "PinPad Service",
    timestamp: new Date().toISOString(),
    config: {
      host: PINPAD_CONFIG.host,
      port: PINPAD_CONFIG.port,
      merchantData: {
        mid: PINPAD_CONFIG.merchantData.mid,
        tid: PINPAD_CONFIG.merchantData.tid,
      },
      network: PINPAD_CONFIG.network,
    },
  });
});

/**
 * POST /api/pinpad/init
 * Inicializa el PinPad con la configuración de red correcta
 */
app.post("/api/pinpad/init", async (req: Request, res: Response) => {
  try {
    const { ip, mask, gateway } = req.body;

    const config = {
      ip: ip || PINPAD_CONFIG.network.ip,
      mask: mask || PINPAD_CONFIG.network.mask,
      gateway: gateway || PINPAD_CONFIG.network.gateway,
    };

    console.log("Inicializando PinPad con configuración:", config);

    const frame = buildConfigFrame(config.ip, config.mask, config.gateway);
    const response = await sendToPinPad(frame);

    res.json({
      success: true,
      message: "PinPad inicializado exitosamente",
      config,
      response: response,
    });
  } catch (error) {
    console.error("Error al inicializar PinPad:", error);
    res.status(500).json({
      error: "Error al inicializar el PinPad",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

/**
 * POST /api/pinpad/control
 * Proceso de control - Cierre de lote (debe hacerse antes de procesar pagos)
 */
app.post("/api/pinpad/control", async (req: Request, res: Response) => {
  try {
    const { lote, secuencial, mid, tid, cid } = req.body;

    const params = {
      lote: lote || "000001",
      secuencial: secuencial || "000001",
      mid: mid || PINPAD_CONFIG.merchantData.mid,
      tid: tid || PINPAD_CONFIG.merchantData.tid,
      cid: cid || "CID001",
    };

    console.log("Ejecutando proceso de control:", params);

    const frame = buildControlFrame(params);
    const response = await sendToPinPad(frame);

    // Parsear respuesta
    const frameData = response.substring(4);
    const tipoMensaje = frameData.substring(0, 2);
    const codigoRespuesta = frameData.substring(2, 4);
    const mensajeRespuesta = frameData.substring(6, 26).trim();

    res.json({
      success: codigoRespuesta === "00",
      tipoMensaje,
      codigoRespuesta,
      mensajeRespuesta,
      rawResponse: response,
    });
  } catch (error) {
    console.error("Error en proceso de control:", error);
    res.status(500).json({
      error: "Error en proceso de control",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

/**
 * GET /api/pinpad/config-info
 * Obtiene la configuración básica del PinPad
 */
app.get("/api/pinpad/config-info", async (req: Request, res: Response) => {
  try {
    console.log("Solicitando configuración básica del PinPad");

    const frame = buildBasicConfigFrame();
    const response = await sendToPinPad(frame);

    // Parsear respuesta
    const frameData = response.substring(4);
    const tipoMensaje = frameData.substring(0, 2);
    const codigoRespuesta = frameData.substring(2, 4);

    res.json({
      success: codigoRespuesta === "00",
      tipoMensaje,
      codigoRespuesta,
      rawResponse: response,
      info: frameData.substring(4),
    });
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    res.status(500).json({
      error: "Error al obtener configuración",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

/**
 * GET /api/pinpad/read-card
 * Lectura de tarjeta (más simple que proceso de pago)
 */
app.get("/api/pinpad/read-card", async (req: Request, res: Response) => {
  try {
    console.log("Solicitando lectura de tarjeta");

    const frame = buildReadCardFrame();
    const response = await sendToPinPad(frame);

    // Parsear respuesta
    const frameData = response.substring(4);
    const tipoMensaje = frameData.substring(0, 2);
    const codigoRespuesta = frameData.substring(2, 4);
    const codigoRedCorriente = frameData.substring(4, 5);
    const codigoRedDiferido = frameData.substring(5, 6);
    const tarjetaTruncada = frameData.substring(6, 31).trim();
    const fechaVencimiento = frameData.substring(31, 35);
    const tarjetaEncriptada = frameData.substring(35, 75).trim();
    const mensajeRespuesta = frameData.substring(75, 95).trim();

    res.json({
      success: codigoRespuesta === "00",
      tipoMensaje,
      codigoRespuesta,
      codigoRedCorriente,
      codigoRedDiferido,
      tarjetaTruncada,
      fechaVencimiento,
      tarjetaEncriptada,
      mensajeRespuesta,
      rawResponse: response,
    });
  } catch (error) {
    console.error("Error en lectura de tarjeta:", error);
    res.status(500).json({
      error: "Error en lectura de tarjeta",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

/**
 * GET /api/pinpad/debug-frame
 * Genera y muestra la trama sin enviarla (para debugging)
 */
app.get("/api/pinpad/debug-frame", (req: Request, res: Response) => {
  try {
    const {
      monto,
      montoBaseIva,
      montoBaseNoIva,
      iva,
      mid,
      tid,
      cid,
      numeroFactura,
    } = req.query;

    if (
      !monto ||
      !montoBaseIva ||
      !montoBaseNoIva ||
      !iva ||
      !mid ||
      !tid ||
      !cid
    ) {
      return res.status(400).json({
        error:
          "Parámetros requeridos: monto, montoBaseIva, montoBaseNoIva, iva, mid, tid, cid",
      });
    }

    const params = {
      monto: parseFloat(monto as string),
      montoBaseIva: parseFloat(montoBaseIva as string),
      montoBaseNoIva: parseFloat(montoBaseNoIva as string),
      iva: parseFloat(iva as string),
      mid: mid as string,
      tid: tid as string,
      cid: cid as string,
      numeroFactura: numeroFactura as string | undefined,
    };

    const frame = buildPaymentFrame(params);
    const frameWithoutLength = frame.substring(4);

    // Analizar cada campo con offset correcto
    let offset = 0;

    const fields = {
      tipoMensaje: frameWithoutLength.substring(offset, offset + 2),
      tipoTransaccion: frameWithoutLength.substring(offset + 2, offset + 4),
      codigoRed: frameWithoutLength.substring(offset + 4, offset + 5),
      codigoDiferido: frameWithoutLength.substring(offset + 5, offset + 7),
      plazoDiferido: frameWithoutLength.substring(offset + 7, offset + 9),
      mesesGracia: frameWithoutLength.substring(offset + 9, offset + 11),
      filler1: frameWithoutLength.substring(offset + 11, offset + 12),
    };

    offset = 12;
    const montos = {
      montoTotal: frameWithoutLength.substring(offset, offset + 12),
      montoBase12: frameWithoutLength.substring(offset + 12, offset + 24),
      montoBase0: frameWithoutLength.substring(offset + 24, offset + 36),
      impuestoIva: frameWithoutLength.substring(offset + 36, offset + 48),
      impuestoServicio: frameWithoutLength.substring(offset + 48, offset + 60),
      propina: frameWithoutLength.substring(offset + 60, offset + 72),
      montoFijo: frameWithoutLength.substring(offset + 72, offset + 84),
    };

    offset = 96; // 12 + 84
    const temporal = {
      secuencial: frameWithoutLength.substring(offset, offset + 6),
      hora: frameWithoutLength.substring(offset + 6, offset + 12),
      fecha: frameWithoutLength.substring(offset + 12, offset + 20),
      numeroAutorizacion: frameWithoutLength.substring(
        offset + 20,
        offset + 26
      ),
    };

    offset = 122; // 96 + 26
    const identificadores = {
      mid: frameWithoutLength.substring(offset, offset + 15),
      tid: frameWithoutLength.substring(offset + 15, offset + 23),
      cid: frameWithoutLength.substring(offset + 23, offset + 38),
      ott: frameWithoutLength.substring(offset + 38, offset + 48),
      numeroFactura: frameWithoutLength.substring(offset + 48, offset + 63),
      pushVendedor: frameWithoutLength.substring(offset + 63, offset + 78),
      filler2: frameWithoutLength.substring(offset + 78, offset + 98),
    };

    const analysis = {
      lengthHex: frame.substring(0, 4),
      expectedLength: 220,
      actualLength: frame.length - 4,
      lengthMatch: frame.length - 4 === 220,
      fields,
      montos,
      temporal,
      identificadores,
      fullFrame: frame,
      frameWithoutLength: frameWithoutLength,
      hexDump: frameWithoutLength
        .split("")
        .map((c, i) => {
          if (i % 50 === 0) return "\n" + c;
          return c;
        })
        .join(""),
    };

    res.json(analysis);
  } catch (error) {
    res.status(500).json({
      error: "Error al generar trama",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servicio PinPad iniciado en puerto ${PORT}`);
  console.log(
    `📍 PinPad configurado en ${PINPAD_CONFIG.host}:${PINPAD_CONFIG.port}`
  );
  console.log(
    `🏪 Comercio: MID=${PINPAD_CONFIG.merchantData.mid}, TID=${PINPAD_CONFIG.merchantData.tid}`
  );
  console.log(`\nEndpoints disponibles:`);
  console.log(`  GET  /api/pinpad/health - Estado del servicio`);
  console.log(
    `  POST /api/pinpad/init - Inicializar PinPad (configuración de red)`
  );
  console.log(
    `  POST /api/pinpad/control - Proceso de control (cierre de lote)`
  );
  console.log(
    `  GET  /api/pinpad/config-info - Obtener configuración del PinPad`
  );
  console.log(`  GET  /api/pinpad/read-card - Lectura de tarjeta`);
  console.log(`  GET  /api/pinpad/payment - Procesar pago`);
  console.log(`  GET  /api/pinpad/debug-frame - Debug de trama (sin enviar)`);
  console.log(`\n⚠️  IMPORTANTE:`);
  console.log(`  - El PinPad debe estar precargado por Datafast con MID/TID`);
  console.log(`  - Verificar conectividad del PinPad con host de Datafast`);
  console.log(`  - Ejecutar proceso de control antes del primer pago del día`);
});
