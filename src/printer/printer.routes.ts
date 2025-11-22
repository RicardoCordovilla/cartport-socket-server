import { Router } from "express";
import { 
  printTicket, 
  getSystemInfo, 
} from "./printer.service";
import {
  printAirportTicket,
  printTicketWithConfig,
  getSystemPrintInfo,
  listAvailablePrinters,
  checkPrinterAvailability,
  testRawPrinting
} from "./printer.controller";

const router = Router();

// Endpoint existente para imprimir tickets
router.post("/ticket", printTicket);

// Endpoint para obtener información del sistema operativo
router.get("/system-info", getSystemInfo);

// Nuevos endpoints para modo RAW

// Endpoint para imprimir tickets en modo RAW
router.post("/ticket/raw", async (req, res) => {
  try {
    const { printerName, data, useRawMode = true } = req.body;
    
    if (!data) {
      return res.status(400).json({ 
        error: "Datos del ticket son requeridos" 
      });
    }

    await printAirportTicket(printerName, data, useRawMode);
    
    res.json({ 
      success: true, 
      message: `Ticket impreso exitosamente en modo ${useRawMode ? 'RAW' : 'Legacy'}`,
      printer: printerName || 'default',
      mode: useRawMode ? 'RAW' : 'Legacy'
    });
  } catch (error) {
    console.error("Error al imprimir ticket:", error);
    res.status(500).json({ 
      error: "Error al imprimir ticket", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para imprimir con configuración avanzada
router.post("/ticket/advanced", async (req, res) => {
  try {
    const { data, config = {} } = req.body;
    
    if (!data) {
      return res.status(400).json({ 
        error: "Datos del ticket son requeridos" 
      });
    }

    await printTicketWithConfig(data, config);
    
    res.json({ 
      success: true, 
      message: "Ticket impreso exitosamente con configuración avanzada",
      config
    });
  } catch (error) {
    console.error("Error al imprimir ticket con configuración avanzada:", error);
    res.status(500).json({ 
      error: "Error al imprimir ticket", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para obtener información del sistema de impresión
router.get("/system/print-info", async (req, res) => {
  try {
    const systemInfo = getSystemPrintInfo();
    res.json(systemInfo);
  } catch (error) {
    console.error("Error al obtener información del sistema:", error);
    res.status(500).json({ 
      error: "Error al obtener información del sistema", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para listar impresoras disponibles
router.get("/printers", async (req, res) => {
  try {
    const printers = await listAvailablePrinters();
    res.json({ 
      success: true, 
      printers,
      count: printers.length
    });
  } catch (error) {
    console.error("Error al listar impresoras:", error);
    res.status(500).json({ 
      error: "Error al listar impresoras", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para verificar disponibilidad de una impresora específica
router.get("/printers/:name/check", async (req, res) => {
  try {
    const { name } = req.params;
    const isAvailable = await checkPrinterAvailability(name);
    
    res.json({ 
      printerName: name,
      available: isAvailable,
      status: isAvailable ? 'available' : 'not found'
    });
  } catch (error) {
    console.error("Error al verificar impresora:", error);
    res.status(500).json({ 
      error: "Error al verificar impresora", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para prueba de impresión RAW
router.post("/test/raw", async (req, res) => {
  try {
    const { printerName } = req.body;
    
    await testRawPrinting(printerName);
    
    res.json({ 
      success: true, 
      message: "Prueba de impresión RAW completada exitosamente",
      printer: printerName || 'default'
    });
  } catch (error) {
    console.error("Error en prueba de impresión RAW:", error);
    res.status(500).json({ 
      error: "Error en prueba de impresión RAW", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
