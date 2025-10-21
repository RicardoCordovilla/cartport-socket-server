import { calculateSecurityComponent } from "./utils/funtions";

export function buildReverseFrame(params: {
  tipoReverso: "03" | "04"; // 03=Anulación manual, 04=Reverso automático
  secuencialOriginal: string;
  numeroAutorizacion: string;
  monto: number;
  montoBaseIva: number;
  montoBaseNoIva: number;
  iva: number;
  mid: string;
  tid: string;
  cid: string;
  fechaOriginal: string; // AAAAMMDD
  horaOriginal: string; // HHMMSS
  numeroFactura?: string;
}): string {
  const tipo = "PP";
  const tipoTransaccion = params.tipoReverso; // 03 o 04
  const codigoRed = "1"; // Datafast
  const codigoDiferido = "00";
  const plazoDiferido = "00";
  const mesesGracia = "00";
  const filler1 = " ";

  // Montos (igual que en la transacción original)
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

  const impuestoServicio = " ".repeat(12);
  const propina = " ".repeat(12);
  const montoFijo = " ".repeat(12);

  // IMPORTANTE: Para reversos, enviar el secuencial de la transacción original
  const secuencial = params.secuencialOriginal.padStart(6, "0");

  // IMPORTANTE: Para reversos, usar fecha y hora de la transacción original
  const hora = params.horaOriginal.padStart(6, "0");
  const fecha = params.fechaOriginal.padStart(8, "0");

  // IMPORTANTE: Enviar número de autorización original
  const numeroAutorizacion = params.numeroAutorizacion
    .substring(0, 6)
    .padEnd(6, " ");

  const mid = params.mid.substring(0, 15).padEnd(15, " ");
  const tid = params.tid.substring(0, 8).padEnd(8, " ");
  const cid = params.cid.substring(0, 15).padEnd(15, " ");
  const ott = " ".repeat(10);
  const numeroFactura = (params.numeroFactura || "")
    .substring(0, 15)
    .padEnd(15, " ");
  const pushVendedor = " ".repeat(15);
  const filler2 = " ".repeat(20);

  const frame =
    tipo +
    tipoTransaccion +
    codigoRed +
    codigoDiferido +
    plazoDiferido +
    mesesGracia +
    filler1 +
    montoTotal +
    montoBase12 +
    montoBase0 +
    impuestoIva +
    impuestoServicio +
    propina +
    montoFijo +
    secuencial +
    hora +
    fecha +
    numeroAutorizacion +
    mid +
    tid +
    cid +
    ott +
    numeroFactura +
    pushVendedor +
    filler2;

  const securityComponent = calculateSecurityComponent(frame);
  const frameWithSecurity = frame + securityComponent;

  console.log(`\n=== DEBUG TRAMA REVERSO ===`);
  console.log(
    `Tipo Reverso: ${
      tipoTransaccion === "03" ? "Anulación Manual" : "Reverso Automático"
    }`
  );
  console.log(`Longitud sin seguridad: ${frame.length} (esperado: 220)`);
  console.log(`Secuencial Original: ${secuencial}`);
  console.log(`Hora Original: ${hora}`);
  console.log(`Fecha Original: ${fecha}`);
  console.log(`Número Autorización: ${numeroAutorizacion.trim()}`);
  console.log(`Monto Total: ${montoTotal} (${params.monto})`);
  console.log(`MID: '${mid.trim()}'`);
  console.log(`TID: '${tid.trim()}'`);
  console.log(`CID: '${cid.trim()}'`);
  console.log(`Factura: '${numeroFactura.trim()}'`);
  console.log(`Security: ${securityComponent}`);
  console.log(`Longitud total: ${frameWithSecurity.length}`);
  console.log(`===========================\n`);

  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();

  return lengthHex + frameWithSecurity;
}
