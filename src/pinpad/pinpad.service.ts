import { Request, Response } from "express";
import { PINPAD_CONFIG } from "./pinpad.config";
import { buildPaymentFrame } from "./pinpad.controller";
import { parsePaymentResponse, sendToPinPad } from "./utils/funtions";

export const requestPayment = async (req: Request, res: Response) => {
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
};
