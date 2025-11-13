// src/printer/serialPrinter.ts
import { SerialPort } from "serialport";

interface SerialPrinterOptions {
  path: string;      // Ej: "/dev/tty.usbserial-1410"
  baudRate?: number; // Ej: 9600 o 115200
}

export class SerialPrinter {
  private port: SerialPort;

  constructor(options: SerialPrinterOptions) {
    this.port = new SerialPort({
      path: options.path,
      baudRate: options.baudRate ?? 9600,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      autoOpen: false,
    });
  }

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.port.open((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  write(data: Buffer | string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.port.write(data, (err) => {
        if (err) return reject(err);
        this.port.drain((err2) => {
          if (err2) return reject(err2);
          resolve();
        });
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.port.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
