import printer from "printer";

// Comandos ESC/POS básicos
const NORMAL = Buffer.from([0x1B, 0x21, 0x00]);          // Tamaño normal
const DOUBLE = Buffer.from([0x1B, 0x21, 0x30]);          // Doble ancho + alto
const CUT = Buffer.from([0x1D, 0x56, 0x00]);             // Corte total

/**
 * Envía datos RAW a la impresora Bixolon BK3-31
 * @param {Buffer} data 
 */
export function printRaw(data) {
  const printerName = "BIXOLON BK3-31"; // <-- CAMBIAR AL NOMBRE EXACTO DEL SISTEMA

  return new Promise((resolve, reject) => {
    printer.printDirect({
      data,
      printer: printerName,
      type: "RAW",
      success: resolve,
      error: reject
    });
  });
}

// ------------------ Funciones de impresión ------------------

/**
 * Imprime texto tamaño normal
 */
export async function printNormal(text) {
  const data = Buffer.concat([
    NORMAL,
    Buffer.from(text + "\n", "ascii")
  ]);
  return printRaw(data);
}

/**
 * Imprime texto doble ancho + alto
 */
export async function printDouble(text) {
  const data = Buffer.concat([
    DOUBLE,
    Buffer.from(text + "\n", "ascii"),
    NORMAL // volver a normal
  ]);
  return printRaw(data);
}

/**
 * Ejecuta corte automático
 */
export async function cutPaper() {
  return printRaw(CUT);
}

/**
 * Prueba completa
 */
export async function printTest() {
  await printDouble("HOLA MUNDO");
  await printNormal("Texto normal");
  await printNormal("");
  await cutPaper(); // <-- corte automático
}