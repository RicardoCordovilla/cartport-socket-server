import { calculateSecurityComponent } from "./utils/funtions";

export function buildReverseFrame(params: {
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
  fechaOriginal: string; // AAAAMMDD
  horaOriginal: string; // HHMMSS
  numeroFactura?: string;
}): string {
  const tipo = "PP";
  const tipoTransaccion = params.tipoReverso; // "03" ó "04"
  const codigoRed = "1";
  const codigoDiferido = "00";
  const plazoDiferido = "00";
  const mesesGracia = "00";
  const filler1 = " ";

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

  const isAnulacion = tipoTransaccion === "03";

  // ✅ Solo en 03 (anulación) se envía secuencial; en 04 (reverso) va en blancos
  const secuencial = isAnulacion
    ? params.secuencialOriginal.padStart(6, "0")
    : " ".repeat(6); // :contentReference[oaicite:5]{index=5}

  // Hora y fecha: para 04 puedes usar actuales; mantener las originales también es válido.
  const hora = params.horaOriginal.padStart(6, "0");
  const fecha = params.fechaOriginal.padStart(8, "0");

  // ✅ Solo en 03 (anulación) se envía número de autorización; en 04 (reverso) va en blancos
  const numeroAutorizacion = isAnulacion
    ? params.numeroAutorizacion.substring(0, 6).padEnd(6, " ")
    : " ".repeat(6); // :contentReference[oaicite:6]{index=6}

  const mid = params.mid.substring(0, 15).padEnd(15, " ");
  const tid = params.tid.substring(0, 8).padEnd(8, " ");
  const cid = params.cid.substring(0, 15).padEnd(15, " ");

  const ott = " ".repeat(10); // 10 AN por defecto fuera de PayClub/BDP. :contentReference[oaicite:7]{index=7}
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

  const lengthHex = frameWithSecurity.length
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();
  return lengthHex + frameWithSecurity;
}
