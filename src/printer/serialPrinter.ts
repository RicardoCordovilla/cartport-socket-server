// src/printer/serialPrinter.ts
import { SerialPort } from "serialport";

interface SerialPrinterOptions {
  path: string;      // Ej: "/dev/tty.usbserial-1410"
  baudRate?: number; // Ej: 9600 o 115200
}

export class SerialPrinter {
  private _port: SerialPort;

  constructor(options: SerialPrinterOptions) {
    this._port = new SerialPort({
      path: options.path,
      baudRate: options.baudRate ?? 9600,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      autoOpen: false,
    });
  }

  // Expose the port for status monitoring
  get port(): SerialPort {
    return this._port;
  }

  open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._port.open((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  write(data: Buffer | string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._port.write(data, (err) => {
        if (err) return reject(err);
        this._port.drain((err2) => {
          if (err2) return reject(err2);
          resolve();
        });
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._port.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}
