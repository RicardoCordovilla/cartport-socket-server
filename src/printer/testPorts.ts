// src/printer/testPorts.ts
import { getAvailablePorts, getRecommendedPort, isPortAvailable } from './portDetector';

async function testPortDetection() {
  console.log('🔍 Detectando puertos serie disponibles...\n');
  
  try {
    // Listar todos los puertos
    const ports = await getAvailablePorts();
    
    if (ports.length === 0) {
      console.log('❌ No se encontraron puertos serie disponibles');
      return;
    }
    
    console.log(`✅ Se encontraron ${ports.length} puertos serie:`);
    ports.forEach((port, index) => {
      console.log(`   ${index + 1}. ${port.path}`);
      if (port.manufacturer) console.log(`      Fabricante: ${port.manufacturer}`);
      if (port.serialNumber) console.log(`      Número serie: ${port.serialNumber}`);
      if (port.pnpId) console.log(`      PnP ID: ${port.pnpId}`);
      console.log();
    });
    
    // Puerto recomendado
    const recommendedPort = await getRecommendedPort();
    console.log(`🎯 Puerto recomendado: ${recommendedPort}`);
    
    // Verificar disponibilidad del puerto recomendado
    const isAvailable = await isPortAvailable(recommendedPort);
    console.log(`📍 Puerto ${recommendedPort} disponible: ${isAvailable ? '✅ Sí' : '❌ No'}`);
    
  } catch (error) {
    console.error('❌ Error detectando puertos:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testPortDetection();
}

export { testPortDetection };