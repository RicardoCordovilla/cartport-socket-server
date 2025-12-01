import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);

// Comandos ESC/POS
const ESC = 0x1B;
const GS = 0x1D;

interface AirportTicketData {
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

interface FillTicketData {
  stationId: number;
  ticketNumber: string;
  date: string;
  amount: number;
}

interface CoinEmptyTicketData {
  stationId: number;
  date: string;
  ticketNumber: string;
  amount: number;
}

interface BillEmptyTicketData {
  stationId: number;
  date: string;
  ticketNumber: string;
  bills1: number;
  bills5: number;
  bills10: number;
  totalAmount: number;
}

interface RecaudacionTicketData {
  stationId: number;
  date: string;
  ticketNumber: string;
  ticketNumberAnterior: string;
  numeroUsos: number;
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

async function printRawData(printerName: string, data: Buffer): Promise<void> {
  // Verificar si estamos en macOS y usar CUPS en su lugar
  if (process.platform === 'darwin') {
    return await printWithCUPS(printerName, data);
  }

  // Código original para Windows
  const tmpDir = os.tmpdir();
  const scriptPath = `${tmpDir}\\print_raw_${Date.now()}.ps1`;

  const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] pBytes) {
        Int32 dwError = 0, dwWritten = 0;
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;

        di.pDocName = "RAW Document";
        di.pDataType = "RAW";

        if (OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(pBytes.Length);
                    Marshal.Copy(pBytes, 0, pUnmanagedBytes, pBytes.Length);
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, pBytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }

        if (!bSuccess) {
            dwError = Marshal.GetLastWin32Error();
        }

        return bSuccess;
    }
}
"@

$printerName = "${printerName}"
$bytes = @(${Array.from(data).join(',')})

$result = [RawPrinterHelper]::SendBytesToPrinter($printerName, $bytes)

if ($result) {
    Write-Output "SUCCESS"
} else {
    Write-Error "Failed to print"
    exit 1
}
`;

  try {
    fs.writeFileSync(scriptPath, psScript, 'utf8');

    const { stdout, stderr } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000
    });

    if (stdout.includes('SUCCESS')) {
      console.log('✅ Impresión exitosa');
      return;
    }

    if (stderr) {
      throw new Error(stderr);
    }
  } catch (error: any) {
    throw new Error(`Error al imprimir: ${error.message}`);
  } finally {
    try {
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    } catch (e) {
      // Ignorar errores de limpieza
    }
  }
}

async function printWithCUPS(printerName: string, data: Buffer): Promise<void> {
  const tmpDir = os.tmpdir();
  const dataPath = `${tmpDir}/print_data_${Date.now()}.bin`;

  try {
    // Escribir datos binarios a archivo temporal
    fs.writeFileSync(dataPath, data);

    // Usar lp para imprimir datos RAW
    const { stdout, stderr } = await execAsync(`lp -d "${printerName}" -o raw "${dataPath}"`, {
      encoding: 'utf8',
      timeout: 30000
    });

    console.log('✅ Impresión enviada a CUPS');

  } catch (error: any) {
    throw new Error(`Error al imprimir con CUPS: ${error.message}`);
  } finally {
    try {
      if (fs.existsSync(dataPath)) {
        fs.unlinkSync(dataPath);
      }
    } catch (e) {
      // Ignorar errores de limpieza
    }
  }
}

async function listPrinters(): Promise<string[]> {
  try {
    if (process.platform === 'darwin') {
      // En macOS usar lpstat
      const { stdout } = await execAsync('lpstat -p | grep printer');
      const lines = stdout.split('\n').filter(line => line.trim());
      return lines.map(line => {
        const match = line.match(/printer (\S+)/);
        return match ? match[1] : '';
      }).filter(name => name);
    } else {
      // En Windows usar PowerShell en lugar de wmic (que está deprecado)
      try {
        const { stdout } = await execAsync('powershell "Get-Printer | Select-Object -ExpandProperty Name"', {
          encoding: 'utf8',
          timeout: 10000
        });

        const printers = stdout
            .split('\n')
            .map(line => line.trim())
            .filter(name => name && name !== '');

        console.log('🖨️ Impresoras encontradas con PowerShell:', printers);
        return printers;
      } catch (error) {
        console.error('❌ Error con Get-Printer, intentando con WMI...');

        try {
          // Fallback usando WMI con PowerShell
          const { stdout } = await execAsync('powershell "Get-WmiObject -Class Win32_Printer | Select-Object -ExpandProperty Name"', {
            encoding: 'utf8',
            timeout: 10000
          });

          const printers = stdout
              .split('\n')
              .map(line => line.trim())
              .filter(name => name && name !== '');

          console.log('🖨️ Impresoras encontradas con WMI:', printers);
          return printers;
        } catch (wmiError) {
          console.error('❌ Error con WMI, intentando con wmic...');

          try {
            // Último recurso: intentar wmic (para compatibilidad con versiones antiguas)
            const { stdout } = await execAsync('wmic printer get name /format:csv');
            const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Node,Name'));
            const printers = lines
                .map(line => {
                  const parts = line.split(',');
                  return parts[parts.length - 1]?.trim();
                })
                .filter(name => name && name !== '');

            console.log('🖨️ Impresoras encontradas con wmic:', printers);
            return printers;
          } catch (wmicError) {
            console.error('❌ Todos los métodos fallaron para listar impresoras');
            return [];
          }
        }
      }
    }
  } catch (error) {
    console.error('Error listando impresoras:', error);
    return [];
  }
}

export async function printAirportTicket( data: AirportTicketData): Promise<void> {
  console.log('=== Iniciando impresión de ticket ===');

  const printers = await listPrinters();

  if (printers.length === 0) {
    throw new Error('No se encontraron impresoras disponibles');
  }

  console.log('Impresoras disponibles:', printers);

  // Buscar impresora BIXOLON o usar la primera disponible
  let targetPrinter = printers.find(p =>
      p.toLowerCase().includes('bixolon') ||
      p.toLowerCase().includes('bk3')
  );

  if (!targetPrinter) {
    console.log('⚠️ No se encontró impresora BIXOLON, usando la primera disponible');
    targetPrinter = printers[0];
  }

  console.log(`✅ Usando impresora: ${targetPrinter}`);

  // Comandos ESC/POS
  const INIT = Buffer.from([ESC, 0x40]);
  const NORMAL = Buffer.from([ESC, 0x21, 0x00]);
  const DOUBLE = Buffer.from([ESC, 0x21, 0x30]);
  const CENTER = Buffer.from([ESC, 0x61, 0x01]);
  const LEFT = Buffer.from([ESC, 0x61, 0x00]);
  const CUT = Buffer.from([GS, 0x56, 0x00]);

  // Crear contenido del ticket
  const ticketContent = Buffer.concat([
    INIT,
    CENTER,
    Buffer.from(`SERVICIOS DE GESTION\n`, 'ascii'),
    Buffer.from(`AEROPORTUARIA S.A.\n`, 'ascii'),
    NORMAL,
    Buffer.from(`Vía a Tababela\n`, 'ascii'),
    Buffer.from(`AEROPUERTO INT. MARISCAL SUCRE - QUITO\n`, 'ascii'),
    Buffer.from(`Telefono de atención: ${data.phoneNumber}\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    CENTER,
    Buffer.from('COMPROBANTE DE PAGO\n\n', 'ascii'),

    LEFT,
    Buffer.from(`Monolito numero: ${data.stationNumber}\n`, 'ascii'),
    Buffer.from(`Fecha: ${data.date}         ${data.time}\n`, 'ascii'),
    Buffer.from(`Num de tiquet: ${data.ticketNumber}\n\n`, 'ascii'),

    Buffer.from(`Por utilizacion ${data.serviceType}\n`, 'ascii'),
    Buffer.from(`TOTAL GRABADO           ${data.subtotal.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`IVA   ${data.taxRate}%                ${data.tax.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`TOTAL                   ${data.total.toFixed(2)} $\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),

    Buffer.from(`Pagado:                 ${data.paid.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`Cambio:                 ${data.change.toFixed(2)} $\n`, 'ascii'),

    ...(data.changeError !== undefined ? [
      Buffer.from(`Error de cambio:        ${data.changeError.toFixed(2)} $\n`, 'ascii')
    ] : []),

    Buffer.from('--------------------------------\n', 'ascii'),

    CENTER,
    Buffer.from('DOCUMENTO SIN VALOR TRIBUTARIO\n\n', 'ascii'),

    ...(data.website ? [
      Buffer.from('SI DESEA FACTURA INGRESAR A ESTE LINK:\n', 'ascii'),
      Buffer.from(`     ${data.website}\n\n`, 'ascii')
    ] : []),

    CENTER,DOUBLE,
    Buffer.from(`TOTAL: ${data.total.toFixed(2)} $\n`, 'ascii'),
    CENTER,NORMAL,
    Buffer.from('(IVA Incluido)\n\n\n\n\n', 'ascii'),
    CUT
  ]);

  await printRawData(targetPrinter, ticketContent);
}

export async function printFillTicket(data: FillTicketData): Promise<void> {
  console.log('=== Iniciando impresión de ticket de llenado ===');

  const printers = await listPrinters();

  if (printers.length === 0) {
    throw new Error('No se encontraron impresoras disponibles');
  }

  console.log('Impresoras disponibles:', printers);

  // Buscar impresora BIXOLON o usar la primera disponible
  let targetPrinter = printers.find(p =>
      p.toLowerCase().includes('bixolon') ||
      p.toLowerCase().includes('bk3')
  );

  if (!targetPrinter) {
    console.log('⚠️ No se encontró impresora BIXOLON, usando la primera disponible');
    targetPrinter = printers[0];
  }

  console.log(`✅ Usando impresora: ${targetPrinter}`);

  // Comandos ESC/POS
  const INIT = Buffer.from([ESC, 0x40]);
  const NORMAL = Buffer.from([ESC, 0x21, 0x00]);
  const CENTER = Buffer.from([ESC, 0x61, 0x01]);
  const LEFT = Buffer.from([ESC, 0x61, 0x00]);
  const CUT = Buffer.from([GS, 0x56, 0x00]);

  // Obtener hora actual
  const currentTime = new Date().toLocaleTimeString('es-EC', { hour12: false });

  // Crear contenido del ticket de llenado
  const ticketContent = Buffer.concat([
    INIT,
    CENTER,
    Buffer.from(`SERVICIOS DE GESTION AEROPORTUARIA\n`, 'ascii'),
    Buffer.from(`AEROGERPSA S.A.\n`, 'ascii'),
    NORMAL,
    Buffer.from(`Vía a Tababela\n`, 'ascii'),
    Buffer.from(`AEROPUERTO INT. MARISCAL SUCRE - QUITO\n`, 'ascii'),
    Buffer.from(`TELEFONO DE ATENCION: 022818462\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    CENTER,
    Buffer.from('OPERACIÓN LLENADO MONEDAS\n\n', 'ascii'),

    LEFT,
    Buffer.from(`Numero de maquina        :  ${data.stationId.toString().padStart(10)}\n`, 'ascii'),
    Buffer.from(`Fecha : ${data.date}            ${currentTime}\n`, 'ascii'),
    Buffer.from('\n', 'ascii'),
    Buffer.from(`Numero de tiquet    : ${data.ticketNumber}\n`, 'ascii'),
    Buffer.from('\n', 'ascii'),
    Buffer.from(`LLENADO DEL HOPPER     : ${data.amount.toFixed(2).padStart(8)} $\n`, 'ascii'),

    Buffer.from('\n\n\n\n\n', 'ascii'),
    CUT
  ]);

  await printRawData(targetPrinter, ticketContent);
}

export async function printCoinEmptyTicket(data: CoinEmptyTicketData): Promise<void> {
  console.log('=== Iniciando impresión de ticket de vaciado de monedas ===');

  const printers = await listPrinters();

  if (printers.length === 0) {
    throw new Error('No se encontraron impresoras disponibles');
  }

  console.log('Impresoras disponibles:', printers);

  // Buscar impresora BIXOLON o usar la primera disponible
  let targetPrinter = printers.find(p =>
      p.toLowerCase().includes('bixolon') ||
      p.toLowerCase().includes('bk3')
  );

  if (!targetPrinter) {
    console.log('⚠️ No se encontró impresora BIXOLON, usando la primera disponible');
    targetPrinter = printers[0];
  }

  console.log(`✅ Usando impresora: ${targetPrinter}`);

  // Comandos ESC/POS
  const INIT = Buffer.from([ESC, 0x40]);
  const NORMAL = Buffer.from([ESC, 0x21, 0x00]);
  const CENTER = Buffer.from([ESC, 0x61, 0x01]);
  const LEFT = Buffer.from([ESC, 0x61, 0x00]);
  const CUT = Buffer.from([GS, 0x56, 0x00]);

  // Obtener hora actual
  const currentTime = new Date().toLocaleTimeString('es-EC', { hour12: false });

  // Crear contenido del ticket de vaciado
  const ticketContent = Buffer.concat([
    INIT,
    CENTER,
    Buffer.from(`SERVICIOS DE GESTION AEROPORTUARIA\n`, 'ascii'),
    Buffer.from(`AEROGERPSA S.A.\n`, 'ascii'),
    NORMAL,
    Buffer.from(`Via a Tababela\n`, 'ascii'),
    Buffer.from(`AEROPUERTO INT. MARISCAL SUCRE - QUITO\n`, 'ascii'),
    Buffer.from(`TELEFONO DE ATENCION: 022818462\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    CENTER,
    Buffer.from('OPERACION VACIADO MONEDAS\n\n', 'ascii'),

    LEFT,
    Buffer.from(`Numero de maquina        : ${data.stationId.toString().padStart(10)}\n`, 'ascii'),
    Buffer.from(`Fecha : ${data.date}            ${currentTime}\n`, 'ascii'),
    Buffer.from('\n', 'ascii'),
    Buffer.from(`Numero de tiquet    : ${data.ticketNumber}\n`, 'ascii'),
    Buffer.from('\n', 'ascii'),
    Buffer.from(`MONTANTE EN HOPPER     : ${data.amount.toFixed(2).padStart(8)} $\n`, 'ascii'),

    Buffer.from('\n\n\n\n\n', 'ascii'),
    CUT
  ]);

  await printRawData(targetPrinter, ticketContent);
}

export async function printBillEmptyTicket(data: BillEmptyTicketData): Promise<void> {
  console.log('=== Iniciando impresión de ticket de vaciado de billetes ===');

  const printers = await listPrinters();

  if (printers.length === 0) {
    throw new Error('No se encontraron impresoras disponibles');
  }

  console.log('Impresoras disponibles:', printers);

  // Buscar impresora BIXOLON o usar la primera disponible
  let targetPrinter = printers.find(p =>
      p.toLowerCase().includes('bixolon') ||
      p.toLowerCase().includes('bk3')
  );

  if (!targetPrinter) {
    console.log('⚠️ No se encontró impresora BIXOLON, usando la primera disponible');
    targetPrinter = printers[0];
  }

  console.log(`✅ Usando impresora: ${targetPrinter}`);

  // Comandos ESC/POS
  const INIT = Buffer.from([ESC, 0x40]);
  const NORMAL = Buffer.from([ESC, 0x21, 0x00]);
  const CENTER = Buffer.from([ESC, 0x61, 0x01]);
  const LEFT = Buffer.from([ESC, 0x61, 0x00]);
  const CUT = Buffer.from([GS, 0x56, 0x00]);

  // Obtener hora actual
  const currentTime = new Date().toLocaleTimeString('es-EC', { hour12: false });

  // Crear contenido del ticket de vaciado de billetes
  const ticketContent = Buffer.concat([
    INIT,
    CENTER,
    Buffer.from(`SERVICIOS DE GESTION AEROPORTUARIA\n`, 'ascii'),
    Buffer.from(`AEROGERPSA S.A.\n`, 'ascii'),
    NORMAL,
    Buffer.from(`Via a Tababela\n`, 'ascii'),
    Buffer.from(`AEROPUERTO INT. MARISCAL SUCRE - QUITO\n`, 'ascii'),
    Buffer.from(`TELEFONO DE ATENCION: 022818462\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    CENTER,
    Buffer.from('OPERACION VACIADO BILLETES\n\n', 'ascii'),

    LEFT,
    Buffer.from(`Numero de maquina        : ${data.stationId.toString().padStart(10)}\n`, 'ascii'),
    Buffer.from(`Fecha : ${data.date}            ${currentTime}\n`, 'ascii'),
    Buffer.from('\n', 'ascii'),
    Buffer.from(`Numero de tiquet    : ${data.ticketNumber}\n`, 'ascii'),
    Buffer.from('\n', 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    Buffer.from('\n', 'ascii'),
    Buffer.from(`BILLETES  1                     ${data.bills1.toString().padStart(8)}\n`, 'ascii'),
    Buffer.from(`BILLETES  5                     ${data.bills5.toString().padStart(8)}\n`, 'ascii'),
    Buffer.from(`BILLETES 10                     ${data.bills10.toString().padStart(8)}\n`, 'ascii'),
    Buffer.from('\n', 'ascii'),
    Buffer.from(`MONTANTE EN BILLETERO   : ${data.totalAmount.toFixed(2).padStart(8)} $\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),

    Buffer.from('\n\n\n\n\n', 'ascii'),
    CUT
  ]);

  await printRawData(targetPrinter, ticketContent);
}

export async function printRecaudacionTicket(data: RecaudacionTicketData): Promise<void> {
  console.log('=== Iniciando impresión de ticket de recaudación ===');

  const printers = await listPrinters();

  if (printers.length === 0) {
    throw new Error('No se encontraron impresoras disponibles');
  }

  console.log('Impresoras disponibles:', printers);

  // Buscar impresora BIXOLON o usar la primera disponible
  let targetPrinter = printers.find(p =>
      p.toLowerCase().includes('bixolon') ||
      p.toLowerCase().includes('bk3')
  );

  if (!targetPrinter) {
    console.log('⚠️ No se encontró impresora BIXOLON, usando la primera disponible');
    targetPrinter = printers[0];
  }

  console.log(`✅ Usando impresora: ${targetPrinter}`);

  // Comandos ESC/POS
  const INIT = Buffer.from([ESC, 0x40]);
  const NORMAL = Buffer.from([ESC, 0x21, 0x00]);
  const CENTER = Buffer.from([ESC, 0x61, 0x01]);
  const LEFT = Buffer.from([ESC, 0x61, 0x00]);
  const CUT = Buffer.from([GS, 0x56, 0x00]);

  // Obtener hora actual
  const currentTime = new Date().toLocaleTimeString('es-EC', { hour12: false });

  // Crear contenido del ticket de recaudación
  const ticketContent = Buffer.concat([
    INIT,
    CENTER,
    Buffer.from(`SERVICIOS DE GESTION AEROPORTUARIA\n`, 'ascii'),
    Buffer.from(`AEROGERPSA S.A.\n`, 'ascii'),
    Buffer.from(`Via a Tababela\n`, 'ascii'),
    NORMAL,
    Buffer.from(`AEROPUERTO INT. MARISCAL SUCRE - QUITO\n`, 'ascii'),
    Buffer.from(`TELEFONO DE ATENCION: 022818462\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    Buffer.from(`MONOLITO NUMERO                 ${data.stationId}\n`, 'ascii'),
    Buffer.from(`Fecha : ${data.date}     ${currentTime}\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    CENTER,
    Buffer.from('VALORES ACUMULADOS DESDE\n', 'ascii'),
    Buffer.from('ANTERIOR RECAUDACION\n', 'ascii'),
    LEFT,
    Buffer.from('\n', 'ascii'),
    Buffer.from(`Num de tiquet ant       :  ${data.ticketNumberAnterior}\n`, 'ascii'),
    Buffer.from(`Numero de usos          :         ${data.numeroUsos}\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    Buffer.from(`ACUMUL LLENADO MONEDA   :   ${data.resumen.llenados.total.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`ACUMUL MONEDA ENTRÓ     :     0.00 $\n`, 'ascii'),
    Buffer.from(`ACUMUL MONEDA DEVUELTA  :   ${data.resumen.totalCoinsGiven.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`ACUMUL VACÍA MONEDAS    :   ${data.resumen.vaciadosMonedas.total.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`ACUMUL VACÍA BILLETES   :   ${data.resumen.vaciadosBilletes.total.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`ACUMUL ERROR DEVOLUCIO  :     0.00 $\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    
    CENTER,
    Buffer.from('RECAUDACION\n', 'ascii'),
    LEFT,
    Buffer.from('--------------------------------\n', 'ascii'),
    Buffer.from(`Numero de tiquet        :  ${data.ticketNumber}\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    Buffer.from(`NUMERO BILLETES 1       :         ${data.resumen.totalOne}\n`, 'ascii'),
    Buffer.from(`NUMERO BILLETES 5       :         ${data.resumen.totalFive}\n`, 'ascii'),
    Buffer.from(`NUMERO BILLETES 10      :         ${data.resumen.totalTen}\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    Buffer.from(`MONTANTE BILLETERO      :    ${data.resumen.vaciadosBilletes.total.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`MONTANTE MONEDERO       :    ${data.resumen.totalCoins.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`ULTIMO LLENADO          :    ${data.resumen.llenados.total.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`MONTANTE MONEDERO       :     1.00 $\n`, 'ascii'),
    Buffer.from(`MONEDAS DEVUELTAS       :    ${data.resumen.totalCoinsGiven.toFixed(2)} $\n`, 'ascii'),
    Buffer.from(`MONTANTE TOTAL          :   ${data.resumen.totalAmountCalculated.toFixed(2)} $\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    Buffer.from(`MONEDAS EN HOPPER       :     0.00 $\n`, 'ascii'),
    Buffer.from(`TOTAL RECAUDADO         :   ${data.resumen.totalAmountCalculated.toFixed(2)} $\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),
    Buffer.from(`ERROR DEVOLUCION        :     1.00 $\n`, 'ascii'),
    Buffer.from('--------------------------------\n', 'ascii'),

    Buffer.from('\n\n\n\n\n', 'ascii'),
    CUT
  ]);

  await printRawData(targetPrinter, ticketContent);
}
