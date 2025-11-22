# Configuración de Puerto Serie - Impresora

Este documento explica cómo configurar y solucionar problemas con la impresión por puerto serie.

## Detección Automática de Puertos

El sistema ahora detecta automáticamente los puertos serie disponibles:

### Ejecutar Detección Manual
```bash
# Probar detección de puertos
npx ts-node src/printer/testPorts.ts
```

### Puertos por Sistema Operativo
- **Windows**: `COM1`, `COM2`, `COM3`, `COM4`, etc.
- **macOS**: `/dev/tty.usbserial-XXX`
- **Linux**: `/dev/ttyUSB0`, `/dev/ttyUSB1`, etc.

## Solución de Problemas Comunes

### Error: SetCommState código 31
**Causa**: Puerto incorrecto para el sistema operativo
**Solución**: El sistema ahora detecta automáticamente el puerto correcto

### Error: Port is not open
**Causa**: Intentar cerrar un puerto que no fue abierto exitosamente
**Solución**: ✅ Corregido con manejo mejorado del estado del puerto

### Error: Puerto en uso
**Causa**: Otro programa está usando el puerto
**Solución**: 
1. Cerrar otros programas que usen el puerto serie
2. Desconectar y reconectar el dispositivo USB
3. Usar el puerto detectado automáticamente

## Verificar Puerto en Windows

### Método 1: Administrador de Dispositivos
1. Presiona `Windows + X`
2. Selecciona "Administrador de dispositivos"
3. Expande "Puertos (COM y LPT)"
4. Busca tu impresora serie

### Método 2: Comando MODE
```powershell
mode
```

### Método 3: WMI (PowerShell)
```powershell
Get-WmiObject -Class Win32_SerialPort | Select-Object Name, DeviceID, Description
```

## Configuración de la Impresora

### Configuración por Defecto
```typescript
{
  baudRate: 115200,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  timeout: 5000
}
```

### Configuración Personalizada
```typescript
const printer = new SerialPrinter({
  path: 'COM4',           // Puerto detectado automáticamente
  baudRate: 9600,         // Velocidad alternativa
  dataBits: 7,           // Bits de datos
  parity: 'even',        // Paridad
  stopBits: 2,           // Bits de parada
  timeout: 3000          // Timeout personalizado
});
```

## Funciones Disponibles

### `getAvailablePorts()`
Retorna lista de todos los puertos disponibles

### `findFirstAvailablePort()`
Encuentra el primer puerto disponible (prioriza USB)

### `getRecommendedPort()`
Retorna el puerto recomendado para el sistema actual

### `isPortAvailable(portPath)`
Verifica si un puerto específico está disponible

## Estado del Sistema

- ✅ Detección automática de puertos
- ✅ Manejo robusto de errores
- ✅ Soporte multiplataforma
- ✅ Logging detallado de conexiones
- ✅ Manejo seguro del estado del puerto

## Logs Útiles

El sistema ahora muestra logs detallados:
```
🔌 Intentando conectar al puerto serie: COM4
🔌 Puerto serie detectado automáticamente: COM4
✅ Puerto serie COM4 abierto exitosamente
🖨️ Usando puerto de impresora: COM4
🔌 Puerto serie COM4 cerrado
```