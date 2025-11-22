// src/tickets.ts
import { USBPrinter } from "./usbPrinter";

const ESC = "\x1B";
const GS = "\x1D";

interface PaymentTicketData {
  propertyName: string;
  ownerName?: string;
  date: string; // ya formateada
  concept: string;
  amount: number;
}

export interface AirportTicketData {
  companyName: string;
  location: string;
  airportName: string;
  phoneNumber: string;
  ticketNumber: string;
  date: string;
  time: string;
  serviceType: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paid: number;
  change: number;
  changeError: number;
  website: string;
}

type TicketData = PaymentTicketData | AirportTicketData;

type PrinterType = 'serial' | 'usb' | 'escpos';

interface PrinterConfig {
  type: PrinterType;
  devicePath?: string; // Para impresoras seriales
  printerName?: string; // Para impresoras USB
  vendorId?: number;    // Para impresoras ESC/POS
  productId?: number;   // Para impresoras ESC/POS
  useRawMode?: boolean; // Usar modo RAW (Windows)
}

// Función para detectar el tipo de ticket
function isAirportTicket(data: any): data is AirportTicketData {
  return data.companyName !== undefined && 
         data.airportName !== undefined && 
         data.ticketNumber !== undefined &&
         data.total !== undefined;
}

// Función unificada para imprimir tickets (mejorada con configuración)
export async function printPaymentTicket(
  data: TicketData,
  config?: PrinterConfig
) {
  const printerConfig = {
    useRawMode: true, // Por defecto usar modo RAW en Windows
    ...config
  };
  
  return printPaymentTicketUSB(data, printerConfig.printerName, printerConfig.useRawMode);
}

// Nueva función para impresión USB con modo RAW
export async function printPaymentTicketUSB(
  data: TicketData,
  printerName?: string,
  useRawMode: boolean = true
) {
  const printer = new USBPrinter({ 
    printerName,
    useRawMode 
  });

  console.log(`Iniciando impresión en modo ${printer.isUsingRawMode() ? 'RAW' : 'Legacy'}`);
  console.log(`Sistema: ${printer.getOperatingSystem()}`);
  console.log(`Impresora: ${printer.getPrinterName()}`);

  await printer.open();

  try {
    const ticketContent = generateTicketContent(data);
    
    await printer.write(ticketContent);
    
    // En modo RAW, podemos enviar comandos ESC/POS directamente
    if (printer.isUsingRawMode()) {
      // Comando de corte para impresoras térmicas
      await printer.write(Buffer.from([0x1d, 0x56, 0x42, 0x00])); // Corte parcial
      // Avanzar papel adicional
      await printer.write("\n\n\n");
    }
    
    console.log('Impresión completada exitosamente');
  } finally {
    await printer.close();
  }
}

// Función helper para generar el contenido del ticket (ahora detecta el tipo)
function generateTicketContent(data: TicketData): string {
  if (isAirportTicket(data)) {
    return generateAirportTicketContent(data);
  } else {
    return generatePaymentTicketContent(data as PaymentTicketData);
  }
}

// Función para generar tickets de aeropuerto (habilitada completamente)
function generateAirportTicketContent(data: AirportTicketData): string {
  let buf = "";
  
  // Comandos ESC/POS para formateo
  buf += ESC + "@"; // Inicializar impresora
  buf += ESC + "a" + String.fromCharCode(1); // Centrar texto
  
  buf += `${data.companyName}\n`;
  buf += `${data.location}\n`;
  buf += `${data.airportName}\n`;
  buf += `Tel: ${data.phoneNumber}\n`;
  
  buf += ESC + "a" + String.fromCharCode(0); // Alinear a la izquierda
  buf += "--------------------------------\n";
  buf += `Ticket: ${data.ticketNumber}\n`;
  buf += `Fecha: ${data.date}\n`;
  buf += `Hora: ${data.time}\n`;
  buf += "--------------------------------\n";
  buf += `Servicio: ${data.serviceType}\n`;
  buf += `Subtotal: $${data.subtotal.toFixed(2)}\n`;
  buf += `IVA (${data.taxRate}%): $${data.tax.toFixed(2)}\n`;
  
  // Texto en negrita para el total
  buf += ESC + "E" + String.fromCharCode(1); // Activar negrita
  buf += `TOTAL: $${data.total.toFixed(2)}\n`;
  buf += ESC + "E" + String.fromCharCode(0); // Desactivar negrita
  
  buf += "--------------------------------\n";
  buf += `Recibido: $${data.paid.toFixed(2)}\n`;
  buf += `Cambio: $${data.change.toFixed(2)}\n`;
  buf += "--------------------------------\n";
  
  buf += ESC + "a" + String.fromCharCode(1); // Centrar texto
  buf += `${data.website}\n`;
  buf += "Gracias por su preferencia\n";
  buf += ESC + "a" + String.fromCharCode(0); // Alinear a la izquierda
  
  return buf;
}

// Función para generar tickets de condominio (con mejor formato ESC/POS)
function generatePaymentTicketContent(data: PaymentTicketData): string {
  let buf = "";
  
  // Comandos ESC/POS para formateo
  buf += ESC + "@"; // Inicializar impresora
  buf += ESC + "a" + String.fromCharCode(1); // Centrar texto
  buf += ESC + "E" + String.fromCharCode(1); // Activar negrita
  
  buf += "     CONDOMINAR     \n";
  
  buf += ESC + "E" + String.fromCharCode(0); // Desactivar negrita
  buf += ESC + "a" + String.fromCharCode(0); // Alinear a la izquierda
  
  buf += "--------------------------------\n";
  buf += `Propiedad: ${data.propertyName}\n`;
  if (data.ownerName) buf += `Propietario: ${data.ownerName}\n`;
  buf += `Fecha: ${data.date}\n`;
  buf += `Concepto: ${data.concept}\n`;
  
  // Monto en negrita
  buf += ESC + "E" + String.fromCharCode(1);
  buf += `Monto: $${data.amount.toFixed(2)}\n`;
  buf += ESC + "E" + String.fromCharCode(0);
  
  buf += "--------------------------------\n";
  
  buf += ESC + "a" + String.fromCharCode(1); // Centrar texto
  buf += "Gracias por su pago.\n";
  buf += ESC + "a" + String.fromCharCode(0); // Alinear a la izquierda
  
  return buf;
}

// Función auxiliar para obtener información del sistema de impresión
export function getPrintSystemInfo() {
  return USBPrinter.getSystemInfo();
}

// Función para listar impresoras disponibles
export async function getAvailablePrinters(): Promise<string[]> {
  return USBPrinter.getAvailablePrinters();
}

// Función para verificar si una impresora está disponible
export async function isPrinterAvailable(printerName: string): Promise<boolean> {
  return USBPrinter.isPrinterAvailable(printerName);
}
