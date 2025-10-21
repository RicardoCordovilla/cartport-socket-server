// src/index.ts
import express, { Request, Response } from "express";
import { PINPAD_CONFIG } from "./pinpad.config";
import {
  buildBasicConfigFrame,
  buildConfigFrame,
  buildControlFrame,
  buildPaymentFrame,
  buildReadCardFrame,
} from "./pinpad.controller";
import {
  parsePaymentResponse,
  sendToPinPad
} from "./utils/funtions";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
