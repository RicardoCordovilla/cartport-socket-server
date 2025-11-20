// src/printer/usbPrinter.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface USBPrinterOptions {
  printerName?: string; // Nombre de la impresora USB
}

export class USBPrinter {
  private printerName: string;

  constructor(options: USBPrinterOptions = {}) {
    this.printerName = options.printerName || this.getDefaultPrinter();
  }

  private getDefaultPrinter(): string {
    // En macOS, intentamos obtener la impresora por defecto
    try {
      // Esto funcionará en macOS
      return 'default';
    } catch (error) {
      return 'USB';
    }
  }

  static async getAvailablePrinters(): Promise<string[]> {
    try {
      // En macOS usamos lpstat para listar impresoras
      const { stdout } = await execAsync('lpstat -p');
      const printers = stdout
        .split('\n')
        .filter(line => line.startsWith('printer'))
        .map(line => line.split(' ')[1])
        .filter(name => name);
      
      return printers.length > 0 ? printers : ['default'];
    } catch (error) {
      console.warn('No se pudieron listar las impresoras:', error);
      return ['default', 'USB'];
    }
  }

  async open(): Promise<void> {
    try {
      // Verificar que la impresora esté disponible
      const printers = await USBPrinter.getAvailablePrinters();
      if (!printers.includes(this.printerName) && this.printerName !== 'default') {
        console.warn(`Impresora ${this.printerName} no encontrada, usando default`);
        this.printerName = 'default';
      }
    } catch (error) {
      console.warn('Error al verificar impresora:', error);
    }
  }

  async write(data: Buffer | string): Promise<void> {
    try {
      const printData = typeof data === 'string' ? data : data.toString();
      
      // Crear archivo temporal con los datos
      const tempFile = path.join('/tmp', `ticket_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, printData);

      // Imprimir usando lp (macOS/Linux)
      let command: string;
      
      if (this.printerName === 'default') {
        command = `lp "${tempFile}"`;
      } else {
        command = `lp -d "${this.printerName}" "${tempFile}"`;
      }

      await execAsync(command);
      
      // Limpiar archivo temporal después de un breve delay
      setTimeout(() => {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.warn('No se pudo eliminar archivo temporal:', e);
        }
      }, 1000);

    } catch (error) {
      throw new Error(`Error al imprimir por USB: ${error}`);
    }
  }

  async close(): Promise<void> {
    // No hay conexión persistente que cerrar en este enfoque
    return Promise.resolve();
  }

  getPrinterName(): string {
    return this.printerName;
  }
}