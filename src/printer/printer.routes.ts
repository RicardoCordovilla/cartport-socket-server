import { Router } from "express";
import {printTicket, printTest, printFill, printCoinEmpty, printBillEmpty, printRecaudacion, printCancellation} from "./printer.service";
import { 
  getPrinterConfig, 
  updatePrinterConfig, 
  resetPrinterConfig,
  PrinterConfig,
  deleteConfigFile,
  isConfigComplete
} from "./printer.config";

const router = Router();

// Existing printer endpoints
router.post("/ticket", printTicket);
router.post("/test", printTest);
router.post("/print-fill", printFill);
router.post("/print-coinempty", printCoinEmpty);
router.post("/print-billempty", printBillEmpty);
router.post("/print-recaudacion", printRecaudacion);
router.post("/print-errorchange", printCancellation);

// Configuration endpoints
router.get("/config", (req, res) => {
  try {
    const config = getPrinterConfig();
    const isComplete = isConfigComplete();
    
    res.json({
      success: true,
      message: "Configuración actual de la impresora",
      isComplete,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al obtener configuración",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

router.post("/config", (req, res) => {
  try {
    const newConfig: Partial<PrinterConfig> = req.body;
    
    if (!newConfig || Object.keys(newConfig).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Debe enviar al menos un campo de configuración",
        example: {
          companyLines: {
            line1: "SERVICIOS DE GESTION AEROPORTUARIA",
            line2: "AEROGERPSA S.A.",
            address: "Via a Tababela",
            location: "AEROPUERTO INT. MARISCAL SUCRE - QUITO",
            phone: "022818462"
          }
        }
      });
    }

    const updatedConfig = updatePrinterConfig(newConfig);
    const isComplete = isConfigComplete();
    
    res.json({
      success: true,
      message: "Configuración actualizada exitosamente",
      isComplete,
      data: updatedConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al actualizar configuración",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

router.post("/config/company", (req, res) => {
  try {
    const { line1, line2, address, location, phone } = req.body;
    
    const companyConfig = {
      companyLines: {
        ...(line1 && { line1 }),
        ...(line2 && { line2 }),
        ...(address && { address }),
        ...(location && { location }),
        ...(phone && { phone })
      }
    };

    const updatedConfig = updatePrinterConfig(companyConfig);
    const isComplete = isConfigComplete();
    
    res.json({
      success: true,
      message: "Información de la empresa actualizada exitosamente",
      isComplete,
      data: updatedConfig.companyLines
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al actualizar información de la empresa",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

router.post("/config/reset", (req, res) => {
  try {
    const resetConfig = resetPrinterConfig();
    res.json({
      success: true,
      message: "Configuración reiniciada a valores por defecto",
      isComplete: true,
      data: resetConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al reiniciar configuración",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

router.delete("/config/file", (req, res) => {
  try {
    const deleted = deleteConfigFile();
    if (deleted) {
      resetPrinterConfig();
      res.json({
        success: true,
        message: "Archivo de configuración eliminado y configuración reiniciada"
      });
    } else {
      res.json({
        success: true,
        message: "No había archivo de configuración que eliminar"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al eliminar archivo de configuración",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

export default router;
