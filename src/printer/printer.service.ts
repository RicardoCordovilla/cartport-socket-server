import { Request, Response } from "express";
import { printAirportTicket } from "./printer.controller";

export const printTicket = (req: Request, res: Response) => {
  try {
    const { devicePath, data } = req.body;

    if (!devicePath) {
      return res.status(400).json({
        error: "Device path is required",
      });
    }

    printAirportTicket(devicePath, data)
      .then(() => {
        res.json({
          success: true,
          message: "Airport ticket printed successfully",
        });
      })
      .catch((error) => {
        console.error("Error printing airport ticket:", error);
        res.status(500).json({
          error: "Failed to print airport ticket",
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
