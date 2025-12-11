import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";

const execAsync = promisify(exec);

export async function listPrinters(): Promise<string[]> {
  try {
    if (process.platform === "darwin") {
      // En macOS usar lpstat
      const { stdout } = await execAsync("lpstat -p | grep printer");
      const lines = stdout.split("\n").filter((line) => line.trim());
      return lines
        .map((line) => {
          const match = line.match(/printer (\S+)/);
          return match ? match[1] : "";
        })
        .filter((name) => name);
    } else {
      // En Windows usar PowerShell en lugar de wmic (que está deprecado)
      try {
        const { stdout } = await execAsync(
          'powershell "Get-Printer | Select-Object -ExpandProperty Name"',
          {
            encoding: "utf8",
            timeout: 10000,
          }
        );

        const printers = stdout
          .split("\n")
          .map((line) => line.trim())
          .filter((name) => name && name !== "");

        console.log("🖨️ Impresoras encontradas con PowerShell:", printers);
        return printers;
      } catch (error) {
        console.error("❌ Error con Get-Printer, intentando con WMI...");

        try {
          // Fallback usando WMI con PowerShell
          const { stdout } = await execAsync(
            'powershell "Get-WmiObject -Class Win32_Printer | Select-Object -ExpandProperty Name"',
            {
              encoding: "utf8",
              timeout: 10000,
            }
          );

          const printers = stdout
            .split("\n")
            .map((line) => line.trim())
            .filter((name) => name && name !== "");

          console.log("🖨️ Impresoras encontradas con WMI:", printers);
          return printers;
        } catch (wmiError) {
          console.error("❌ Error con WMI, intentando con wmic...");

          try {
            // Último recurso: intentar wmic (para compatibilidad con versiones antiguas)
            const { stdout } = await execAsync(
              "wmic printer get name /format:csv"
            );
            const lines = stdout
              .split("\n")
              .filter((line) => line.trim() && !line.includes("Node,Name"));
            const printers = lines
              .map((line) => {
                const parts = line.split(",");
                return parts[parts.length - 1]?.trim();
              })
              .filter((name) => name && name !== "");

            console.log("🖨️ Impresoras encontradas con wmic:", printers);
            return printers;
          } catch (wmicError) {
            console.error(
              "❌ Todos los métodos fallaron para listar impresoras"
            );
            return [];
          }
        }
      }
    }
  } catch (error) {
    console.error("Error listando impresoras:", error);
    return [];
  }
}

export function findTargetPrinter(printers: string[]): string {
  if (printers.length === 0) {
    throw new Error("No se encontraron impresoras disponibles");
  }

  console.log("Impresoras disponibles:", printers);

  // Buscar impresora BIXOLON o usar la primera disponible
  let targetPrinter = printers.find(
    (p) =>
      p.toLowerCase().includes("bixolon") || p.toLowerCase().includes("bk3")
  );

  if (!targetPrinter) {
    console.log(
      "⚠️ No se encontró impresora BIXOLON, usando la primera disponible"
    );
    targetPrinter = printers[0];
  }

  console.log(`✅ Usando impresora: ${targetPrinter}`);
  return targetPrinter;
}

export async function printRawData(printerName: string, data: Buffer): Promise<void> {
  // Verificar si estamos en macOS y usar CUPS en su lugar
  if (process.platform === "darwin") {
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

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
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
    fs.writeFileSync(scriptPath, psScript, "utf8");

    const { stdout, stderr } = await execAsync(
      `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
      {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      }
    );

    if (stdout.includes("SUCCESS")) {
      console.log("✅ Impresión exitosa");
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
    const { stdout, stderr } = await execAsync(
      `lp -d "${printerName}" -o raw "${dataPath}"`,
      {
        encoding: "utf8",
        timeout: 30000,
      }
    );

    console.log("✅ Impresión enviada a CUPS");
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