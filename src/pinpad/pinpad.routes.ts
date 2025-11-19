import { Router } from "express";
import { processReverse, requestPayment } from "./pinpad.service";
import { 
  getPinpadConfig, 
  updatePinpadConfig, 
  resetPinpadConfig,
  PinpadConfig 
} from "./pinpad.config";

const router = Router();

// Endpoints existentes
router.post("/payment", requestPayment);
router.post("/reverse-payment", processReverse);

// Nuevos endpoints para gestión de configuración
router.get("/config", (req, res) => {
  try {
    const config = getPinpadConfig();
    res.json({
      success: true,
      message: "Configuración actual del PinPad",
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
    
    res.json({
      success: true,
      message: "Configuración actualizada exitosamente",
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
      message: "Configuración reiniciada a valores por defecto",
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
    
    res.json({
      success: true,
      message: "Datos del comercio configurados exitosamente",
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
    
    res.json({
      success: true,
      message: "Configuración de red actualizada exitosamente",
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

export default router;
