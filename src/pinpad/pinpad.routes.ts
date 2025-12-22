import { Router } from "express";
import { 
  processReverse, 
  requestPayment, 
  getTransactionsInMemory, 
  clearCompletedTransactions,
  initPinpad
} from "./pinpad.service";
import { 
  getPinpadConfig, 
  updatePinpadConfig, 
  resetPinpadConfig,
  PinpadConfig,
  deleteConfigFile,
  isConfigComplete
} from "./pinpad.config";

const router = Router();

// Endpoint para inicializar el PinPad (Configuración de red)
router.post("/init", initPinpad);

// Endpoints existentes
router.post("/payment", requestPayment);
router.post("/reverse-payment", processReverse);

// Endpoint para verificar estado de configuración
router.get("/config/status", (req, res) => {
  try {
    const config = getPinpadConfig();
    const isComplete = isConfigComplete();
    
    res.json({
      success: true,
      message: isComplete ? "Configuración completa" : "Configuración incompleta",
      isComplete,
      missingFields: isComplete ? [] : [
        !config.merchantData.mid ? "mid" : null,
        !config.merchantData.tid ? "tid" : null,
        !config.securityData ? "securityData" : null
      ].filter(Boolean),
      data: {
        hasMerchantData: !!(config.merchantData.mid && config.merchantData.tid),
        hasSecurityData: !!config.securityData,
        networkConfig: {
          host: config.host,
          port: config.port
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al verificar estado de configuración",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

// Nuevos endpoints para gestión de configuración
router.get("/config", (req, res) => {
  try {
    const config = getPinpadConfig();
    const isComplete = isConfigComplete();
    
    res.json({
      success: true,
      message: "Configuración actual del PinPad",
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
    const newConfig: Partial<PinpadConfig> = req.body;
    
    // Validar que se envíen datos
    if (!newConfig || Object.keys(newConfig).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Debe enviar al menos un campo de configuración",
        example: {
          host: "192.168.100.24",
          port: 9999,
          merchantData: {
            mid: "1791310199",
            tid: "NP319559",
            claveTecnica: "166831"
          },
          securityData: "B12D3D63069BD9EB05B7BBEEAA228ABC"
        }
      });
    }

    const updatedConfig = updatePinpadConfig(newConfig);
    const isComplete = isConfigComplete();
    
    res.json({
      success: true,
      message: "Configuración actualizada exitosamente y guardada en disco",
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

router.post("/config/reset", (req, res) => {
  try {
    const resetConfig = resetPinpadConfig();
    res.json({
      success: true,
      message: "Configuración reiniciada a valores por defecto y guardada en disco",
      isComplete: false,
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

// Endpoint para eliminar completamente el archivo de configuración
router.delete("/config/file", (req, res) => {
  try {
    const deleted = deleteConfigFile();
    if (deleted) {
      // Reiniciar configuración en memoria también
      resetPinpadConfig();
      res.json({
        success: true,
        message: "Archivo de configuración eliminado y configuración reiniciada",
        isComplete: false
      });
    } else {
      res.json({
        success: true,
        message: "No había archivo de configuración que eliminar",
        isComplete: false
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

// Endpoint para configurar solo los datos del comercio (MID, TID, etc.)
router.post("/config/merchant", (req, res) => {
  try {
    const { mid, tid, claveTecnica, securityData } = req.body;
    
    if (!mid || !tid || !securityData) {
      return res.status(400).json({
        success: false,
        error: "Campos requeridos: mid, tid, securityData",
        example: {
          mid: "1791310199",
          tid: "NP319559", 
          claveTecnica: "166831",
          securityData: "B12D3D63069BD9EB05B7BBEEAA228ABC"
        }
      });
    }

    const merchantConfig = {
      merchantData: {
        mid,
        tid,
        claveTecnica: claveTecnica || ""
      },
      securityData
    };

    const updatedConfig = updatePinpadConfig(merchantConfig);
    const isComplete = isConfigComplete();
    
    res.json({
      success: true,
      message: "Datos del comercio configurados exitosamente y guardados en disco",
      isComplete,
      data: {
        merchantData: updatedConfig.merchantData,
        securityData: updatedConfig.securityData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al configurar datos del comercio",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

// Endpoint para configurar solo la red del PinPad
router.post("/config/network", (req, res) => {
  try {
    const { host, port, network } = req.body;
    
    const networkConfig: Partial<PinpadConfig> = {};
    
    if (host) networkConfig.host = host;
    if (port) networkConfig.port = parseInt(port);
    if (network) networkConfig.network = network;

    const updatedConfig = updatePinpadConfig(networkConfig);
    const isComplete = isConfigComplete();
    
    res.json({
      success: true,
      message: "Configuración de red actualizada exitosamente y guardada en disco",
      isComplete,
      data: {
        host: updatedConfig.host,
        port: updatedConfig.port,
        network: updatedConfig.network
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al configurar red",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

// Endpoint para configurar la URL del API de logs
router.post("/config/logs", (req, res) => {
  try {
    const { logApiUrl } = req.body;
    
    if (!logApiUrl) {
      return res.status(400).json({
        success: false,
        error: "Campo requerido: logApiUrl",
        example: {
          logApiUrl: "http://localhost:9000/pinpadlogs"
        }
      });
    }

    // Validar que la URL tenga formato correcto
    try {
      new URL(logApiUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: "La URL del API de logs no tiene un formato válido",
        example: {
          logApiUrl: "http://localhost:9000/pinpadlogs"
        }
      });
    }

    const logsConfig = { logApiUrl };
    const updatedConfig = updatePinpadConfig(logsConfig);
    const isComplete = isConfigComplete();
    
    res.json({
      success: true,
      message: "URL del API de logs configurada exitosamente y guardada en disco",
      isComplete,
      data: {
        logApiUrl: updatedConfig.logApiUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al configurar URL del API de logs",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

// Nuevos endpoints para gestión de transacciones en memoria
router.get("/transactions/memory", getTransactionsInMemory);
router.delete("/transactions/memory/completed", clearCompletedTransactions);

export default router;
