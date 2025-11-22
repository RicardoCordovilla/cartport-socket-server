import { Request, Response } from "express";
import { printPaymentTicket } from "./tickets";
import * as os from 'os';

export const printTicket = (req: Request, res: Response) => {
  try {
    const { devicePath, data, printerType = 'usb', printerName, vendorId, productId } = req.body;
    printPaymentTicket(
      // { type: printerType, devicePath, printerName, vendorId, productId },
      data
    )
      .then(() => {
        res.json({
          success: true,
          message: "Ticket printed successfully",
        });
      })
      .catch((error) => {
        console.error("Error printing ticket:", error);
        res.status(500).json({
          error: "Failed to print ticket",
          details: error.message,
        });
      });
  } catch (error) {
    console.error("Error in printTicket service:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Nuevo endpoint para obtener información del sistema operativo
export const getSystemInfo = (req: Request, res: Response) => {
  try {
    const platform = os.platform();
    const isWindows = platform === 'win32';
    const architecture = os.arch();
    const hostname = os.hostname();
    const osType = os.type();
    const release = os.release();

    res.json({
      success: true,
      system: {
        platform: platform,
        isWindows: isWindows,
        architecture: architecture,
        hostname: hostname,
        type: osType,
        release: release,
        supportedPrinters: isWindows ? 'Windows Print Spooler' : 'CUPS (Common Unix Printing System)'
      },
    });
  } catch (error) {
    console.error("Error getting system info:", error);
    res.status(500).json({
      error: "Failed to get system information",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};