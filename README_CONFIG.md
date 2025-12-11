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

# Configuración Dinámica de la Impresora

El servidor también incluye un sistema de configuración dinámica para la impresora que permite personalizar la información de la empresa que aparece en los tickets.

## Endpoints de Configuración de Impresora

### 1. Obtener Configuración Actual de Impresora
```http
GET /printer/config
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Configuración actual de la impresora",
  "isComplete": true,
  "data": {
    "companyLines": {
      "line1": "SERVICIOS DE GESTION AEROPORTUARIA",
      "line2": "AEROGERPSA S.A.",
      "address": "Via a Tababela",
      "location": "AEROPUERTO INT. MARISCAL SUCRE - QUITO",
      "phone": "022818462"
    }
  }
}
```

### 2. Configurar Información de la Empresa
```http
POST /printer/config/company
Content-Type: application/json

{
  "line1": "SERVICIOS DE GESTION AEROPORTUARIA",
  "line2": "AEROGERPSA S.A.",
  "address": "Via a Tababela",
  "location": "AEROPUERTO INT. MARISCAL SUCRE - QUITO",
  "phone": "022818462"
}
```

### 3. Configuración Completa de Impresora
```http
POST /printer/config
Content-Type: application/json

{
  "companyLines": {
    "line1": "SERVICIOS DE GESTION AEROPORTUARIA",
    "line2": "AEROGERPSA S.A.",
    "address": "Via a Tababela",
    "location": "AEROPUERTO INT. MARISCAL SUCRE - QUITO",
    "phone": "022818462"
  },
  "footerText": "Texto adicional opcional",
  "websiteUrl": "www.empresa.com"
}
```

### 4. Reiniciar Configuración de Impresora
```http
POST /printer/config/reset
```

### 5. Eliminar Archivo de Configuración de Impresora
```http
DELETE /printer/config/file
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

3. **Configurar información de impresora**:
   ```bash
   curl -X POST http://localhost:3000/printer/config/company \
     -H "Content-Type: application/json" \
     -d '{
       "line1": "MI EMPRESA S.A.",
       "line2": "NOMBRE COMERCIAL",
       "address": "Mi Dirección 123",
       "location": "MI CIUDAD - MI PAÍS",
       "phone": "0999999999"
     }'
   ```

4. **Configurar red si es necesario**:
   ```bash
   curl -X POST http://localhost:3000/pinpad/config/network \
     -H "Content-Type: application/json" \
     -d '{
       "host": "192.168.100.24",
       "port": 9999
     }'
   ```

5. **Verificar configuración**:
   ```bash
   curl http://localhost:3000/pinpad/config
   curl http://localhost:3000/printer/config
   ```

6. **Procesar pagos e imprimir tickets** (los endpoints existentes siguen funcionando igual)

## Ventajas del Nuevo Sistema

✅ **Sin dependencia de archivos .env**
✅ **Configuración en tiempo real**
✅ **Múltiples computadoras con diferentes configuraciones**
✅ **Fácil gestión remota**
✅ **Validación de configuración antes de procesar pagos**
✅ **Personalización de tickets de impresora**
✅ **Información de empresa configurable dinámicamente**

## Validaciones Automáticas

### PinPad:
- El sistema verifica que `MID`, `TID` y `securityData` estén configurados antes de procesar pagos
- Si falta configuración, los endpoints devuelven error con instrucciones
- La configuración se valida en tiempo real

### Impresora:
- El sistema verifica que toda la información de la empresa esté completa
- Los tickets se generan automáticamente con la información configurada
- Cambios de configuración se aplican inmediatamente a nuevos tickets

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
  console.log('Configuración PinPad:', result);
}

// Configurar impresora
async function configurePrinter() {
  const response = await fetch('http://localhost:3000/printer/config/company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      line1: "MI EMPRESA S.A.",
      line2: "NOMBRE COMERCIAL",
      address: "Mi Dirección 123",
      location: "MI CIUDAD - MI PAÍS",
      phone: "0999999999"
    })
  });
  
  const result = await response.json();
  console.log('Configuración Impresora:', result);
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
3. Los endpoints de pago e impresión siguen funcionando igual

## Archivos de Configuración

Los sistemas crean automáticamente archivos de configuración persistentes:

- **`pinpad-config.json`** - Configuración del PinPad
- **`printer-config.json`** - Configuración de la impresora

Estos archivos se crean automáticamente y se cargan al iniciar el servidor.

## Valores del .env Original

Los valores que tenías en `.env` eran:
- `PINPAD_HOST=192.168.100.24`
- `PINPAD_PORT=9999`
- `MID=1791310199`
- `TID=NP319559`
- `CLAVE_TECNICA=166831`
- `SECURITY_LL=B12D3D63069BD9EB05B7BBEEAA228ABC`

Ahora los configuras vía HTTP según se muestra arriba.

## ARRANCAR PM2
### Comandos Básicos para PM2

#### Iniciar el Servidor
```bash
pm2 start ecosystem.config.js
```

#### Ver el Estado de las Aplicaciones
```bash
pm2 status
```

#### Reiniciar el Servidor
```bash
pm2 restart ecosystem.config.js
```

#### Detener el Servidor
```bash
pm2 stop ecosystem.config.js
```

#### Eliminar el Servidor de PM2
```bash
pm2 delete ecosystem.config.js
```

#### Guardar la Configuración de PM2
```bash
pm2 save
```

#### Cargar la Configuración Guardada al Reiniciar
```bash
pm2 resurrect
```

### Archivo `ecosystem.config.js`

Ejemplo de configuración básica:
```javascript
module.exports = {
  apps: [
    {
      name: "socket-server",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
};
```