import { Router } from "express";
import { 
  printTicket, 
  getSystemInfo, 
} from "./printer.service";

const router = Router();

// Endpoint existente para imprimir tickets
router.post("/ticket", printTicket);

// Endpoint para obtener información del sistema operativo
router.get("/system-info", getSystemInfo);

export default router;
