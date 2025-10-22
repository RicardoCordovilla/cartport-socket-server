import { PINPAD_CONFIG } from "./pinpad.config";
import { buildReverseFrame } from "./pinpad.helper";
import {
  calculateSecurityComponent,
  parsePaymentResponse,
  sendToPinPad,
} from "./utils/funtions";

/**
 * Construye la trama de configuración del PinPad con componente de seguridad
 */
export function buildConfigFrame(
  ip: string,
  mask: string,
  gateway: string
): string {
  const tipo = "CP";
  const ipPadded = ip.padEnd(15, " ");
  const maskPadded = mask.padEnd(15, " ");
  const gatewayPadded = gateway.padEnd(15, " ");

  // Host y puerto (espacios en blanco para usar valores por defecto)
  const hostPrimary = "".padEnd(15, " ");
  const portPrimary = "".padEnd(6, " ");
  const hostAlternate = "".padEnd(15, " ");
  const portAlternate = "".padEnd(6, " ");

  // Fillers
  const filler1 = "".padEnd(15, " ");
  const filler2 = "".padEnd(6, " ");
  const filler3 = "".padEnd(15, " ");
  const filler4 = "".padEnd(6, " ");

  const listenPort = PINPAD_CONFIG.port.toString().padStart(6, "0");

  const frame =
    tipo +
    ipPadded +
    maskPadded +
    gatewayPadded +
    hostPrimary +
    portPrimary +
    hostAlternate +
    portAlternate +
    filler1 +
    filler2 +
    filler3 +
    filler4 +
    listenPort;

  // Agregar componente de seguridad
  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  // Agregar longitud en hexadecimal al inicio
  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();

  console.log(`\n=== DEBUG CONFIG FRAME ===`);
  console.log(`Frame sin seguridad: ${frame.length} chars`);
  console.log(`Security component: ${securityComponent}`);
  console.log(`Frame completo: ${frameWithSecurity.length} chars`);
  console.log(`===========================\n`);

  return lengthHex + frameWithSecurity;
}

/**
 * Construye la trama de proceso de control
 */
export function buildControlFrame(params: {
  lote: string;
  secuencial: string;
  mid: string;
  tid: string;
  cid: string;
}): string {
  const tipo = "PC";
  const lote = params.lote.padStart(6, "0");
  const secuencial = params.secuencial.padStart(6, "0");

  // CRÍTICO: El documento dice "Filler 12 N" pero debe ser espacios
  const filler1 = " ".repeat(12);

  const mid = params.mid.substring(0, 15).padEnd(15, " ");
  const tid = params.tid.substring(0, 8).padEnd(8, " ");

  // Filler 23 AN
  const filler2 = " ".repeat(23);

  const cid = params.cid.substring(0, 15).padEnd(15, " ");

  // Filler 01 N - Valor fijo "1"
  const filler3 = "1";

  const frame =
    tipo + lote + secuencial + filler1 + mid + tid + filler2 + cid + filler3;

  // Agregar componente de seguridad
  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  // La longitud debe ser: 88 + 32 = 120
  console.log(`\n=== DEBUG PROCESO CONTROL ===`);
  console.log(`Longitud sin seguridad: ${frame.length} (esperado: 88)`);
  console.log(`Tipo: '${tipo}'`);
  console.log(`Lote: '${lote}'`);
  console.log(`Secuencial: '${secuencial}'`);
  console.log(`Filler1 (12): length=${filler1.length}`);
  console.log(`MID: '${mid}' length=${mid.length}`);
  console.log(`TID: '${tid}' length=${tid.length}`);
  console.log(`Filler2 (23): length=${filler2.length}`);
  console.log(`CID: '${cid}' length=${cid.length}`);
  console.log(`Filler3: '${filler3}'`);
  console.log(`Security: ${securityComponent}`);
  console.log(`Longitud total: ${frameWithSecurity.length}`);
  console.log(`Trama completa: ${frameWithSecurity}`);
  console.log(`=============================\n`);

  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();
  return lengthHex + frameWithSecurity;
}

/**
 * Construye la trama de configuración básica
 */
export function buildBasicConfigFrame(): string {
  const tipo = "CB";
  const frame = tipo;

  // Agregar componente de seguridad
  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();

  console.log(`\n=== DEBUG CONFIG BASICA ===`);
  console.log(`Frame: ${frame}`);
  console.log(`Security: ${securityComponent}`);
  console.log(`Total: ${frameWithSecurity.length} chars`);
  console.log(`===========================\n`);

  return lengthHex + frameWithSecurity;
}

/**
 * Construye la trama de lectura de tarjeta
 */
export function buildReadCardFrame(): string {
  const tipo = "LT";
  const frame = tipo;

  // Agregar componente de seguridad
  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  console.log(`\n=== DEBUG LECTURA TARJETA ===`);
  console.log(`Frame: ${frame}`);
  console.log(`Security: ${securityComponent}`);
  console.log(`Total: ${frameWithSecurity.length} chars`);
  console.log(`=============================\n`);

  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();
  return lengthHex + frameWithSecurity;
}

/**
 * Construye la trama de proceso de pago
 */
export function buildPaymentFrame(params: {
  monto: number;
  montoBaseIva: number;
  montoBaseNoIva: number;
  iva: number;
  mid: string;
  tid: string;
  cid: string;
  numeroFactura?: string;
}): string {
  // Tipo de mensaje y transacción
  const tipo = "PP";
  const tipoTransaccion = "01"; // Compra corriente
  const codigoRed = "1"; // Datafast (1 carácter)
  const codigoDiferido = "00"; // Corriente
  const plazoDiferido = "00";
  const mesesGracia = "00";
  const filler1 = " ";

  // Montos (12 dígitos: 10 enteros, 2 decimales, sin puntuación)
  const montoTotal = Math.round(params.monto * 100)
    .toString()
    .padStart(12, "0");
  const montoBase12 = Math.round(params.montoBaseIva * 100)
    .toString()
    .padStart(12, "0");
  const montoBase0 = Math.round(params.montoBaseNoIva * 100)
    .toString()
    .padStart(12, "0");
  const impuestoIva = Math.round(params.iva * 100)
    .toString()
    .padStart(12, "0");

  // Campos opcionales - 12 caracteres cada uno (espacios cuando no aplican)
  const impuestoServicio = " ".repeat(12);
  const propina = " ".repeat(12);
  const montoFijo = " ".repeat(12);

  // Secuencial - 6 caracteres (espacios para compras nuevas)
  const secuencial = " ".repeat(6);

  // Fecha y hora actual - IMPORTANTE: formato correcto
  const now = new Date();
  const hora =
    now.getHours().toString().padStart(2, "0") +
    now.getMinutes().toString().padStart(2, "0") +
    now.getSeconds().toString().padStart(2, "0");
  const fecha =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");

  // Número de autorización - 6 caracteres (espacios para compras nuevas)
  const numeroAutorizacion = " ".repeat(6);

  // Identificadores - deben mantener exactamente las longitudes especificadas
  const mid = params.mid.substring(0, 15).padEnd(15, " ");
  const tid = params.tid.substring(0, 8).padEnd(8, " ");
  const cid = params.cid.substring(0, 15).padEnd(15, " ");

  // OTT - 10 caracteres (espacios cuando no aplica)
  const ott = " ".repeat(10);

  // Número de factura - 15 caracteres
  const numeroFactura = (params.numeroFactura || "")
    .substring(0, 15)
    .padEnd(15, " ");

  // Push vendedor - 15 caracteres (espacios cuando no aplica)
  const pushVendedor = " ".repeat(15);

  // Filler final - 20 caracteres
  const filler2 = " ".repeat(20);

  // Construir la trama en el orden exacto según la especificación
  const frame =
    tipo + // 2 - PP
    tipoTransaccion + // 2 - 01
    codigoRed + // 1 - 1
    codigoDiferido + // 2 - 00
    plazoDiferido + // 2 - 00
    mesesGracia + // 2 - 00
    filler1 + // 1 - espacio
    montoTotal + // 12
    montoBase12 + // 12
    montoBase0 + // 12
    impuestoIva + // 12
    impuestoServicio + // 12
    propina + // 12
    montoFijo + // 12
    secuencial + // 6
    hora + // 6
    fecha + // 8
    numeroAutorizacion + // 6
    mid + // 15
    tid + // 8
    cid + // 15
    ott + // 10
    numeroFactura + // 15
    pushVendedor + // 15
    filler2; // 20

  // Agregar componente de seguridad
  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  // Total esperado: 220 + 32 = 252 caracteres
  console.log(`\n=== DEBUG TRAMA PAGO ===`);
  console.log(`Longitud sin seguridad: ${frame.length} (esperado: 220)`);
  console.log(`Tipo: ${tipo}`);
  console.log(`Transacción: ${tipoTransaccion}`);
  console.log(`Red: ${codigoRed}`);
  console.log(`Diferido: ${codigoDiferido}`);
  console.log(`Monto Total: ${montoTotal} (${params.monto})`);
  console.log(`Base 12%: ${montoBase12} (${params.montoBaseIva})`);
  console.log(`Base 0%: ${montoBase0} (${params.montoBaseNoIva})`);
  console.log(`IVA: ${impuestoIva} (${params.iva})`);
  console.log(`Hora: ${hora}`);
  console.log(`Fecha: ${fecha}`);
  console.log(`MID: '${mid}'`);
  console.log(`TID: '${tid}'`);
  console.log(`CID: '${cid}'`);
  console.log(`Factura: '${numeroFactura}'`);
  console.log(`Security: ${securityComponent}`);
  console.log(`Longitud total: ${frameWithSecurity.length}`);
  console.log(`===================\n`);

  // Agregar longitud en hexadecimal al inicio
  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();

  return lengthHex + frameWithSecurity;
}

export const executeReverse = async (params: {
  tipoReverso: "03" | "04";
  secuencialOriginal: string;
  numeroAutorizacion: string;
  monto: number;
  montoBaseIva: number;
  montoBaseNoIva: number;
  iva: number;
  mid: string;
  tid: string;
  cid: string;
  fechaOriginal: string;
  horaOriginal: string;
  numeroFactura?: string;
}): Promise<any> => {
  const frame = buildReverseFrame(params);

  const { response } = await executePinpadOperation(
    params.tipoReverso === "03" ? "04" : "03",
    frame,
    {
      amount: params.monto,
      merchantId: params.mid,
      terminalId: params.tid,
      cajaId: params.cid,
      invoiceNumber: params.numeroFactura,
    }
  );

  // Parsear respuesta completa
  const parsedResponse = parsePaymentResponse(response);

  return parsedResponse;
};

export interface PinpadOperationMetadata {
  amount?: number;
  merchantId?: string;
  terminalId?: string;
  cajaId?: string;
  invoiceNumber?: string;
}

export const executePinpadOperation = async (
  operationType: string,
  frame: string,
  metadata?: PinpadOperationMetadata
): Promise<{ response: string }> => {
  const startTime = Date.now();

  try {
    // 2. Enviar trama al PinPad
    const response = await sendToPinPad(frame);
    const responseTime = Date.now() - startTime;

    // 3. Parsear respuesta básica
    const frameData = response.substring(4);
    const codigoRespuesta = frameData.substring(2, 4);
    const mensajeRespuesta = frameData.substring(8, 28).trim();
    const success = codigoRespuesta === "00";

    return { response };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    throw error;
  }
};
