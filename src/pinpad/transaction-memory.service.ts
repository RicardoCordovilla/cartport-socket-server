import { format } from "@formkit/tempo";

// Importar escenarios como constante en lugar de módulo JSON
const escenariosConfig = {
  "escenariosReverso": [
    {
      "id": "codigo_91",
      "descripcion": "Entidad fuera de línea",
      "condiciones": {
        "codigoAutorizador": "91",
        "mensajes": ["ENT. FUERA LINEA", "ENTIDAD FUERA DE LINEA"]
      },
      "tipoReverso": "04",
      "autoReverse": true
    },
    {
      "id": "codigo_12",
      "descripcion": "Transacción inválida",
      "condiciones": {
        "codigoAutorizador": "12",
        "mensajes": ["TRANS. INVALIDA", "TRANSACCION INVALIDA"]
      },
      "tipoReverso": "04",
      "autoReverse": true
    },
    {
      "id": "codigo_57",
      "descripcion": "Transacción inválida",
      "condiciones": {
        "codigoAutorizador": "57",
        "mensajes": ["TRANS. INVALIDA", "TRANSACCION INVALIDA"]
      },
      "tipoReverso": "04",
      "autoReverse": true
    },
    {
      "id": "no_hubo_respuesta",
      "descripcion": "Sin respuesta del autorizador",
      "condiciones": {
        "responseCode": "20",
        "mensajes": ["NO HUBO RESPUESTA"]
      },
      "tipoReverso": "04",
      "autoReverse": true
    },
    {
      "id": "perdida_comunicacion",
      "descripcion": "Pérdida de comunicación",
      "condiciones": {
        "camposNulos": true,
        "timeout": true
      },
      "tipoReverso": "04",
      "autoReverse": true
    }
  ]
};

export interface TransactionMemory {
  id: string;
  timestamp: string;
  hora: string;
  fecha: string;
  monto: number;
  montoBaseIva: number;
  montoBaseNoIva: number;
  iva: number;
  mid: string;
  tid: string;
  cid: string;
  numeroFactura?: string;
  estado: 'pendiente' | 'completada' | 'error' | 'reversada';
  intentosReverso: number;
}

class TransactionMemoryService {
  private transaccionesPendientes: Map<string, TransactionMemory> = new Map();
  private readonly MAX_INTENTOS_REVERSO = 3;

  /**
   * Almacena una transacción en memoria cuando se inicia
   */
  public almacenarTransaccion(params: {
    monto: number;
    montoBaseIva: number;
    montoBaseNoIva: number;
    iva: number;
    mid: string;
    tid: string;
    cid: string;
    numeroFactura?: string;
  }): string {
    const now = new Date();
    const transactionId = this.generarTransactionId();
    
    const transaction: TransactionMemory = {
      id: transactionId,
      timestamp: now.toISOString(),
      hora: format(now, "HHmmss"),
      fecha: format(now, "YYYYMMDD"),
      ...params,
      estado: 'pendiente',
      intentosReverso: 0
    };

    this.transaccionesPendientes.set(transactionId, transaction);
    
    console.log(`📦 Transacción almacenada en memoria: ${transactionId}`, {
      fecha: transaction.fecha,
      hora: transaction.hora,
      monto: transaction.monto,
      cid: transaction.cid
    });

    return transactionId;
  }

  /**
   * Evalúa si una respuesta requiere reverso automático
   */
  public evaluarRespuestaParaReverso(
    transactionId: string, 
    respuesta: any
  ): { requiereReverso: boolean; escenario?: any; transaction?: TransactionMemory } {
    const transaction = this.transaccionesPendientes.get(transactionId);
    
    if (!transaction) {
      console.warn(`⚠️ No se encontró transacción en memoria: ${transactionId}`);
      return { requiereReverso: false };
    }

    // Evaluar cada escenario
    for (const escenario of escenariosConfig.escenariosReverso) {
      if (this.cumpleCondicionesEscenario(escenario, respuesta)) {
        console.log(`🔍 Escenario detectado: ${escenario.id} - ${escenario.descripcion}`);
        return { 
          requiereReverso: escenario.autoReverse, 
          escenario, 
          transaction 
        };
      }
    }

    return { requiereReverso: false };
  }

  /**
   * Evalúa si la respuesta cumple las condiciones de un escenario
   */
  private cumpleCondicionesEscenario(escenario: any, respuesta: any): boolean {
    const condiciones = escenario.condiciones;
    
    // Verificar código de autorizador
    if (condiciones.codigoAutorizador) {
      const codigoRespuesta = this.extraerCodigoAutorizador(respuesta);
      if (codigoRespuesta === condiciones.codigoAutorizador) {
        return true;
      }
    }

    // Verificar response code
    if (condiciones.responseCode) {
      const responseCode = this.extraerResponseCode(respuesta);
      if (responseCode === condiciones.responseCode) {
        return true;
      }
    }

    // Verificar mensajes específicos
    if (condiciones.mensajes && Array.isArray(condiciones.mensajes)) {
      const mensaje = this.extraerMensaje(respuesta);
      if (condiciones.mensajes.some((msg: string) => mensaje.includes(msg))) {
        return true;
      }
    }

    // Verificar campos nulos o timeout
    if (condiciones.camposNulos && this.tienesCamposNulos(respuesta)) {
      return true;
    }

    return false;
  }

  /**
   * Extrae el código de autorizador de la respuesta
   */
  private extraerCodigoAutorizador(respuesta: any): string {
    if (respuesta.raw && respuesta.raw.length > 6) {
      return respuesta.raw.substring(4, 6);
    }
    return respuesta.codigoRespuesta || "";
  }

  /**
   * Extrae el response code de la respuesta
   */
  private extraerResponseCode(respuesta: any): string {
    if (respuesta.raw && respuesta.raw.length > 4) {
      return respuesta.raw.substring(2, 4);
    }
    return "";
  }

  /**
   * Extrae el mensaje de la respuesta
   */
  private extraerMensaje(respuesta: any): string {
    if (respuesta.raw && respuesta.raw.length > 28) {
      return respuesta.raw.substring(8, 28).trim();
    }
    return respuesta.mensaje || respuesta.mensajeRespuesta || "";
  }

  /**
   * Verifica si hay campos nulos o vacíos
   */
  private tienesCamposNulos(respuesta: any): boolean {
    return !respuesta || 
           Object.values(respuesta).some(val => val === null || val === undefined || val === "");
  }

  /**
   * Marca una transacción como completada exitosamente
   */
  public marcarCompletada(transactionId: string): void {
    const transaction = this.transaccionesPendientes.get(transactionId);
    if (transaction) {
      transaction.estado = 'completada';
      console.log(`✅ Transacción completada: ${transactionId}`);
    }
  }

  /**
   * Marca una transacción como reversada
   */
  public marcarReversada(transactionId: string): void {
    const transaction = this.transaccionesPendientes.get(transactionId);
    if (transaction) {
      transaction.estado = 'reversada';
      console.log(`🔄 Transacción reversada: ${transactionId}`);
    }
  }

  /**
   * Incrementa el contador de intentos de reverso
   */
  public incrementarIntentosReverso(transactionId: string): boolean {
    const transaction = this.transaccionesPendientes.get(transactionId);
    if (transaction) {
      transaction.intentosReverso++;
      return transaction.intentosReverso < this.MAX_INTENTOS_REVERSO;
    }
    return false;
  }

  /**
   * Obtiene una transacción por ID
   */
  public obtenerTransaccion(transactionId: string): TransactionMemory | undefined {
    return this.transaccionesPendientes.get(transactionId);
  }

  /**
   * Limpia transacciones completadas o reversadas
   */
  public limpiarTransaccionesCompletadas(): void {
    for (const [id, transaction] of this.transaccionesPendientes.entries()) {
      if (transaction.estado === 'completada' || transaction.estado === 'reversada') {
        this.transaccionesPendientes.delete(id);
      }
    }
  }

  /**
   * Genera un ID único para la transacción
   */
  private generarTransactionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Lista todas las transacciones en memoria (para debugging)
   */
  public listarTransacciones(): TransactionMemory[] {
    return Array.from(this.transaccionesPendientes.values());
  }
}

// Singleton
export const transactionMemoryService = new TransactionMemoryService();