import { SerialPrinter } from "./serialPrinter";

// ESC/POS commands específicos para Bixolon BK3 según manual
const ESC = 0x1B; // Escape

// Comando principal para estado de la impresora (más confiable que DLE EOT)
const ESC_V_COMMAND = Buffer.from([ESC, 0x76]); // ESC v - Transmit paper sensor status

export interface PrinterStatus {
  paperOut: boolean;
  paperNearEnd: boolean;
  error: boolean;
  generalError: boolean;
  coverOpen?: boolean;
  cutterError?: boolean;
  drawerOpen?: boolean;
  timestamp: Date;
  rawResponse?: number;
  connectionError?: boolean;
  commandUsed?: string;
}

/**
 * Interpreta el byte de estado según especificaciones ESC v de Bixolon BK3
 */
function interpretBixolonStatus(statusByte: number): PrinterStatus {
  return {
    paperOut: (statusByte & 0x01) !== 0,       // bit 0 = sin papel
    paperNearEnd: (statusByte & 0x02) !== 0,   // bit 1 = poco papel
    error: (statusByte & 0x08) !== 0,          // bit 3 = error papel
    generalError: (statusByte & 0x40) !== 0,   // bit 6 = error general
    coverOpen: (statusByte & 0x04) !== 0,      // bit 2 = tapa abierta
    cutterError: (statusByte & 0x10) !== 0,    // bit 4 = error cortador
    timestamp: new Date(),
    rawResponse: statusByte,
    commandUsed: 'ESC_v',
    connectionError: false,
  };
}

/**
 * Envía comando ESC v y espera respuesta de la impresora
 */
async function sendEscVCommand(printer: SerialPrinter, timeoutMs: number = 3000): Promise<number | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      printer.port.removeAllListeners('data');
      console.warn(`Timeout for ESC v command`);
      resolve(null);
    }, timeoutMs);

    const onData = (data: Buffer) => {
      clearTimeout(timeout);
      printer.port.removeListener('data', onData);
      
      if (data.length > 0) {
        console.log(`ESC v response:`, data[0].toString(16));
        resolve(data[0]);
      } else {
        resolve(null);
      }
    };

    printer.port.on('data', onData);
    
    printer.write(ESC_V_COMMAND).catch((error) => {
      clearTimeout(timeout);
      printer.port.removeListener('data', onData);
      console.warn(`Error sending ESC v:`, error.message);
      resolve(null);
    });
  });
}

/**
 * Verifica el estado usando comando ESC v de Bixolon BK3
 */
export async function checkPrinterStatus(devicePath: string, baudRate: number = 115200): Promise<PrinterStatus> {
  const printer = new SerialPrinter({
    path: devicePath,
    baudRate: baudRate,
  });

  try {
    await printer.open();
    
    console.log('Sending ESC v command to Bixolon BK3...');
    const statusByte = await sendEscVCommand(printer, 2000);
    
    if (statusByte !== null) {
      const status = interpretBixolonStatus(statusByte);
      console.log(`✅ ESC v successful:`, status);
      return status;
    }

    // Si el comando ESC v no responde, asumir que está OK
    console.warn('ESC v command did not respond, assuming printer is OK');
    return {
      paperOut: false,
      paperNearEnd: false,
      error: false,
      generalError: false,
      timestamp: new Date(),
      rawResponse: 0x00,
      commandUsed: 'ESC_v_NO_RESPONSE',
      connectionError: false,
    };

  } catch (error) {
    console.error("Error connecting to Bixolon printer:", error);
    
    return {
      paperOut: false,
      paperNearEnd: false,
      error: false,
      generalError: false,
      connectionError: true,
      timestamp: new Date(),
      rawResponse: undefined,
      commandUsed: 'CONNECTION_ERROR',
    };
  } finally {
    try {
      await printer.close();
    } catch (closeError) {
      console.error("Error closing printer connection:", closeError);
    }
  }
}

/**
 * Método alternativo: prueba de conectividad básica
 */
export async function checkPrinterByTest(devicePath: string, baudRate: number = 115200): Promise<PrinterStatus> {
  const printer = new SerialPrinter({
    path: devicePath,
    baudRate: baudRate,
  });

  try {
    await printer.open();
    
    // Comando de inicialización ESC @ (siempre soportado)
    const initCommand = Buffer.from([ESC, 0x40]); // ESC @
    await printer.write(initCommand);
    
    // Pequeña pausa para que procese
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      paperOut: false,
      paperNearEnd: false,
      error: false,
      generalError: false,
      connectionError: false,
      timestamp: new Date(),
      rawResponse: 0x00,
      commandUsed: 'ESC_@',
    };

  } catch (error) {
    console.error("Error in connectivity test:", error);
    
    const errorMsg = error instanceof Error ? error.message.toLowerCase() : '';
    const isConnectionError = errorMsg.includes('no such file') || 
                             errorMsg.includes('permission denied') ||
                             errorMsg.includes('enoent');
    
    return {
      paperOut: false,
      paperNearEnd: false,
      error: !isConnectionError,
      generalError: !isConnectionError,
      connectionError: isConnectionError,
      timestamp: new Date(),
      rawResponse: undefined,
      commandUsed: 'CONNECTIVITY_TEST',
    };
  } finally {
    try {
      await printer.close();
    } catch (closeError) {
      console.error("Error closing printer connection:", closeError);
    }
  }
}

/**
 * Estado completo usando comando ESC v específico de Bixolon
 */
export async function checkComprehensivePrinterStatus(devicePath: string, baudRate: number = 115200): Promise<{
  bixolonStatus: PrinterStatus;
  connectivityTest: PrinterStatus;
  recommendation: string;
}> {
  console.log('=== BIXOLON BK3 STATUS CHECK (ESC v) ===');
  
  const [bixolonStatus, connectivityTest] = await Promise.all([
    checkPrinterStatus(devicePath, baudRate),
    checkPrinterByTest(devicePath, baudRate)
  ]);

  let recommendation = "";
  
  if (bixolonStatus.connectionError && connectivityTest.connectionError) {
    recommendation = "❌ No se puede conectar con la impresora Bixolon. Verificar puerto serie y conexión.";
  } else if (bixolonStatus.connectionError || connectivityTest.connectionError) {
    recommendation = "⚠️ Conexión parcial detectada. La impresora responde pero el comando ESC v no funciona completamente.";
  } else if (bixolonStatus.paperOut) {
    recommendation = "🟡 SIN PAPEL - Reemplazar rollo de papel.";
  } else if (bixolonStatus.paperNearEnd) {
    recommendation = "🟠 POCO PAPEL - El papel se está agotando, considere reemplazarlo pronto.";
  } else if (bixolonStatus.coverOpen) {
    recommendation = "🟡 TAPA ABIERTA - Cerrar la tapa de la impresora.";
  } else if (bixolonStatus.cutterError) {
    recommendation = "🔴 ERROR DEL CORTADOR - Revisar mecanismo de corte.";
  } else if (bixolonStatus.error || bixolonStatus.generalError) {
    recommendation = "🔴 ERROR GENERAL - Revisar estado físico de la impresora.";
  } else {
    recommendation = "✅ Impresora Bixolon BK3 funcionando correctamente.";
  }

  console.log('=== STATUS SUMMARY (ESC v) ===');
  console.log('Command used:', bixolonStatus.commandUsed);
  console.log('Recommendation:', recommendation);
  console.log('============================');

  return {
    bixolonStatus,
    connectivityTest,
    recommendation
  };
}