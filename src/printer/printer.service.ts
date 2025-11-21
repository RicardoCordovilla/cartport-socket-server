import { Request, Response } from "express";
import { printAirportTicket } from "./printer.controller";
import { printPaymentTicket, getAvailableUSBPrinters, getAvailableESCPOSPrinters } from "./tickets";
import * as os from 'os';

export const printTicket = (req: Request, res: Response) => {
  try {
    const { devicePath, data, printerType = 'serial', printerName, vendorId, productId } = req.body;

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
    } else if (printerType === 'escpos') {
      // Para ESC/POS, usar la nueva función con corte real
      printPaymentTicket(
        { type: 'escpos', vendorId, productId },
        data
      )
        .then(() => {
          res.json({
            success: true,
            message: "Ticket printed successfully via ESC/POS with automatic cutting",
          });
        })
        .catch((error) => {
          console.error("Error printing ESC/POS ticket:", error);
          res.status(500).json({
            error: "Failed to print ESC/POS ticket",
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

// Nuevo endpoint para obtener impresoras ESC/POS disponibles
export const getESCPOSPrinters = async (req: Request, res: Response) => {
  try {
    const printers = await getAvailableESCPOSPrinters();
    res.json({
      success: true,
      printers,
      count: printers.length,
      message: "ESC/POS printers support automatic paper cutting"
    });
  } catch (error) {
    console.error("Error getting ESC/POS printers:", error);
    res.status(500).json({
      error: "Failed to get ESC/POS printers",
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

// Nuevo endpoint para obtener información detallada de impresoras
export const getPrintersDetailed = async (req: Request, res: Response) => {
  try {
    const printers = await getAvailableUSBPrinters();
    const isWindows = os.platform() === 'win32';
    
    res.json({
      success: true,
      data: {
        printers: printers,
        count: printers.length,
        system: {
          platform: os.platform(),
          isWindows: isWindows,
          printingMethod: isWindows ? 'Windows Print Commands' : 'CUPS/lp Commands'
        },
        defaultPrinter: 'default',
        availableCommands: isWindows 
          ? ['notepad /p', 'print /D:']
          : ['lp', 'lpstat']
      },
    });
  } catch (error) {
    console.error("Error getting detailed printer info:", error);
    res.status(500).json({
      error: "Failed to get detailed printer information",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Endpoint mejorado para obtener todas las impresoras disponibles
export const getAllPrinters = async (req: Request, res: Response) => {
  try {
    const [usbPrinters, escposPrinters] = await Promise.all([
      getAvailableUSBPrinters(),
      getAvailableESCPOSPrinters()
    ]);

    res.json({
      success: true,
      printers: {
        usb: usbPrinters,
        escpos: escposPrinters,
        serial: ["Available via device path (e.g., COM1, /dev/ttyUSB0)"]
      },
      recommendations: {
        windows: "Use ESC/POS for automatic paper cutting",
        macos: "Use USB or ESC/POS for best compatibility",
        linux: "All printer types supported"
      },
      currentPlatform: os.platform()
    });
  } catch (error) {
    console.error("Error getting all printers:", error);
    res.status(500).json({
      error: "Failed to get printer information",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
