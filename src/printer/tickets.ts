// src/tickets.ts
import { SerialPrinter } from "./serialPrinter";
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

type PrinterType = 'serial' | 'usb';

interface PrinterConfig {
  type: PrinterType;
  devicePath?: string; // Para impresoras seriales
  printerName?: string; // Para impresoras USB
}

// Función para detectar el tipo de ticket
function isAirportTicket(data: any): data is AirportTicketData {
  return data.companyName !== undefined && 
         data.airportName !== undefined && 
         data.ticketNumber !== undefined &&
         data.total !== undefined;
}

// Función para obtener impresoras USB disponibles (ahora asíncrona)
export async function getAvailableUSBPrinters(): Promise<string[]> {
  return await USBPrinter.getAvailablePrinters();
}

// Función unificada para imprimir tickets
export async function printPaymentTicket(
  config: PrinterConfig,
  data: TicketData
) {
  if (config.type === 'serial') {
    if (!config.devicePath) {
      throw new Error('devicePath es requerido para impresión serial');
    }
    return await printPaymentTicketSerial(config.devicePath, data);
  } else if (config.type === 'usb') {
    return await printPaymentTicketUSB(data, config.printerName);
  } else {
    throw new Error('Tipo de impresora no soportado');
  }
}

// Función específica para impresión serial (mantiene compatibilidad)
export async function printPaymentTicketSerial(
  devicePath: string,
  data: TicketData
) {
  const printer = new SerialPrinter({ path: devicePath, baudRate: 9600 });

  await printer.open();

  try {
    const ticketContent = generateTicketContent(data);
    const cut = Buffer.from([0x1d, 0x56, 0x01]);

    await printer.write(ticketContent);
    await printer.write(cut);
    await printer.write("\n\n");
  } finally {
    await printer.close();
  }
}

// Nueva función para impresión USB
export async function printPaymentTicketUSB(
  data: TicketData,
  printerName?: string
) {
  const printer = new USBPrinter({ printerName });

  await printer.open();

  try {
    const ticketContent = generateTicketContent(data);
    
    await printer.write(ticketContent);
    // Para USB, agregamos comandos de corte estándar
    await printer.write(Buffer.from([0x1d, 0x56, 0x01])); // Corte parcial
    await printer.write("\n\n");
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

// Función para generar tickets de aeropuerto
function generateAirportTicketContent(data: AirportTicketData): string {
  let buf = "";
  buf += ESC + "@"; // init
  buf += `${data.companyName}\n`;
  buf += `${data.location}\n`;
  buf += `${data.airportName}\n`;
  buf += `Tel: ${data.phoneNumber}\n`;
  buf += "------------------------\n";
  buf += `Ticket: ${data.ticketNumber}\n`;
  buf += `Fecha: ${data.date}\n`;
  buf += `Hora: ${data.time}\n`;
  buf += "------------------------\n";
  buf += `Servicio: ${data.serviceType}\n`;
  buf += `Subtotal: $${data.subtotal.toFixed(2)}\n`;
  buf += `IVA (${data.taxRate}%): $${data.tax.toFixed(2)}\n`;
  buf += `TOTAL: $${data.total.toFixed(2)}\n`;
  buf += "------------------------\n";
  buf += `Recibido: $${data.paid.toFixed(2)}\n`;
  buf += `Cambio: $${data.change.toFixed(2)}\n`;
  buf += "------------------------\n";
  buf += `${data.website}\n`;
  buf += "Gracias por su preferencia\n\n\n";
  return buf;
}

// Función para generar tickets de condominio
function generatePaymentTicketContent(data: PaymentTicketData): string {
  let buf = "";
  buf += ESC + "@"; // init
  buf += "     CONDOMINAR     \n";
  buf += "------------------------\n";
  buf += `Propiedad: ${data.propertyName}\n`;
  if (data.ownerName) buf += `Propietario: ${data.ownerName}\n`;
  buf += `Fecha: ${data.date}\n`;
  buf += `Concepto: ${data.concept}\n`;
  buf += `Monto: $${data.amount.toFixed(2)}\n`;
  buf += "------------------------\n";
  buf += "Gracias por su pago.\n\n\n";
  return buf;
}
