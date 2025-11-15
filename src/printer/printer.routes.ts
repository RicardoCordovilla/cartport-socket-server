import { Router } from "express";
import { printTicket } from "./printer.service";
import {
  getPrinterStatus,
  getComprehensivePrinterStatus
} from "./printer-status.controller";

const router = Router();

// Existing printing routes
router.post("/ticket", printTicket);

// Status monitoring routes
router.get("/status", getPrinterStatus);
router.get("/status/comprehensive", getComprehensivePrinterStatus);

export default router;
