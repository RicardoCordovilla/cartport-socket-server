import { Router } from "express";
import { 
  printTicket, 
  getUSBPrinters, 
  getSystemInfo, 
  getPrintersDetailed,
  getESCPOSPrinters,
  getAllPrinters
} from "./printer.service";

const router = Router();

// Endpoint existente para imprimir tickets
router.post("/ticket", printTicket);

// Endpoint para listar impresoras USB conectadas
router.get("/usb-printers", getUSBPrinters);

// Endpoint para listar impresoras ESC/POS con corte automático
router.get("/escpos-printers", getESCPOSPrinters);

// Endpoint para obtener todas las impresoras disponibles
router.get("/all-printers", getAllPrinters);

// Endpoint para obtener información del sistema operativo
router.get("/system-info", getSystemInfo);

// Endpoint para obtener información detallada de impresoras y sistema
router.get("/printers-detailed", getPrintersDetailed);

export default router;
