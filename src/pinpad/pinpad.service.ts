import { NextFunction, Request, Response } from "express";
import { getPinpadConfig } from "./pinpad.config";
import { buildPaymentFrame, executeReverse } from "./pinpad.controller";
import { transactionMemoryService } from "./transaction-memory.service";
import {
  logPinPadOperation,
  parsePaymentResponse,
  sendToPinPad,
} from "./utils/funtions";

export const requestPayment = async (req: Request, res: Response) => {
  let transactionId: string | undefined;
  
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
    } = req.body;
    
    if (!monto || !montoBaseIva || !montoBaseNoIva || !iva || !cid) {
      return res.status(400).json({
        error:
          "Parámetros requeridos: monto, montoBaseIva, montoBaseNoIva, iva, cid",
        info: "MID y TID se toman de la configuración del servidor (se pueden override)",
      });
    }

    // Obtener configuración actual
    const config = getPinpadConfig();
    
    // Verificar que los datos del comercio estén configurados
    if (!config.merchantData.mid || !config.merchantData.tid || !config.securityData) {
      return res.status(400).json({
        error: "Configuración del comercio incompleta",
        message: "Debe configurar MID, TID y SecurityData primero",
        hint: "Use POST /pinpad/config/merchant para configurar los datos del comercio"
      });
    }

    const params = {
      monto: parseFloat(monto as string),
      montoBaseIva: parseFloat(montoBaseIva as string),
      montoBaseNoIva: parseFloat(montoBaseNoIva as string),
      iva: parseFloat(iva as string),
      mid: (midOverride as string) || config.merchantData.mid,
      tid: (tidOverride as string) || config.merchantData.tid,
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

    const { frame, transactionId: txnId } = buildPaymentFrame(params);
    transactionId = txnId;
    
    const response = await sendToPinPad(frame);
    const parsedResponse = parsePaymentResponse(response);
    
    console.log("Respuesta del PinPad:", parsedResponse.data);
    logPinPadOperation(parsedResponse.data);

    // 🔄 EVALUACIÓN AUTOMÁTICA DE REVERSO
    const evaluacion = transactionMemoryService.evaluarRespuestaParaReverso(
      transactionId, 
      parsedResponse.data
    );

    if (evaluacion.requiereReverso && evaluacion.transaction && evaluacion.escenario) {
      console.log(`🚨 Respuesta requiere reverso automático: ${evaluacion.escenario.descripcion}`);
      
      try {
        // Intentar reverso automático
        const resultadoReverso = await intentarReversoAutomatico(
          transactionId, 
          evaluacion.transaction, 
          evaluacion.escenario
        );

        // Marcar como reversada
        transactionMemoryService.marcarReversada(transactionId);

        return res.json({
          ...parsedResponse,
          reversoAutomatico: {
            ejecutado: true,
            escenario: evaluacion.escenario.id,
            descripcion: evaluacion.escenario.descripcion,
            resultado: resultadoReverso
          }
        });

      } catch (reversoError) {
        console.error("❌ Error en reverso automático:", reversoError);
        
        return res.status(400).json({
          ...parsedResponse,
          reversoAutomatico: {
            ejecutado: false,
            escenario: evaluacion.escenario.id,
            descripcion: evaluacion.escenario.descripcion,
            error: reversoError instanceof Error ? reversoError.message : "Error desconocido"
          }
        });
      }
    }

    // Si la respuesta es exitosa, marcar como completada
    if (parsedResponse.success) {
      transactionMemoryService.marcarCompletada(transactionId);
      res.json(parsedResponse);
    } else {
      res.status(400).json(parsedResponse);
    }

  } catch (error) {
    console.error("Error al procesar pago:", error);
    
    // Si hay error y tenemos transactionId, evaluar si necesita reverso
    if (transactionId) {
      const transaction = transactionMemoryService.obtenerTransaccion(transactionId);
      if (transaction) {
        console.log("🔄 Error en pago, evaluando necesidad de reverso por pérdida de comunicación...");
        
        try {
          await intentarReversoAutomatico(transactionId, transaction, {
            id: "perdida_comunicacion",
            descripcion: "Pérdida de comunicación durante el pago",
            tipoReverso: "04"
          });
          
          transactionMemoryService.marcarReversada(transactionId);
        } catch (reversoError) {
          console.error("❌ Error en reverso automático por comunicación:", reversoError);
        }
      }
    }

    res.status(500).json({
      error: "Error al procesar el pago",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};

/**
 * Ejecuta reverso automático con reintentos
 */
async function intentarReversoAutomatico(
  transactionId: string, 
  transaction: any, 
  escenario: any
): Promise<any> {
  const maxIntentos = 3;
  let intento = 1;

  while (intento <= maxIntentos) {
    try {
      console.log(`🔄 Intento ${intento}/${maxIntentos} de reverso automático para transacción ${transactionId}`);

      const parametrosReverso = {
        tipoReverso: escenario.tipoReverso as "03" | "04",
        secuencialOriginal: "", // Vacío para reversos automáticos
        numeroAutorizacion: "", // Vacío para reversos automáticos
        monto: transaction.monto,
        montoBaseIva: transaction.montoBaseIva,
        montoBaseNoIva: transaction.montoBaseNoIva,
        iva: transaction.iva,
        mid: transaction.mid,
        tid: transaction.tid,
        cid: transaction.cid,
        fechaOriginal: transaction.fecha,
        horaOriginal: transaction.hora,
        numeroFactura: transaction.numeroFactura
      };

      const resultado = await executeReverse(parametrosReverso);

      if (resultado.success) {
        console.log(`✅ Reverso automático exitoso en intento ${intento}`);
        return resultado;
      } else {
        console.log(`⚠️ Reverso automático falló en intento ${intento}:`, resultado.error);
        intento++;
      }

    } catch (error) {
      console.error(`❌ Error en intento ${intento} de reverso automático:`, error);
      intento++;
      
      if (intento <= maxIntentos) {
        // Esperar antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error(`Falló reverso automático después de ${maxIntentos} intentos`);
}

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

    // Obtener configuración actual
    const config = getPinpadConfig();
    
    // Verificar que los datos del comercio estén configurados
    if (!config.merchantData.mid || !config.merchantData.tid) {
      return res.status(400).json({
        error: "Configuración del comercio incompleta",
        message: "Debe configurar MID y TID primero",
        hint: "Use POST /pinpad/config/merchant para configurar los datos del comercio"
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
      mid: midOverride || config.merchantData.mid,
      tid: tidOverride || config.merchantData.tid,
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

export const getTransactionsInMemory = async (req: Request, res: Response) => {
  try {
    const transactions = transactionMemoryService.listarTransacciones();
    
    res.json({
      success: true,
      count: transactions.length,
      transactions: transactions.map(t => ({
        id: t.id,
        timestamp: t.timestamp,
        fecha: t.fecha,
        hora: t.hora,
        monto: t.monto,
        cid: t.cid,
        estado: t.estado,
        intentosReverso: t.intentosReverso
      }))
    });
  } catch (error) {
    console.error("Error al obtener transacciones:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener transacciones en memoria"
    });
  }
};

export const clearCompletedTransactions = async (req: Request, res: Response) => {
  try {
    transactionMemoryService.limpiarTransaccionesCompletadas();
    
    res.json({
      success: true,
      message: "Transacciones completadas limpiadas"
    });
  } catch (error) {
    console.error("Error al limpiar transacciones:", error);
    res.status(500).json({
      success: false,
      error: "Error al limpiar transacciones"
    });
  }
};
