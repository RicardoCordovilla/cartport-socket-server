// src/printer/portDetector.ts
import { SerialPort } from "serialport";

export interface PortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  vendorId?: string;
  productId?: string;
}

/**
 * Detecta todos los puertos serie disponibles en el sistema
 */
export async function getAvailablePorts(): Promise<PortInfo[]> {
  try {
    const ports = await SerialPort.list();
    return ports;
  } catch (error) {
    console.error('Error listing serial ports:', error);
    return [];
  }
}

/**
 * Encuentra el primer puerto serie disponible
 * Prioriza puertos USB sobre otros tipos
 */
export async function findFirstAvailablePort(): Promise<string | null> {
  try {
    const ports = await getAvailablePorts();
    
    if (ports.length === 0) {
      return null;
    }

    // Priorizar puertos USB (típicamente impresoras)
    const usbPorts = ports.filter(port => 
      port.manufacturer?.toLowerCase().includes('usb') ||
      port.pnpId?.toLowerCase().includes('usb') ||
      port.path.toLowerCase().includes('usb')
    );

    if (usbPorts.length > 0) {
      return usbPorts[0].path;
    }

    // Si no hay puertos USB, usar el primero disponible
    return ports[0].path;
  } catch (error) {
    console.error('Error finding available port:', error);
    return null;
  }
}

/**
 * Verifica si un puerto específico está disponible
 */
export async function isPortAvailable(portPath: string): Promise<boolean> {
  try {
    const ports = await getAvailablePorts();
    return ports.some(port => port.path === portPath);
  } catch (error) {
    console.error('Error checking port availability:', error);
    return false;
  }
}

/**
 * Obtiene el puerto por defecto basado en el sistema operativo
 */
export function getDefaultPortForOS(): string {
  const platform = process.platform;
  
  switch (platform) {
    case 'win32':
      return 'COM4'; // Puerto más común en Windows
    case 'darwin':
      return '/dev/tty.usbserial-110';
    case 'linux':
      return '/dev/ttyUSB0';
    default:
      return 'COM1';
  }
}

/**
 * Obtiene el puerto recomendado para usar
 * Intenta detectar automáticamente, si no encuentra, usa el por defecto del OS
 */
export async function getRecommendedPort(): Promise<string> {
  const detectedPort = await findFirstAvailablePort();
  
  if (detectedPort) {
    console.log(`🔌 Puerto serie detectado automáticamente: ${detectedPort}`);
    return detectedPort;
  }

  const defaultPort = getDefaultPortForOS();
  console.log(`⚠️  No se detectaron puertos automáticamente, usando puerto por defecto: ${defaultPort}`);
  return defaultPort;
}