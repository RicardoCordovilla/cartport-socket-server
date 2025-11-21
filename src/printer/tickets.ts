// src/tickets.ts
import { SerialPrinter } from "./serialPrinter";
import { USBPrinter } from "./usbPrinter";
import { ESCPOSPrinter } from "./escposPrinter";

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

// Función para obtener impresoras ESC/POS disponibles
export async function getAvailableESCPOSPrinters(): Promise<Array<{name: string, vendorId: number, productId: number}>> {
  return await ESCPOSPrinter.getAvailableESCPOSPrinters();
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
  } else if (config.type === 'escpos') {
    return await printPaymentTicketESCPOS(data, config.vendorId, config.productId);
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

// Nueva función para impresión ESC/POS
export async function printPaymentTicketESCPOS(
  data: TicketData,
  vendorId?: number,
  productId?: number
) {
  const printer = new ESCPOSPrinter({ vendorId, productId });

  await printer.open();

  try {
    if (isAirportTicket(data)) {
      // Usar el método formateado para tickets de aeropuerto
      await printer.printFormattedTicket({
        header: data.companyName,
        lines: [
          { text: data.location, align: 'center' },
          { text: data.airportName, align: 'center' },
          { text: `Tel: ${data.phoneNumber}`, align: 'center' },
          { text: '------------------------', align: 'center' },
          { text: `Ticket: ${data.ticketNumber}`, bold: true },
          { text: `Fecha: ${data.date}     ${data.time}` },
          { text: '------------------------', align: 'center' },
          { text: `Servicio: ${data.serviceType}` },
          { text: `Subtotal: $${data.subtotal.toFixed(2)}` },
          { text: `IVA (${data.taxRate}%): $${data.tax.toFixed(2)}` },
          { text: `TOTAL: $${data.total.toFixed(2)}`, bold: true },
          { text: '------------------------', align: 'center' },
          { text: `Recibido: $${data.paid.toFixed(2)}` },
          { text: `Cambio: $${data.change.toFixed(2)}` },
          { text: '------------------------', align: 'center' },
        ],
        footer: `${data.website}\nGracias por su preferencia`
      });
    } else {
      // Para tickets de condominio
      const paymentData = data as PaymentTicketData;
      await printer.printFormattedTicket({
        header: 'CONDOMINAR',
        lines: [
          { text: '------------------------', align: 'center' },
          { text: `Propiedad: ${paymentData.propertyName}` },
          { text: `Propietario: ${paymentData.ownerName || 'N/A'}` },
          { text: `Fecha: ${paymentData.date}` },
          { text: `Concepto: ${paymentData.concept}` },
          { text: `Monto: $${paymentData.amount.toFixed(2)}`, bold: true },
          { text: '------------------------', align: 'center' },
        ],
        footer: 'Gracias por su pago.'
      });
    }
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
