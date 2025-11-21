import { SerialPrinter } from "./serialPrinter";
import { printPaymentTicket, AirportTicketData } from "./tickets";

const ESC = "\x1B";
const GS = "\x1D";

// Comandos para control de tamaño de fuente
const FONT_SIZE_NORMAL = ESC + "!" + "\x00";  // Tamaño normal
const FONT_SIZE_DOUBLE_WIDTH = ESC + "!" + "\x20";  // Doble ancho
const FONT_SIZE_DOUBLE_HEIGHT = ESC + "!" + "\x10";  // Doble altura
const FONT_SIZE_DOUBLE = ESC + "!" + "\x30";  // Doble ancho y altura
const FONT_SIZE_LARGE = GS + "!" + "\x11";  // Tamaño grande (2x2)

// Comandos para espaciado entre caracteres
const CHAR_SPACING_NORMAL = ESC + " " + "\x00";  // Espaciado normal (0)
const CHAR_SPACING_SMALL = ESC + " " + "\x01";   // Espaciado pequeño (1 punto)
const CHAR_SPACING_MEDIUM = ESC + " " + "\x02";  // Espaciado medio (2 puntos)
const CHAR_SPACING_LARGE = ESC + " " + "\x03";   // Espaciado grande (3 puntos)
const CHAR_SPACING_XLARGE = ESC + " " + "\x05";  // Espaciado extra grande (5 puntos)

// Comandos para alineación del texto
const ALIGN_LEFT = ESC + "a" + "\x00";    // Alineación izquierda
const ALIGN_CENTER = ESC + "a" + "\x01";  // Alineación centrada
const ALIGN_RIGHT = ESC + "a" + "\x02";   // Alineación derecha

// Función principal que ahora usa el sistema unificado
export async function printAirportTicket(
  devicePath: string,
  data: AirportTicketData
) {
  // Usar el nuevo sistema unificado para impresión serial
  return await printPaymentTicket(
    { type: 'serial', devicePath },
    data
  );
}

// Función alternativa con formato personalizado (mantiene el formato original)
export async function printAirportTicketCustomFormat(
  devicePath: string,
  data: AirportTicketData
) {
  const printer = new SerialPrinter({ path: devicePath, baudRate: 115200 });

  try {
    await printer.open();
    let buf = "";
    buf += ESC + "@"; // init

    // Header
    buf += CHAR_SPACING_SMALL;
    buf += ALIGN_CENTER;
    buf += `${data.companyName}\n`;
    buf += `${data.location}\n\n`;

    buf += `${data.airportName}\n\n`;

    buf += `TELEFONO DE ATENCION: ${data.phoneNumber}\n`;
    buf += "--------------------------------\n";
    buf += "      COMPROBANTE DE PAGO\n\n";

    // Ticket details
    buf += CHAR_SPACING_NORMAL;
    buf += ALIGN_LEFT;
    buf += `Monolito numero : ${data.ticketNumber.slice(-1)}\n`;
    buf += `Fecha : ${data.date}         ${data.time}\n`;
    buf += `Num de tiquet : ${data.ticketNumber}\n\n`;

    // Service and amounts
    buf += CHAR_SPACING_MEDIUM;
    buf += ALIGN_LEFT;
    buf += `Por utilizacion ${data.serviceType}\n`;
    buf += `TOTAL GRABADO           ${data.subtotal.toFixed(2)} $\n`;
    buf += `IVA   ${data.taxRate}%                ${data.tax.toFixed(2)} $\n`;
    buf += `TOTAL                   ${data.total.toFixed(2)} $\n`;
    buf += "--------------------------------\n";

    // Payment details
    buf += CHAR_SPACING_LARGE;
    buf += ALIGN_LEFT;
    buf += `Pagado:                 ${data.paid.toFixed(2)} $\n`;
    buf += `Cambio:                 ${data.change.toFixed(2)} $\n`;
    buf += `Error de cambio:        ${data.changeError.toFixed(2)} $\n`;
    buf += "--------------------------------\n";

    buf += CHAR_SPACING_NORMAL;
    buf += ALIGN_CENTER;
    buf += "DOCUMENTO SIN VALOR TRIBUTARIO\n\n";

    if (data.website) {
      buf += CHAR_SPACING_SMALL;
      buf += ALIGN_CENTER;
      buf += "SI DESEA FACTURA INGRESAR A ESTE LINK:\n";
      buf += `     ${data.website}\n\n`;
    }

    buf += CHAR_SPACING_XLARGE;
    buf += ALIGN_CENTER;
    buf += `        TOTAL        ${data.total.toFixed(2)} $\n`;
    buf += "      (IVA Incluido)\n\n\n\n\n";

    // Enviar el contenido principal primero
    await printer.write(buf);
    
    // Esperar un momento para que la impresión termine
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Añadir líneas adicionales antes del corte
    await printer.write("\n\n\n");
    
    const cut = Buffer.from([0x1d, 0x56, 0x01]);
    await printer.write(cut);
    await printer.write("\n\n");
  } finally {
    await printer.close();
  }
}
