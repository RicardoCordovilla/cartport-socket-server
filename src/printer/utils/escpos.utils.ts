// Comandos ESC/POS comunes
export const ESC = 0x1b;
export const GS = 0x1d;

// Comandos de inicialización y formato
export const COMMANDS = {
  INIT: Buffer.from([ESC, 0x40]),
  NORMAL: Buffer.from([ESC, 0x21, 0x00]),
  DOUBLE: Buffer.from([ESC, 0x21, 0x30]),
  CENTER: Buffer.from([ESC, 0x61, 0x01]),
  LEFT: Buffer.from([ESC, 0x61, 0x00]),
  CUT: Buffer.from([GS, 0x56, 0x00]),
};

// Utilidades para crear contenido
export function createLine(text: string, encoding: BufferEncoding = 'ascii'): Buffer {
  return Buffer.from(text + '\n', encoding);
}

export function createSeparator(length: number = 32, char: string = '-'): Buffer {
  return Buffer.from(char.repeat(length) + '\n', 'ascii');
}

export function createPaddedLine(label: string, value: string, totalWidth: number = 32): Buffer {
  const padding = totalWidth - label.length - value.length;
  const paddedText = label + ' '.repeat(Math.max(1, padding)) + value + '\n';
  return Buffer.from(paddedText, 'ascii');
}