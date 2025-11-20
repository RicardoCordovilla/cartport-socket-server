import { Router } from "express";
import { printTicket, getUSBPrinters } from "./printer.service";

const router = Router();
router.post("/ticket", printTicket);
router.get("/usb-printers", getUSBPrinters);

export default router;
