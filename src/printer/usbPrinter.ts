// src/printer/usbPrinter.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

interface USBPrinterOptions {
  printerName?: string; // Nombre de la impresora USB
}

export class USBPrinter {
  private printerName: string;
  private isWindows: boolean;

  constructor(options: USBPrinterOptions = {}) {
    this.isWindows = os.platform() === 'win32';
    this.printerName = options.printerName || this.getDefaultPrinter();
  }

  private getDefaultPrinter(): string {
    if (this.isWindows) {
      return 'default'; // En Windows usaremos la impresora por defecto
    } else {
      return 'default'; // En macOS/Linux también
    }
  }

  static async getAvailablePrinters(): Promise<string[]> {
    const isWindows = os.platform() === 'win32';
    
    try {
      if (isWindows) {
        // En Windows usamos wmic para listar impresoras
        const { stdout } = await execAsync('wmic printer get name /format:csv');
        const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Node,Name'));
        const printers = lines
          .map(line => {
            const parts = line.split(',');
            return parts[parts.length - 1]?.trim();
          })
          .filter(name => name && name !== '');
        
        return printers.length > 0 ? printers : ['default'];
      } else {
        // En macOS/Linux usamos lpstat
        const { stdout } = await execAsync('lpstat -p');
        const printers = stdout
          .split('\n')
          .filter(line => line.startsWith('printer'))
          .map(line => line.split(' ')[1])
          .filter(name => name);
        
        return printers.length > 0 ? printers : ['default'];
      }
    } catch (error) {
      console.warn('No se pudieron listar las impresoras:', error);
      return ['default'];
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
      
      // Crear directorio temporal apropiado según el OS
      const tempDir = this.isWindows ? 'C:\\tmp' : '/tmp';
      
      // Crear el directorio si no existe (solo para Windows)
      if (this.isWindows && !fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFile = path.join(tempDir, `ticket_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, printData);

      // Usar comando apropiado según el sistema operativo
      let command: string;
      
      if (this.isWindows) {
        if (this.printerName === 'default') {
          // En Windows, usar notepad /p para imprimir a la impresora por defecto
          command = `notepad /p "${tempFile}"`;
        } else {
          // Para una impresora específica en Windows
          command = `print /D:"${this.printerName}" "${tempFile}"`;
        }
      } else {
        // En macOS/Linux usar lp
        if (this.printerName === 'default') {
          command = `lp "${tempFile}"`;
        } else {
          command = `lp -d "${this.printerName}" "${tempFile}"`;
        }
      }

      await execAsync(command);
      
      // Limpiar archivo temporal después de un breve delay
      setTimeout(() => {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.warn('No se pudo eliminar archivo temporal:', e);
        }
      }, 2000); // Mayor delay para Windows

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

  getOperatingSystem(): string {
    return this.isWindows ? 'Windows' : 'Unix/Linux/macOS';
  }

  // Método estático para obtener información detallada del sistema
  static getSystemInfo() {
    const platform = os.platform();
    const isWindows = platform === 'win32';
    
    return {
      platform: platform,
      isWindows: isWindows,
      architecture: os.arch(),
      hostname: os.hostname(),
      type: os.type(),
      release: os.release(),
      printingSupport: {
        method: isWindows ? 'Windows Print Spooler' : 'CUPS',
        commands: isWindows ? ['notepad /p', 'print /D:'] : ['lp', 'lpstat'],
        tempDirectory: isWindows ? 'C:\\tmp' : '/tmp'
      }
    };
  }

  // Método estático para verificar si una impresora específica existe
  static async isPrinterAvailable(printerName: string): Promise<boolean> {
    try {
      const printers = await this.getAvailablePrinters();
      return printers.includes(printerName) || printerName === 'default';
    } catch (error) {
      console.warn('Error checking printer availability:', error);
      return false;
    }
  }
}