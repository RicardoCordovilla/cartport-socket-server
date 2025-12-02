import * as fs from 'fs';
import * as path from 'path';

export interface PrinterConfig {
  companyLines: {
    line1: string;
    line2: string;
    address: string;
    location: string;
    phone: string;
  };
  // Future configurations can be added here
  footerText?: string;
  websiteUrl?: string;
}

const defaultConfig: PrinterConfig = {
  companyLines: {
    line1: "SERVICIOS DE GESTION AEROPORTUARIA",
    line2: "AEROGERPSA S.A.",
    address: "Via a Tababela",
    location: "AEROPUERTO INT. MARISCAL SUCRE - QUITO",
    phone: "022818462"
  }
};

const CONFIG_FILE_PATH = path.join(process.cwd(), 'printer-config.json');

let currentConfig: PrinterConfig = { ...defaultConfig };

// Load configuration from file on module initialization
function loadConfigFromFile(): PrinterConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const fileContent = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      const loadedConfig = JSON.parse(fileContent);
      return { ...defaultConfig, ...loadedConfig };
    }
  } catch (error) {
    console.error('Error loading printer config from file:', error);
  }
  return { ...defaultConfig };
}

// Save configuration to file
function saveConfigToFile(config: PrinterConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving printer config to file:', error);
    throw error;
  }
}

// Initialize configuration
currentConfig = loadConfigFromFile();

export function getPrinterConfig(): PrinterConfig {
  return { ...currentConfig };
}

export function updatePrinterConfig(newConfig: Partial<PrinterConfig>): PrinterConfig {
  currentConfig = {
    ...currentConfig,
    ...newConfig,
    companyLines: {
      ...currentConfig.companyLines,
      ...(newConfig.companyLines || {})
    }
  };
  
  saveConfigToFile(currentConfig);
  return { ...currentConfig };
}

export function resetPrinterConfig(): PrinterConfig {
  currentConfig = { ...defaultConfig };
  saveConfigToFile(currentConfig);
  return { ...currentConfig };
}

export function deleteConfigFile(): boolean {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      fs.unlinkSync(CONFIG_FILE_PATH);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting printer config file:', error);
    throw error;
  }
}

export function isConfigComplete(): boolean {
  return !!(
    currentConfig.companyLines.line1 &&
    currentConfig.companyLines.line2 &&
    currentConfig.companyLines.address &&
    currentConfig.companyLines.location &&
    currentConfig.companyLines.phone
  );
}