import { Request, Response } from "express";
import { printAirportTicket } from "./printer.controller";

export const printTicket = (req: Request, res: Response) => {
  try {
    const { data } = req.body;


    printAirportTicket(data)
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

export const printTest = async (req: Request, res: Response) => {
  try {
    console.log('🖨️ Iniciando test de impresión...');
    
    // Datos de prueba para el ticket
    const testData = {
      companyName: "SERVICIOS DE GESTION AEROPORTUARIA",
      location: "Quito - Ecuador",
      airportName: "Aeropuerto Quito Mariscal Sucre",
      phoneNumber: "123-456-7890",
      ticketNumber: "TEST123456789",
      stationNumber: "01",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('es-EC', { hour12: false }),
      serviceType: "Coche Portaequipajes - TEST",
      subtotal: 8.70,
      tax: 1.30,
      taxRate: 15,
      total: 10.00,
      paid: 10.00,
      change: 0.00,
      changeError: 0.00,
      website: "www.aerogerpsa.com"
    };

    await printAirportTicket( testData);
    
    console.log('✅ Test de impresión completado exitosamente');
    
    res.json({
      success: true,
      message: "Test de impresión enviado correctamente",
      testData: testData
    });

  } catch (error) {
    console.error("❌ Error en test de impresión:", error);
    res.status(500).json({
      success: false,
      error: "Error al imprimir test",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};
