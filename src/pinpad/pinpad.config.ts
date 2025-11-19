import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

// Configuración dinámica del PinPad - Sin variables de entorno
export interface PinpadConfig {
  host: string;
  port: number;
  timeout: number;
  merchantData: {
    mid: string;
    tid: string;
    claveTecnica: string;
  };
  network: {
    ip: string;
    mask: string;
    gateway: string;
  };
  securityData: string;
  logApiUrl: string; // Nueva configuración para la URL del API de logs
}

// Ruta del archivo de configuración
const CONFIG_FILE_PATH = path.join(process.cwd(), 'pinpad-config.json');

// Configuración por defecto (valores iniciales)
const DEFAULT_CONFIG: PinpadConfig = {
  host: "192.168.100.24", // IP del PinPad por defecto
  port: 9999,
  timeout: 60000, // 60 segundos
  merchantData: {
    mid: "",
    tid: "",
    claveTecnica: "",
  },
  network: {
    ip: "192.168.100.198",
    mask: "255.255.255.0",
    gateway: "192.168.100.1",
  },
  securityData: "",
  logApiUrl: "http://localhost:9000/pinpadlogs", // URL por defecto para logs
};

// Cargar configuración desde archivo
function loadConfigFromFile(): PinpadConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const fileContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      const savedConfig = JSON.parse(fileContent);
      
      // Migrar datos del nivel raíz a merchantData si existen
      const migratedConfig = { ...DEFAULT_CONFIG, ...savedConfig };
      
      // Si hay datos en el nivel raíz, moverlos a merchantData
      if (savedConfig.mid || savedConfig.tid || savedConfig.claveTecnica) {
        migratedConfig.merchantData = {
          mid: savedConfig.mid || savedConfig.merchantData?.mid || "",
          tid: savedConfig.tid || savedConfig.merchantData?.tid || "",
          claveTecnica: savedConfig.claveTecnica || savedConfig.merchantData?.claveTecnica || "",
        };
        
        // Limpiar datos del nivel raíz
        delete migratedConfig.mid;
        delete migratedConfig.tid;
        delete migratedConfig.claveTecnica;
        
        // Guardar la configuración migrada inmediatamente
        saveConfigToFile(migratedConfig);
        console.log("🔄 Configuración migrada y limpiada correctamente");
      }
      
      console.log("🔄 Configuración cargada desde archivo:", CONFIG_FILE_PATH);
      return migratedConfig;
    }
  } catch (error) {
    console.error("❌ Error al cargar configuración desde archivo:", error);
  }
  
  console.log("📝 Usando configuración por defecto (archivo no encontrado)");
  return { ...DEFAULT_CONFIG };
}

// Guardar configuración en archivo
function saveConfigToFile(config: PinpadConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log("💾 Configuración guardada en:", CONFIG_FILE_PATH);
  } catch (error) {
    console.error("❌ Error al guardar configuración:", error);
  }
}

// Cargar configuración al inicializar
let PINPAD_CONFIG: PinpadConfig = loadConfigFromFile();

// Funciones para gestionar la configuración dinámicamente
export const getPinpadConfig = (): PinpadConfig => {
  return { ...PINPAD_CONFIG };
};

export const updatePinpadConfig = (newConfig: Partial<PinpadConfig>): PinpadConfig => {
  PINPAD_CONFIG = {
    ...PINPAD_CONFIG,
    ...newConfig,
    merchantData: {
      ...PINPAD_CONFIG.merchantData,
      ...(newConfig.merchantData || {}),
    },
    network: {
      ...PINPAD_CONFIG.network,
      ...(newConfig.network || {}),
    },
  };
  
  // Guardar en archivo inmediatamente
  saveConfigToFile(PINPAD_CONFIG);
  
  console.log("🔧 Configuración del PinPad actualizada y guardada:", PINPAD_CONFIG);
  return { ...PINPAD_CONFIG };
};

export const resetPinpadConfig = (): PinpadConfig => {
  PINPAD_CONFIG = { ...DEFAULT_CONFIG };
  
  // Guardar configuración reseteada
  saveConfigToFile(PINPAD_CONFIG);
  
  console.log("🔄 Configuración del PinPad reiniciada a valores por defecto y guardada");
  return { ...PINPAD_CONFIG };
};

// Función para eliminar archivo de configuración
export const deleteConfigFile = (): boolean => {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      fs.unlinkSync(CONFIG_FILE_PATH);
      console.log("🗑️ Archivo de configuración eliminado:", CONFIG_FILE_PATH);
      return true;
    }
    return false;
  } catch (error) {
    console.error("❌ Error al eliminar archivo de configuración:", error);
    return false;
  }
};

// Función para verificar si la configuración está completa
export const isConfigComplete = (): boolean => {
  const config = getPinpadConfig();
  return !!(config.merchantData.mid && config.merchantData.tid && config.securityData);
};

// Exportar la configuración actual (mantener compatibilidad)
export { PINPAD_CONFIG };
