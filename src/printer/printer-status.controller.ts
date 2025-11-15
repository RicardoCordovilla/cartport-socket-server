import { Request, Response } from "express";
import { 
  checkPrinterStatus, 
  checkComprehensivePrinterStatus,
  checkPrinterByTest,
  PrinterStatus
} from "./printer-status.service";

/**
 * Get current printer status using Bixolon BK3 specific commands
 */
export const getPrinterStatus = async (req: Request, res: Response) => {
  try {
    const { devicePath, baudRate = 115200, method = "bixolon" } = req.query;

    if (!devicePath) {
      return res.status(400).json({
        error: "Device path is required",
        example: "/printer/status?devicePath=/dev/tty.usbserial-1410"
      });
    }

    let status: PrinterStatus;

    // Permitir elegir el método de verificación
    if (method === "connectivity") {
      status = await checkPrinterByTest(devicePath as string, Number(baudRate));
    } else {
      status = await checkPrinterStatus(devicePath as string, Number(baudRate));
    }

    // Determinar el código de respuesta HTTP basado en el tipo de problema
    let httpStatus = 200;
    let success = true;

    if (status.connectionError) {
      httpStatus = 503; // Service Unavailable
      success = false;
    } else if (status.paperOut || status.coverOpen) {
      httpStatus = 422; // Unprocessable Entity - requiere acción del usuario
      success = false;
    } else if (status.paperNearEnd) {
      httpStatus = 200; // OK pero con advertencia
      success = true;
    } else if (status.error || status.generalError || status.cutterError) {
      httpStatus = 500; // Internal Server Error - error de hardware
      success = false;
    }

    res.status(httpStatus).json({
      success,
      status,
      message: getBixolonStatusMessage(status),
      method: method === "connectivity" ? "Prueba de conectividad" : "Comandos específicos Bixolon BK3"
    });

  } catch (error) {
    console.error("Error getting Bixolon printer status:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while checking Bixolon printer status",
      details: error instanceof Error ? error.message : "Unknown error",
      status: {
        paperOut: false,
        paperNearEnd: false,
        error: false,
        generalError: false,
        connectionError: true,
        timestamp: new Date(),
        commandUsed: 'ERROR',
      }
    });
  }
};

/**
 * Get comprehensive printer status using multiple Bixolon commands
 */
export const getComprehensivePrinterStatus = async (req: Request, res: Response) => {
  try {
    const { devicePath, baudRate = 115200 } = req.query;

    if (!devicePath) {
      return res.status(400).json({
        error: "Device path is required"
      });
    }

    const result = await checkComprehensivePrinterStatus(
      devicePath as string, 
      Number(baudRate)
    );

    // Determinar el estado general basado en los resultados de Bixolon
    const bixStatus = result.bixolonStatus;
    const connStatus = result.connectivityTest;
    
    const hasConnectionIssues = bixStatus.connectionError && connStatus.connectionError;
    const hasHardwareIssues = bixStatus.paperOut || bixStatus.coverOpen || bixStatus.cutterError;
    const hasGeneralErrors = bixStatus.error || bixStatus.generalError;
    const hasWarnings = bixStatus.paperNearEnd;

    let httpStatus = 200;
    let success = true;

    if (hasConnectionIssues) {
      httpStatus = 503;
      success = false;
    } else if (hasHardwareIssues || hasGeneralErrors) {
      httpStatus = 422;
      success = false;
    } else if (hasWarnings) {
      httpStatus = 200; // OK con advertencias
      success = true;
    }

    res.status(httpStatus).json({
      success,
      printer: "Bixolon BK3",
      status: {
        bixolonCommands: result.bixolonStatus,
        connectivityTest: result.connectivityTest,
      },
      analysis: {
        hasConnectionIssues,
        hasHardwareIssues,
        hasGeneralErrors,
        hasWarnings,
        commandUsed: result.bixolonStatus.commandUsed,
        recommendation: result.recommendation
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error("Error getting comprehensive Bixolon status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get comprehensive Bixolon printer status",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Helper function to generate human-readable status message for Bixolon BK3
 */
function getBixolonStatusMessage(status: PrinterStatus): string {
  if (status.connectionError) {
    return "🔌 No se puede conectar con la impresora Bixolon BK3. Verificar puerto serie y conexión USB.";
  }

  const issues: string[] = [];
  const warnings: string[] = [];

  // Problemas críticos que requieren acción inmediata
  if (status.paperOut) issues.push("🟥 SIN PAPEL");
  if (status.coverOpen) issues.push("🟨 TAPA ABIERTA");
  if (status.cutterError) issues.push("🔴 ERROR DEL CORTADOR");
  if (status.error) issues.push("🔴 ERROR DE PAPEL");
  if (status.generalError) issues.push("🔴 ERROR GENERAL");
  if (status.drawerOpen) issues.push("🟦 CAJÓN ABIERTO");

  // Advertencias
  if (status.paperNearEnd) warnings.push("🟠 POCO PAPEL");

  if (issues.length > 0) {
    return `PROBLEMAS DETECTADOS: ${issues.join(", ")}. Comando usado: ${status.commandUsed}`;
  }

  if (warnings.length > 0) {
    return `ADVERTENCIAS: ${warnings.join(", ")}. Comando usado: ${status.commandUsed}`;
  }

  return `✅ Impresora Bixolon BK3 funcionando correctamente. Comando usado: ${status.commandUsed}`;
}