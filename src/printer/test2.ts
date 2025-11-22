import printer from "printer";

const textoGrande = Buffer.concat([
  Buffer.from([0x1b, 0x21, 0x30]), // doble ancho+alto
  Buffer.from("HOLA MUNDO\n", "ascii"),
  Buffer.from([0x1b, 0x21, 0x00]), // volver a normal
  Buffer.from("Texto normal\n\n", "ascii"),
]);

printer.printDirect({
  data: textoGrande,
  printer: "BIXOLON BK3-31", // nombre EXACTO de la impresora
  type: "RAW",
  success: () => console.log("Impresión enviada."),
  error: (err) => console.error(err),
});
