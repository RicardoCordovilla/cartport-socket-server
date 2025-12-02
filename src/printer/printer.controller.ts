import { listPrinters, findTargetPrinter, printRawData } from './utils/printer.utils';
import {
  generateAirportTicketContent,
  generateFillTicketContent,
  generateCoinEmptyTicketContent,
  generateBillEmptyTicketContent,
  generateRecaudacionTicketContent,
} from './utils/ticket-generators';
import {
  AirportTicketData,
  FillTicketData,
  CoinEmptyTicketData,
  BillEmptyTicketData,
  RecaudacionTicketData,
} from './types/ticket.types';

export async function printAirportTicket(data: AirportTicketData): Promise<void> {
  console.log("=== Iniciando impresión de ticket ===");

  const printers = await listPrinters();
  const targetPrinter = findTargetPrinter(printers);
  const ticketContent = generateAirportTicketContent(data);

  await printRawData(targetPrinter, ticketContent);
}

export async function printFillTicket(data: FillTicketData): Promise<void> {
  console.log("=== Iniciando impresión de ticket de llenado ===");

  const printers = await listPrinters();
  const targetPrinter = findTargetPrinter(printers);
  const ticketContent = generateFillTicketContent(data);

  await printRawData(targetPrinter, ticketContent);
}

export async function printCoinEmptyTicket(data: CoinEmptyTicketData): Promise<void> {
  console.log("=== Iniciando impresión de ticket de vaciado de monedas ===");

  const printers = await listPrinters();
  const targetPrinter = findTargetPrinter(printers);
  const ticketContent = generateCoinEmptyTicketContent(data);

  await printRawData(targetPrinter, ticketContent);
}

export async function printBillEmptyTicket(data: BillEmptyTicketData): Promise<void> {
  console.log("=== Iniciando impresión de ticket de vaciado de billetes ===");

  const printers = await listPrinters();
  const targetPrinter = findTargetPrinter(printers);
  const ticketContent = generateBillEmptyTicketContent(data);

  await printRawData(targetPrinter, ticketContent);
}

export async function printRecaudacionTicket(data: RecaudacionTicketData): Promise<void> {
  console.log("=== Iniciando impresión de ticket de recaudación ===");

  const printers = await listPrinters();
  const targetPrinter = findTargetPrinter(printers);
  const ticketContent = generateRecaudacionTicketContent(data);

  await printRawData(targetPrinter, ticketContent);
}
