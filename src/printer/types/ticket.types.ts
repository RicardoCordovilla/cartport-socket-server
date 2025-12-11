export interface AirportTicketData {
  companyName: string;
  location: string;
  airportName: string;
  phoneNumber: string;
  ticketNumber: string;
  stationNumber: string;
  date: string;
  time: string;
  serviceType: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paid: number;
  change: number;
  changeError?: number;
  website?: string;
}

export interface FillTicketData {
  stationId: number;
  ticketNumber: string;
  date: string;
  amount: number;
}

export interface CoinEmptyTicketData {
  stationId: number;
  date: string;
  ticketNumber: string;
  amount: number;
}

export interface BillEmptyTicketData {
  stationId: number;
  date: string;
  ticketNumber: string;
  bills1: number;
  bills5: number;
  bills10: number;
  totalAmount: number;
}

export interface RecaudacionTicketData {
  stationId: number;
  date: string;
  ticketNumber: string;
  ticketNumberAnterior: string;
  hopper: number;
  resumen: {
    llenados: {
      veces: number;
      total: number;
    };
    vaciadosMonedas: {
      veces: number;
      total: number;
    };
    vaciadosBilletes: {
      veces: number;
      Billete_de_1: number;
      Billete_de_5: number;
      Billete_de_10: number;
      total: number;
    };
    totalOne: number;
    totalFive: number;
    totalTen: number;
    totalCartsSoldSession: number;
    totalCoins: number;
    totalCoinsGiven: number;
    totalAmountCalculated: number;
  };
}

export interface CancellationTicketData {
  stationId: number;
  ticketNumber: string;
  date: string;
  pagado: number;
  cambio: number;
  error: number;
}