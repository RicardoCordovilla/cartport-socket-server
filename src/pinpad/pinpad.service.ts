import { NextFunction, Request, Response } from "express";
import { PINPAD_CONFIG } from "./pinpad.config";
import { buildPaymentFrame, executeReverse } from "./pinpad.controller";
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

export const processReverse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      tipoReverso,
      secuencialOriginal,
      numeroAutorizacion,
      monto,
      montoBaseIva,
      montoBaseNoIva,
      iva,
      cid,
      fechaOriginal,
      horaOriginal,
      numeroFactura,
      mid: midOverride,
      tid: tidOverride,
    } = req.body;

    const isAnulacion = tipoReverso === "03";

    if (
      !tipoReverso ||
      !monto ||
      !montoBaseIva ||
      !montoBaseNoIva ||
      !iva ||
      !cid ||
      !fechaOriginal ||
      !horaOriginal ||
      (isAnulacion && (!secuencialOriginal || !numeroAutorizacion))
    ) {
      return res.status(400).json({
        error:
          "Parámetros requeridos: tipoReverso, secuencialOriginal, numeroAutorizacion, monto, montoBaseIva, montoBaseNoIva, iva, cid, fechaOriginal, horaOriginal",
        template: {
          tipoReverso: "03 o 04",
          secuencialOriginal: "000001",
          numeroAutorizacion: "123456",
          monto: 100.0,
          montoBaseIva: 89.29,
          montoBaseNoIva: 0.0,
          iva: 10.71,
          cid: "CID001",
          fechaOriginal: "20251019",
          horaOriginal: "143000",
          numeroFactura: "FAC-001",
        },
      });
    }

    if (tipoReverso !== "03" && tipoReverso !== "04") {
      return res.status(400).json({
        error:
          'tipoReverso debe ser "03" (Anulación) o "04" (Reverso Automático)',
      });
    }

    const params = {
      tipoReverso: tipoReverso as "03" | "04",
      secuencialOriginal,
      numeroAutorizacion,
      monto: parseFloat(monto),
      montoBaseIva: parseFloat(montoBaseIva),
      montoBaseNoIva: parseFloat(montoBaseNoIva),
      iva: parseFloat(iva),
      mid: midOverride || PINPAD_CONFIG.merchantData.mid,
      tid: tidOverride || PINPAD_CONFIG.merchantData.tid,
      cid,
      fechaOriginal,
      horaOriginal,
      numeroFactura,
    };

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

    console.log(
      `Procesando ${tipoReverso === "03" ? "Anulación" : "Reverso"}:`,
      params
    );

    const result = await executeReverse(params);

    if (result.success) {
      res.json({
        ...result,
        message:
          tipoReverso === "03"
            ? "Anulación procesada exitosamente"
            : "Reverso procesado exitosamente",
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error al procesar reverso:", error);
    res.status(500).json({
      error: "Error al procesar el reverso",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
    next(error);
  }
};
