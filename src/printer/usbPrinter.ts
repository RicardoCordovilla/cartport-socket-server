// src/printer/usbPrinter.ts
import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';

interface USBPrinterOptions {
  printerName?: string; // Nombre de la impresora USB
  characterSet?: CharacterSet;
}

export class USBPrinter {
  private printer: ThermalPrinter;
  private printerName: string;

  constructor(options: USBPrinterOptions = {}) {
    this.printerName = options.printerName || 'USB001';
    
    // Configuración corregida para USB con driver específico
    this.printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `/dev/usb/lp0`, // Interface USB genérica para Linux/macOS
      driver: require('printer'), // Driver nativo del sistema
      characterSet: options.characterSet || CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      lineCharacter: "=",
      breakLine: BreakLine.WORD,
      options: {
        timeout: 5000
      }
    });
  }

  static getAvailablePrinters(): string[] {
    // node-thermal-printer no tiene una función directa para listar impresoras
    // Por ahora retornamos algunas opciones comunes
    return ['default', 'usb', 'thermal'];
  }

  async open(): Promise<void> {
    try {
      const isConnected = await this.printer.isPrinterConnected();
      if (!isConnected) {
        throw new Error('No se pudo conectar con la impresora USB');
      }
    } catch (error) {
      throw new Error(`Error al conectar con la impresora USB: ${error}`);
    }
  }

  async write(data: Buffer | string): Promise<void> {
    try {
      const printData = typeof data === 'string' ? data : data.toString();
      
      // Limpiar el buffer previo
      this.printer.clear();
      
      // Agregar el contenido
      this.printer.raw(Buffer.from(printData));
      
      // Ejecutar la impresión
      await this.printer.execute();
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new Error(`Error al imprimir por USB: ${error}`));
    }
  }

  async close(): Promise<void> {
    try {
      // Cortar el papel antes de cerrar
      this.printer.cut();
      await this.printer.execute();
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new Error(`Error al cerrar impresora USB: ${error}`));
    }
  }

  getPrinterName(): string {
    return this.printerName;
  }

  // Método adicional para impresión con formato
  async printFormatted(content: string): Promise<void> {
    try {
      this.printer.clear();
      
      // Configurar formato
      this.printer.alignCenter();
      this.printer.setTextSize(1, 1);
      this.printer.bold(true);
      this.printer.println("CONDOMINAR");
      this.printer.bold(false);
      
      this.printer.alignLeft();
      this.printer.drawLine();
      this.printer.println(content);
      this.printer.drawLine();
      
      this.printer.alignCenter();
      this.printer.println("Gracias por su pago");
      this.printer.newLine();
      this.printer.cut();
      
      await this.printer.execute();
    } catch (error) {
      throw new Error(`Error en impresión formateada: ${error}`);
    }
  }
}