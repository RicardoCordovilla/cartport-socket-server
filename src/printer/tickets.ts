// src/tickets.ts
import { SerialPrinter } from "./serialPrinter";

const ESC = "\x1B";
const GS = "\x1D";

interface PaymentTicketData {
  propertyName: string;
  ownerName?: string;
  date: string; // ya formateada
  concept: string;
  amount: number;
}

export async function printPaymentTicket(
  devicePath: string,
  data: PaymentTicketData
) {
  const printer = new SerialPrinter({ path: devicePath, baudRate: 9600 });

  await printer.open();

  try {
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

    const cut = Buffer.from([0x1d, 0x56, 0x01]);

    await printer.write(buf);
    await printer.write(cut);
    await printer.write("\n\n");
  } finally {
    await printer.close();
  }
}
