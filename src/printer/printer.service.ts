import { Request, Response } from "express";
import { printAirportTicket } from "./printer.controller";
import { printPaymentTicket, getAvailableUSBPrinters } from "./tickets";

export const printTicket = (req: Request, res: Response) => {
  try {
    const { devicePath, data, printerType = 'serial', printerName } = req.body;

    // Validar según el tipo de impresora
    if (printerType === 'serial' && !devicePath) {
      return res.status(400).json({
        error: "Device path is required for serial printing",
      });
    }

    if (printerType === 'usb') {
      // Para USB, usar la nueva función unificada
      printPaymentTicket(
        { type: 'usb', printerName },
        data
      )
        .then(() => {
          res.json({
            success: true,
            message: "Ticket printed successfully via USB",
          });
        })
        .catch((error) => {
          console.error("Error printing USB ticket:", error);
          res.status(500).json({
            error: "Failed to print USB ticket",
            details: error.message,
          });
        });
    } else {
      // Para serial, mantener funcionalidad existente
      printAirportTicket(devicePath, data)
        .then(() => {
          res.json({
            success: true,
            message: "Airport ticket printed successfully via serial",
          });
        })
        .catch((error) => {
          console.error("Error printing serial ticket:", error);
          res.status(500).json({
            error: "Failed to print serial ticket",
            details: error.message,
          });
        });
    }
  } catch (error) {
    console.error("Error in printTicket service:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Nuevo endpoint para obtener impresoras USB disponibles
export const getUSBPrinters = async (req: Request, res: Response) => {
  try {
    const printers = await getAvailableUSBPrinters();
    res.json({
      success: true,
      printers,
    });
  } catch (error) {
    console.error("Error getting USB printers:", error);
    res.status(500).json({
      error: "Failed to get USB printers",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
