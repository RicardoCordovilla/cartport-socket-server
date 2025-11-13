// src/printer/printSampleTicket.ts
import { SerialPrinter } from "./serialPrinter"; // No extension needed for ts-node

const DEVICE_PATH = "/dev/tty.usbserial-110"; // cambia esto por tu puerto real

// Helper para construir comandos
const ESC = "\x1B";
const GS = "\x1D";

async function main() {
  console.log("Iniciando script de impresión...");
  
  const printer = new SerialPrinter({
    path: DEVICE_PATH,
    baudRate: 115200, // ajusta según la configuración de la impresora
  });

  try {
    console.log(`Intentando abrir puerto: ${DEVICE_PATH}`);
    await printer.open();
    console.log("Puerto serie abierto exitosamente");

    // 1) Inicializar impresora (comando típico ESC @)
    let buffer = "";

    buffer += ESC + "@"; // Initialize

    // 2) Texto del ticket
    buffer += "     CONDOMINAR     \n";
    buffer += "------------------------\n";
    buffer += "Propiedad: Casa 2\n";
    buffer += "Fecha: 12/11/2025 19:45\n";
    buffer += "Concepto: Expensas Noviembre\n";
    buffer += "Monto: $120,00\n";
    buffer += "\n";
    buffer += "Gracias por su pago.\n";
    buffer += "\n\n\n";

    // 3) Comando de corte parcial (muy típico ESC/POS)
    // GS V 1 o GS V 0 según la impresora
    const cutCommand = Buffer.from([0x1d, 0x56, 0x01]); // GS V 1

    // Enviar texto
    await printer.write(buffer);

    // Enviar comando de corte
    await printer.write(cutCommand);

    // Línea de seguridad para que salga el ticket
    await printer.write("\n\n");

    console.log("Ticket enviado por RS232");
  } catch (error) {
    console.error("Error al imprimir:", error);
    if (error instanceof Error) {
      console.error("Detalles del error:", error.message);
    }
  } finally {
    try {
      await printer.close();
      console.log("Puerto serie cerrado");
    } catch (closeError) {
      console.error("Error al cerrar puerto:", closeError);
    }
  }
}

main().catch(console.error);
