// src/printer/printSampleTicket.ts
import { SerialPrinter } from "./serialPrinter";
import { SerialPort } from "serialport";
import * as os from 'os';

// Función para listar puertos disponibles
async function listAvailablePorts() {
  try {
    const ports = await SerialPort.list();
    const isWindows = os.platform() === 'win32';
    
    console.log("📋 Puertos serie disponibles:");
    console.log(`💻 Sistema operativo detectado: ${isWindows ? 'Windows' : 'macOS/Linux'}`);
    
    if (ports.length === 0) {
      console.log("❌ No se encontraron puertos serie");
      return [];
    }
    
    ports.forEach((port, index) => {
      console.log(`${index + 1}. ${port.path}`);
      if (port.manufacturer) console.log(`   Fabricante: ${port.manufacturer}`);
      if (port.serialNumber) console.log(`   Número serie: ${port.serialNumber}`);
      if (port.productId) console.log(`   Product ID: ${port.productId}`);
      if (port.vendorId) console.log(`   Vendor ID: ${port.vendorId}`);
      console.log("   ---");
    });
    return ports;
  } catch (error) {
    console.error("❌ Error listando puertos:", error);
    return [];
  }
}

// Detectar sistema operativo y puerto por defecto
const isWindows = os.platform() === 'win32';
const DEVICE_PATH = isWindows ? "COM3" : "/dev/tty.usbserial-110"; // Puerto por defecto según OS

async function main() {
  console.log("🔍 Diagnosticando puertos serie...");
  console.log(`💻 Corriendo en: ${isWindows ? 'Windows' : 'macOS/Linux'}`);
  
  // Primero listar todos los puertos disponibles
  const availablePorts = await listAvailablePorts();
  
  if (availablePorts.length === 0) {
    console.log("❌ No se encontraron puertos serie disponibles");
    console.log("💡 En Windows, asegúrate de que:");
    console.log("   - La impresora USB-Serie esté conectada");
    console.log("   - Los drivers estén instalados correctamente");
    console.log("   - El puerto aparezca en Administrador de Dispositivos");
    console.log("   - No esté siendo usado por otra aplicación");
    return;
  }

  // En Windows, buscar puertos COM activos
  let targetPort;
  if (isWindows) {
    // Buscar el primer puerto COM disponible
    targetPort = availablePorts.find(port => port.path.startsWith('COM'));
    if (targetPort) {
      console.log(`🎯 Puerto COM encontrado automáticamente: ${targetPort.path}`);
    }
  } else {
    // En macOS/Linux, buscar el puerto especificado
    targetPort = availablePorts.find(port => port.path === DEVICE_PATH);
  }
  
  if (!targetPort) {
    console.log(`❌ ${isWindows ? 'Ningún puerto COM' : `Puerto ${DEVICE_PATH}`} encontrado`);
    console.log("💡 Puertos disponibles:");
    availablePorts.forEach(port => console.log(`   - ${port.path}`));
    console.log(`\n🔧 ${isWindows ? 'Conecta una impresora USB-Serie para que aparezca como COM1, COM2, etc.' : 'Cambia DEVICE_PATH por uno de los puertos listados arriba'}`);
    return;
  }

  const selectedPort = targetPort.path;
  console.log(`✅ Puerto ${selectedPort} encontrado`);
  if (targetPort.manufacturer) {
    console.log(`📟 Fabricante: ${targetPort.manufacturer}`);
  }
  console.log("🔌 Intentando conectar...");
  
  // Probar diferentes velocidades comunes para impresoras
  const commonBaudRates = [115200, 9600, 19200, 38400, 57600];
  
  for (const baudRate of commonBaudRates) {
    try {
      console.log(`🔄 Probando ${selectedPort} a ${baudRate} baudios...`);
      const printer = new SerialPrinter({
        path: selectedPort,
        baudRate: baudRate,
      });
      
      await printer.open();
      console.log(`✅ ¡Conexión exitosa a ${baudRate} baudios!`);
      
      // Imprimir ticket de prueba
      let buffer = "";
      buffer += "\x1B@"; // ESC @ - Inicializar
      buffer += "=== TICKET DE PRUEBA ===\n";
      buffer += `Puerto: ${selectedPort}\n`;
      buffer += `Baudios: ${baudRate}\n`;
      buffer += `Sistema: ${isWindows ? 'Windows' : 'macOS/Linux'}\n`;
      buffer += `Fecha: ${new Date().toLocaleString()}\n`;
      buffer += "========================\n";
      buffer += "Si ves este mensaje,\n";
      buffer += "la conexión funciona!\n";
      buffer += "\n\n\n";
      
      await printer.write(buffer);
      
      // Intentar comando de corte
      try {
        const cutCommand = Buffer.from([0x1d, 0x56, 0x01]); // GS V 1
        await printer.write(cutCommand);
        console.log("✂️ Comando de corte enviado");
      } catch (cutError) {
        console.log("⚠️ No se pudo enviar comando de corte");
      }
      
      await printer.close();
      
      console.log(`🎉 ¡Éxito! Configuración recomendada:`);
      console.log(`   Puerto: ${selectedPort}`);
      console.log(`   Baudios: ${baudRate}`);
      console.log(`\n📝 Para usar en curl:`);
      console.log(`   "devicePath": "${selectedPort}"`);
      console.log(`   "baudRate": ${baudRate}`);
      
      return;
      
    } catch (testError) {
      const errorMessage = testError instanceof Error ? testError.message : String(testError);
      console.log(`❌ ${baudRate} baudios: ${errorMessage}`);
      continue;
    }
  }
  
  console.log("❌ No se pudo conectar con ninguna velocidad");
  console.log("💡 Verifica:");
  console.log("   1. Que la impresora esté encendida");
  console.log("   2. Que los drivers estén instalados");
  console.log("   3. Que no esté siendo usada por otra aplicación");
  console.log("   4. Los permisos del puerto");
}

main().catch(console.error);
