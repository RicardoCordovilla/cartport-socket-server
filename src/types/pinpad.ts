export interface PaymentResponse {
  success: boolean;
  message: string;
  data: PaymentResponseData;
  rawResponse?: string;
}

export interface PaymentResponseData {
  tipoMensaje: string;
  codigoRespuesta: string;
  codigoRed: string;
  codigoAutorizador: string;
  mensajeRespuesta: string;
  secuencial: string;
  lote: string;
  hora: string;
  fecha: string;
  numeroAutorizacion: string;
  terminalId: string;
  merchantId: string;
  tarjetaTruncada: string;
  fechaVencimiento: string;
  modoLectura: string;
  nombreTarjetahabiente: string;
}
