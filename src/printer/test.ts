import usb from 'usb';

// Cambia productId si no coincide
const vendorId = 0x1504;
const productId = 0x0006;

// Buscar dispositivo
const device = usb.findByIds(vendorId, productId);
if (!device) {
  console.log("No se encontró la impresora Bixolon.");
  process.exit();
}

device.open();

if (!device.interfaces || device.interfaces.length === 0) {
  console.log("No se encontraron interfaces en el dispositivo.");
  process.exit();
}

const iface = device.interfaces[0];

// Si la interfaz está kernel-drv (Linux), libérala
if (iface.isKernelDriverActive()) {
  try {
    iface.detachKernelDriver();
  } catch (e) {
    console.error('Error al liberar kernel driver:', e);
  }
}

iface.claim();

// Buscar endpoint OUT
const endpoint = iface.endpoints.find(ep => ep.direction === 'out') as usb.OutEndpoint;

if (!endpoint) {
  console.log("No se encontró endpoint de salida.");
  process.exit();
}

// Función para enviar bytes a la impresora
function send(data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!endpoint) {
      return reject(new Error("Endpoint is undefined"));
    }
    endpoint.transfer(data, (err: usb.LibUSBException | undefined) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// --- Comandos ESC/POS ---
const NORMAL = Buffer.from([0x1B, 0x21, 0x00]);
const DOUBLE = Buffer.from([0x1B, 0x21, 0x30]); // doble ancho+alto

export async function printTest() {
  try {
    await send(DOUBLE);
    await send(Buffer.from("HOLA MUNDO\n", "ascii"));

    await send(NORMAL);
    await send(Buffer.from("Texto normal\n\n", "ascii"));

    console.log("Impreso correctamente");
  } catch (err) {
    console.error("Error:", err);
  }
}

printTest();
