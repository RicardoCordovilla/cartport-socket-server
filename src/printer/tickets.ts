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

// Función para detectar el mejor tipo de impresora disponible
export async function detectBestPrinterType(): Promise<{
  type: PrinterType;
  available: boolean;
  config?: Partial<PrinterConfig>;
  message: string;
}> {
  // Prioridad: ESC/POS (corte automático) > USB > Serial
  
  try {
    // Intentar ESC/POS primero (mejor corte automático)
    const escposPrinters = await getAvailableESCPOSPrinters();
    if (escposPrinters.length > 0) {
      return {
        type: 'escpos',
        available: true,
        config: { 
          type: 'escpos',
          vendorId: escposPrinters[0].vendorId,
          productId: escposPrinters[0].productId
        },
        message: `ESC/POS printer detected: ${escposPrinters[0].name} (corte automático disponible)`
      };
    }
  } catch (error) {
    console.warn('ESC/POS detection failed:', error instanceof Error ? error.message : error);
  }

  try {
    // Intentar USB como segundo opción
    const usbPrinters = await getAvailableUSBPrinters();
    if (usbPrinters.length > 0) {
      return {
        type: 'usb',
        available: true,
        config: { 
          type: 'usb',
          printerName: usbPrinters[0]
        },
        message: `USB printer detected: ${usbPrinters[0]}`
      };
    }
  } catch (error) {
    console.warn('USB detection failed:', error instanceof Error ? error.message : error);
  }

  // Si no hay impresoras automáticamente detectables, sugerir serial
  return {
    type: 'serial',
    available: false,
    config: { type: 'serial', devicePath: process.platform === 'win32' ? 'COM1' : '/dev/ttyUSB0' },
    message: 'No automatic printers detected. Serial connection available (requires manual configuration).'
  };
}

// Función mejorada que intenta imprimir con detección automática y fallback
export async function printPaymentTicketAuto(
  data: TicketData,
  preferredType?: PrinterType
): Promise<{success: boolean, printerType: PrinterType, message: string}> {
  
  // Lista de tipos de impresora a intentar en orden de prioridad
  const printerTypes: PrinterType[] = preferredType 
    ? [preferredType, 'escpos', 'usb'] 
    : ['escpos', 'usb'];
  
  let lastError: Error | null = null;
  
  for (const printerType of printerTypes) {
    try {
      console.log(`🖨️ Intentando imprimir con ${printerType.toUpperCase()}...`);
      
      let config: PrinterConfig;
      
      if (printerType === 'escpos') {
        const escposPrinters = await getAvailableESCPOSPrinters();
        if (escposPrinters.length === 0) {
          throw new Error('No ESC/POS printers found');
        }
        config = { 
          type: 'escpos',
          vendorId: escposPrinters[0].vendorId,
          productId: escposPrinters[0].productId
        };
      } else if (printerType === 'usb') {
        const usbPrinters = await getAvailableUSBPrinters();
        if (usbPrinters.length === 0) {
          throw new Error('No USB printers found');
        }
        config = { 
          type: 'usb',
          printerName: usbPrinters[0]
        };
      } else {
        // Para serial, usar configuración por defecto
        config = { 
          type: 'serial', 
          devicePath: process.platform === 'win32' ? 'COM1' : '/dev/ttyUSB0' 
        };
      }
      
      await printPaymentTicket(data);
      
      return {
        success: true,
        printerType: printerType,
        message: `Ticket impreso correctamente con ${printerType.toUpperCase()}`
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Fallo ${printerType.toUpperCase()}: ${errorMsg}`);
      lastError = error instanceof Error ? error : new Error(errorMsg);
      
      // Continúa con el siguiente tipo de impresora
      continue;
    }
  }
  
  // Si llegamos aquí, todos los métodos fallaron
  const errorMessage = lastError?.message?.includes('LIBUSB_ERROR_NOT_SUPPORTED')
    ? 'Sistema no compatible con libusb. Verifique que tenga una impresora USB estándar conectada.'
    : lastError?.message?.includes('No printers found')
    ? 'No se encontraron impresoras disponibles. Conecte una impresora y reinicie la aplicación.'
    : lastError?.message || 'Error desconocido de impresión';
  
  return {
    success: false,
    printerType: 'usb', // Tipo por defecto para errores
    message: `Error de impresión: ${errorMessage}`
  };
}

// Función unificada para imprimir tickets
export async function printPaymentTicket(
  // config: PrinterConfig,
  data: TicketData
) {
  printPaymentTicketUSB(data);
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
    // await printer.write(Buffer.from([0x1d, 0x56])); // Corte completo
    // await printer.write("\n\n");
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
