import * as dotenv from "dotenv";
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
}

// Configuración por defecto (valores iniciales)
let PINPAD_CONFIG: PinpadConfig = {
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
};

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
  console.log("🔧 Configuración del PinPad actualizada:", PINPAD_CONFIG);
  return { ...PINPAD_CONFIG };
};

export const resetPinpadConfig = (): PinpadConfig => {
  PINPAD_CONFIG = {
    host: "192.168.100.24",
    port: 9999,
    timeout: 60000,
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
  };
  console.log("🔄 Configuración del PinPad reiniciada a valores por defecto");
  return { ...PINPAD_CONFIG };
};

// Exportar la configuración actual (mantener compatibilidad)
export { PINPAD_CONFIG };
