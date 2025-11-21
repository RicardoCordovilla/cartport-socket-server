// src/printer/escposPrinter.ts
import { Printer } from '@node-escpos/core';
// @ts-ignore
import USB from '@node-escpos/usb-adapter';
import * as os from 'os';

interface ESCPOSPrinterOptions {
  vendorId?: number;    // ID del fabricante de la impresora USB
  productId?: number;   // ID del producto de la impresora USB
  interface?: number;   // Interfaz USB (generalmente 0)
}

export class ESCPOSPrinter {
  private options: ESCPOSPrinterOptions;
  private device: any;
  private printer: any;
  private isWindows: boolean;

  constructor(options: ESCPOSPrinterOptions = {}) {
    this.options = {
      vendorId: options.vendorId,
      productId: options.productId,
      interface: options.interface || 0
    };
    this.isWindows = os.platform() === 'win32';
  }

  // Método para detectar impresoras USB ESC/POS disponibles
  static async getAvailableESCPOSPrinters(): Promise<Array<{name: string, vendorId: number, productId: number}>> {
    try {
      const devices = USB.findPrinter();
      return devices.map((device: any) => ({
        name: device.deviceDescriptor?.iProduct || 'Unknown Printer',
        vendorId: device.deviceDescriptor?.idVendor || 0,
        productId: device.deviceDescriptor?.idProduct || 0
      }));
    } catch (error) {
      console.warn('No se pudieron detectar impresoras ESC/POS:', error);
      return [];
    }
  }

  async open(): Promise<void> {
    try {
      // Si no se especificaron IDs, intentar encontrar la primera impresora disponible
      if (!this.options.vendorId || !this.options.productId) {
        const printers = await ESCPOSPrinter.getAvailableESCPOSPrinters();
        if (printers.length > 0) {
          this.options.vendorId = printers[0].vendorId;
          this.options.productId = printers[0].productId;
        } else {
          throw new Error('No se encontraron impresoras ESC/POS USB');
        }
      }

      // Crear dispositivo USB
      this.device = new USB(this.options.vendorId, this.options.productId);
      
      // Abrir conexión
      await new Promise<void>((resolve, reject) => {
        this.device.open((err: any) => {
          if (err) {
            reject(new Error(`Error abriendo dispositivo USB: ${err.message}`));
          } else {
            resolve();
          }
        });
      });

      // Crear instancia de impresora ESC/POS - Corregir constructor con opciones
      this.printer = new Printer(this.device, {});
      
    } catch (error) {
      throw new Error(`Error conectando con impresora ESC/POS: ${error}`);
    }
  }

  async write(data: Buffer | string): Promise<void> {
    if (!this.printer) {
      throw new Error('Impresora no inicializada. Llama a open() primero.');
    }

    try {
      const content = typeof data === 'string' ? data : data.toString();
      
      // Limpiar comandos ESC/POS del contenido si los hay (los manejaremos nosotros)
      const cleanContent = content
        .replace(/\x1B@/g, '') // Remover comandos de inicialización
        .replace(/\x1D\x56\x01/g, '') // Remover comandos de corte existentes
        .replace(/\x1B!/g, '') // Remover comandos de formato
        .replace(/\x1Ba/g, ''); // Remover comandos de alineación

      // Usar comandos ESC/POS nativos
      await new Promise<void>((resolve, reject) => {
        this.printer
          .font('a')           // Fuente A (normal)
          .align('ct')         // Centrar para el encabezado
          .style('bu')         // Bold + underline para título
          .size(1, 1)          // Tamaño normal
          .text(cleanContent)   // Contenido del ticket
          .feed(3)             // 3 líneas de alimentación
          .cut()               // ¡Corte automático real!
          .close((err: any) => {
            if (err) {
              reject(new Error(`Error imprimiendo: ${err.message}`));
            } else {
              resolve();
            }
          });
      });

    } catch (error) {
      throw new Error(`Error en impresión ESC/POS: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.device) {
      await new Promise<void>((resolve) => {
        this.device.close(() => {
          resolve();
        });
      });
    }
  }

  // Método para imprimir con formato ESC/POS avanzado
  async printFormattedTicket(ticketData: {
    header: string;
    lines: Array<{text: string, align?: 'left' | 'center' | 'right', bold?: boolean}>;
    footer?: string;
  }): Promise<void> {
    if (!this.printer) {
      throw new Error('Impresora no inicializada');
    }

    try {
      await new Promise<void>((resolve, reject) => {
        let printerChain = this.printer
          .font('a')
          .align('ct')
          .style('bu')
          .size(1, 1)
          .text(ticketData.header)
          .feed(2);

        // Imprimir líneas con formato
        ticketData.lines.forEach(line => {
          printerChain = printerChain
            .align(line.align || 'left')
            .style(line.bold ? 'b' : 'normal')
            .text(line.text);
        });

        // Footer y corte
        if (ticketData.footer) {
          printerChain = printerChain
            .feed(2)
            .align('ct')
            .text(ticketData.footer);
        }

        printerChain
          .feed(3)
          .cut()
          .close((err: any) => {
            if (err) reject(new Error(`Error: ${err.message}`));
            else resolve();
          });
      });
    } catch (error) {
      throw new Error(`Error en impresión formateada: ${error}`);
    }
  }

  getPrinterInfo(): any {
    return {
      vendorId: this.options.vendorId,
      productId: this.options.productId,
      interface: this.options.interface,
      platform: os.platform(),
      isWindows: this.isWindows
    };
  }
}