import * as dotenv from "dotenv";
dotenv.config();

export const PINPAD_CONFIG = {
  host: process.env.PINPAD_HOST || "192.168.100.198", // IP del PinPad
  port: parseInt(process.env.PINPAD_PORT || "9999"),
  timeout: 60000, // 60 segundos
  // Datos del comercio (desde Datafast)
  merchantData: {
    mid: process.env.MID || "",
    tid: process.env.TID || "",
    claveTecnica: process.env.CLAVE_TECNICA || "",
  },
  // Configuración de red del PinPad
  network: {
    ip: "192.168.100.198",
    mask: "255.255.255.0",
    gateway: "192.168.100.1",
  },
  securityData: process.env.SECURITY_LL || "",
};
