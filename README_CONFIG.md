# Configuración Dinámica del PinPad

Este servidor ahora utiliza un sistema de configuración dinámica para el PinPad que **NO requiere variables de entorno (.env)**. Los valores se configuran mediante peticiones HTTP.

## Endpoints de Configuración

### 1. Obtener Configuración Actual
```http
GET /pinpad/config
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Configuración actual del PinPad",
  "data": {
    "host": "192.168.100.24",
    "port": 9999,
    "timeout": 60000,
    "merchantData": {
      "mid": "1791310199",
      "tid": "NP319559",
      "claveTecnica": "166831"
    },
    "network": {
      "ip": "192.168.100.198",
      "mask": "255.255.255.0",
      "gateway": "192.168.100.1"
    },
    "securityData": "B12D3D63069BD9EB05B7BBEEAA228ABC"
  }
}
```

### 2. Configurar Datos del Comercio (Recomendado)
```http
POST /pinpad/config/merchant
Content-Type: application/json

{
  "mid": "1791310199",
  "tid": "NP319559",
  "claveTecnica": "166831",
  "securityData": "B12D3D63069BD9EB05B7BBEEAA228ABC"
}
```

### 3. Configurar Red del PinPad
```http
POST /pinpad/config/network
Content-Type: application/json

{
  "host": "192.168.100.24",
  "port": 9999,
  "network": {
    "ip": "192.168.100.198",
    "mask": "255.255.255.0",
    "gateway": "192.168.100.1"
  }
}
```

### 4. Configuración Completa
```http
POST /pinpad/config
Content-Type: application/json

{
  "host": "192.168.100.24",
  "port": 9999,
  "merchantData": {
    "mid": "1791310199",
    "tid": "NP319559",
    "claveTecnica": "166831"
  },
  "securityData": "B12D3D63069BD9EB05B7BBEEAA228ABC",
  "network": {
    "ip": "192.168.100.198",
    "mask": "255.255.255.0",
    "gateway": "192.168.100.1"
  }
}
```

### 5. Reiniciar Configuración
```http
POST /pinpad/config/reset
```

## Flujo de Configuración Recomendado

1. **Iniciar el servidor** (ya no necesita .env)
2. **Configurar datos del comercio**:
   ```bash
   curl -X POST http://localhost:3000/pinpad/config/merchant \
     -H "Content-Type: application/json" \
     -d '{
       "mid": "1791310199",
       "tid": "NP319559",
       "claveTecnica": "166831",
       "securityData": "B12D3D63069BD9EB05B7BBEEAA228ABC"
     }'
   ```

3. **Configurar red si es necesario**:
   ```bash
   curl -X POST http://localhost:3000/pinpad/config/network \
     -H "Content-Type: application/json" \
     -d '{
       "host": "192.168.100.24",
       "port": 9999
     }'
   ```

4. **Verificar configuración**:
   ```bash
   curl http://localhost:3000/pinpad/config
   ```

5. **Procesar pagos** (los endpoints existentes siguen funcionando igual)

## Ventajas del Nuevo Sistema

✅ **Sin dependencia de archivos .env**
✅ **Configuración en tiempo real**
✅ **Múltiples computadoras con diferentes configuraciones**
✅ **Fácil gestión remota**
✅ **Validación de configuración antes de procesar pagos**

## Validaciones Automáticas

- El sistema verifica que `MID`, `TID` y `securityData` estén configurados antes de procesar pagos
- Si falta configuración, los endpoints devuelven error con instrucciones
- La configuración se valida en tiempo real

## Ejemplo de Uso en JavaScript

```javascript
// Configurar el PinPad
async function configurePinpad() {
  const response = await fetch('http://localhost:3000/pinpad/config/merchant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mid: "1791310199",
      tid: "NP319559",
      claveTecnica: "166831",
      securityData: "B12D3D63069BD9EB05B7BBEEAA228ABC"
    })
  });
  
  const result = await response.json();
  console.log('Configuración:', result);
}

// Procesar pago (igual que antes)
async function processPayment() {
  const response = await fetch('http://localhost:3000/pinpad/payment?monto=100&montoBaseIva=89.29&montoBaseNoIva=0&iva=10.71&cid=CAJA001');
  const result = await response.json();
  console.log('Pago:', result);
}
```

## Migración desde .env

Si anteriormente usabas variables de entorno, simplemente:

1. Elimina o renombra el archivo `.env` 
2. Usa los endpoints HTTP para configurar los mismos valores
3. Los endpoints de pago siguen funcionando igual

## Valores del .env Original

Los valores que tenías en `.env` eran:
- `PINPAD_HOST=192.168.100.24`
- `PINPAD_PORT=9999`
- `MID=1791310199`
- `TID=NP319559`
- `CLAVE_TECNICA=166831`
- `SECURITY_LL=B12D3D63069BD9EB05B7BBEEAA228ABC`

Ahora los configuras vía HTTP según se muestra arriba.