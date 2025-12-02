import { COMMANDS, createLine, createSeparator, createPaddedLine } from './escpos.utils';
import { 
  AirportTicketData, 
  FillTicketData, 
  CoinEmptyTicketData, 
  BillEmptyTicketData, 
  RecaudacionTicketData 
} from '../types/ticket.types';

export function generateAirportTicketContent(data: AirportTicketData): Buffer {
  return Buffer.concat([
    COMMANDS.INIT,
    COMMANDS.CENTER,
    createLine(`SERVICIOS DE GESTION`),
    createLine(`AEROPORTUARIA S.A.`),
    COMMANDS.NORMAL,
    createLine(`Vía a Tababela`),
    createLine(`AEROPUERTO INT. MARISCAL SUCRE - QUITO`),
    createLine(`Telefono de atención: ${data.phoneNumber}`),
    createSeparator(),
    COMMANDS.CENTER,
    createLine("COMPROBANTE DE PAGO\n"),

    COMMANDS.LEFT,
    createLine(`Monolito numero: ${data.stationNumber}`),
    createLine(`Fecha: ${data.date}         ${data.time}`),
    createLine(`Num de tiquet: ${data.ticketNumber}\n`),

    createLine(`Por utilizacion ${data.serviceType}`),
    createLine(`TOTAL GRABADO           ${data.subtotal.toFixed(2)} $`),
    createLine(`IVA   ${data.taxRate}%                ${data.tax.toFixed(2)} $`),
    createLine(`TOTAL                   ${data.total.toFixed(2)} $`),
    createSeparator(),

    createLine(`Pagado:                 ${data.paid.toFixed(2)} $`),
    createLine(`Cambio:                 ${data.change.toFixed(2)} $`),

    ...(data.changeError !== undefined
      ? [createLine(`Error de cambio:        ${data.changeError.toFixed(2)} $`)]
      : []),

    createSeparator(),

    COMMANDS.CENTER,
    createLine("DOCUMENTO SIN VALOR TRIBUTARIO\n"),

    ...(data.website
      ? [
          createLine("SI DESEA FACTURA INGRESAR A ESTE LINK:"),
          createLine(`     ${data.website}\n`),
        ]
      : []),

    COMMANDS.CENTER,
    COMMANDS.DOUBLE,
    createLine(`TOTAL: ${data.total.toFixed(2)} $`),
    COMMANDS.CENTER,
    COMMANDS.NORMAL,
    createLine("(IVA Incluido)\n\n\n\n\n"),
    COMMANDS.CUT,
  ]);
}

export function generateFillTicketContent(data: FillTicketData): Buffer {
  const currentTime = new Date().toLocaleTimeString("es-EC", { hour12: false });

  return Buffer.concat([
    COMMANDS.INIT,
    COMMANDS.CENTER,
    createLine(`SERVICIOS DE GESTION AEROPORTUARIA`),
    createLine(`AEROGERPSA S.A.`),
    COMMANDS.NORMAL,
    createLine(`Vía a Tababela`),
    createLine(`AEROPUERTO INT. MARISCAL SUCRE - QUITO`),
    createLine(`TELEFONO DE ATENCION: 022818462`),
    createSeparator(),
    COMMANDS.CENTER,
    createLine("OPERACIÓN LLENADO MONEDAS\n"),

    COMMANDS.LEFT,
    createLine(`Numero de maquina        :  ${data.stationId.toString().padStart(10)}`),
    createLine(`Fecha : ${data.date}            ${currentTime}`),
    createLine(""),
    createLine(`Numero de tiquet    : ${data.ticketNumber}`),
    createLine(""),
    createLine(`LLENADO DEL HOPPER     : ${data.amount.toFixed(2).padStart(8)} $`),

    createLine("\n\n\n\n\n"),
    COMMANDS.CUT,
  ]);
}

export function generateCoinEmptyTicketContent(data: CoinEmptyTicketData): Buffer {
  const currentTime = new Date().toLocaleTimeString("es-EC", { hour12: false });

  return Buffer.concat([
    COMMANDS.INIT,
    COMMANDS.CENTER,
    createLine(`SERVICIOS DE GESTION AEROPORTUARIA`),
    createLine(`AEROGERPSA S.A.`),
    COMMANDS.NORMAL,
    createLine(`Via a Tababela`),
    createLine(`AEROPUERTO INT. MARISCAL SUCRE - QUITO`),
    createLine(`TELEFONO DE ATENCION: 022818462`),
    createSeparator(),
    COMMANDS.CENTER,
    createLine("OPERACION VACIADO MONEDAS\n"),

    COMMANDS.LEFT,
    createLine(`Numero de maquina        : ${data.stationId.toString().padStart(10)}`),
    createLine(`Fecha : ${data.date}            ${currentTime}`),
    createLine(""),
    createLine(`Numero de tiquet    : ${data.ticketNumber}`),
    createLine(""),
    createLine(`MONTANTE EN HOPPER     : ${data.amount.toFixed(2).padStart(8)} $`),

    createLine("\n\n\n\n\n"),
    COMMANDS.CUT,
  ]);
}

export function generateBillEmptyTicketContent(data: BillEmptyTicketData): Buffer {
  const currentTime = new Date().toLocaleTimeString("es-EC", { hour12: false });

  return Buffer.concat([
    COMMANDS.INIT,
    COMMANDS.CENTER,
    createLine(`SERVICIOS DE GESTION AEROPORTUARIA`),
    createLine(`AEROGERPSA S.A.`),
    COMMANDS.NORMAL,
    createLine(`Via a Tababela`),
    createLine(`AEROPUERTO INT. MARISCAL SUCRE - QUITO`),
    createLine(`TELEFONO DE ATENCION: 022818462`),
    createSeparator(),
    COMMANDS.CENTER,
    createLine("OPERACION VACIADO BILLETES\n"),

    COMMANDS.LEFT,
    createLine(`Numero de maquina        : ${data.stationId.toString().padStart(10)}`),
    createLine(`Fecha : ${data.date}            ${currentTime}`),
    createLine(""),
    createLine(`Numero de tiquet    : ${data.ticketNumber}`),
    createLine(""),
    createSeparator(),
    createLine(""),
    createLine(`BILLETES  1                     ${data.bills1.toString().padStart(8)}`),
    createLine(`BILLETES  5                     ${data.bills5.toString().padStart(8)}`),
    createLine(`BILLETES 10                     ${data.bills10.toString().padStart(8)}`),
    createLine(""),
    createLine(`MONTANTE EN BILLETERO   : ${data.totalAmount.toFixed(2).padStart(8)} $`),
    createSeparator(),

    createLine("\n\n\n\n\n"),
    COMMANDS.CUT,
  ]);
}

export function generateRecaudacionTicketContent(data: RecaudacionTicketData): Buffer {
  const currentTime = new Date().toLocaleTimeString("es-EC", { hour12: false });

  return Buffer.concat([
    COMMANDS.INIT,
    COMMANDS.CENTER,
    createLine(`SERVICIOS DE GESTION AEROPORTUARIA`),
    createLine(`AEROGERPSA S.A.`),
    createLine(`Via a Tababela`),
    COMMANDS.NORMAL,
    createLine(`AEROPUERTO INT. MARISCAL SUCRE - QUITO`),
    createLine(`TELEFONO DE ATENCION: 022818462`),
    createSeparator(),
    createLine(`MONOLITO NUMERO                 ${data.stationId}`),
    createLine(`Fecha : ${data.date}     ${currentTime}`),
    createSeparator(),
    COMMANDS.CENTER,
    createLine("VALORES ACUMULADOS DESDE"),
    createLine("ANTERIOR RECAUDACION"),
    COMMANDS.LEFT,
    createLine(""),
    createLine(`Numero de usos          :         ${data.resumen.totalCartsSoldSession}`),
    createSeparator(),
    createLine(`ACUMUL LLENADO MONEDA   :   ${data.resumen.llenados.total.toFixed(2)} $`),
    createLine(`ACUMUL VACÍA MONEDAS    :   ${data.resumen.vaciadosMonedas.total.toFixed(2)} $`),
    createLine(`ACUMUL VACÍA BILLETES   :   ${data.resumen.vaciadosBilletes.total.toFixed(2)} $`),
    createLine(`ACUMUL ERROR DEVOLUCIO  :     0.00 $`),
    createSeparator(),

    COMMANDS.CENTER,
    createLine("RECAUDACION"),
    COMMANDS.LEFT,
    createSeparator(),
    createLine(`Numero de tiquet        :  ${data.ticketNumber}`),
    createSeparator(),
    createLine(`NUMERO BILLETES 1       :         ${data.resumen.totalOne}`),
    createLine(`NUMERO BILLETES 5       :         ${data.resumen.totalFive}`),
    createLine(`NUMERO BILLETES 10      :         ${data.resumen.totalTen}`),
    createSeparator(),
    createLine(`MONTANTE BILLETERO      :    ${(
      data.resumen.totalOne +
      data.resumen.totalFive * 5 +
      data.resumen.totalTen * 10
    ).toFixed(2)} $`),
    createLine(`MONEDAS EN HOPPER        :    ${data.hopper.toFixed(2)} $`),
    createLine(`MONTANTE MONEDERO       :    ${data.resumen.totalCoins.toFixed(2)} $`),
    createLine(`MONEDAS DEVUELTAS       :    ${data.resumen.totalCoinsGiven.toFixed(2)} $`),
    createLine(`MONTANTE TOTAL          :   ${(
      data.hopper +
      data.resumen.totalOne +
      data.resumen.totalFive * 5 +
      data.resumen.totalTen * 10
    ).toFixed(2)} $`),
    createSeparator(),
    createLine(`VENTA TOTAL        :   ${(data.resumen.totalCartsSoldSession * 3).toFixed(2)} $`),
    createSeparator(),
    createLine(`ERROR DEVOLUCION        :     0.00 $`),
    createSeparator(),

    createLine("\n\n\n\n\n"),
    COMMANDS.CUT,
  ]);
}