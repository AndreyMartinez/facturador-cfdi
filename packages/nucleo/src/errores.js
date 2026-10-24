// Errores tipados. La interfaz muestra `mensaje` y `accion`; `detalleTecnico` va en un desplegable.

/** @typedef {{ mensaje: string, accion: string }} Texto */

/** @type {Record<string, Texto>} */
export const CATALOGO = {
  IMPORTE_NO_CUADRA: { mensaje: 'El total de la factura no cuadra con el de la venta.', accion: 'Revisa cantidades y precios; el valor unitario lleva 6 decimales. No se puede timbrar así.' },
  RFC_INVALIDO: { mensaje: 'El RFC no tiene un formato válido.', accion: 'Revisa el RFC: 12 caracteres para persona moral, 13 para persona física.' },
  REGIMEN_INVALIDO: { mensaje: 'El régimen fiscal no existe o no aplica a este tipo de persona.', accion: 'Elige el régimen que aparece en la constancia de situación fiscal.' },
  USO_CFDI_INCOMPATIBLE: { mensaje: 'El uso CFDI no se permite con el régimen del receptor.', accion: 'Cambia el uso CFDI o el régimen del receptor.' },
  CODIGO_POSTAL_INVALIDO: { mensaje: 'El código postal debe tener 5 dígitos.', accion: 'Usa el C.P. del domicilio fiscal de la constancia.' },
  DATO_FALTANTE: { mensaje: 'Falta un dato obligatorio.', accion: 'Completa el campo indicado.' },
  FUERA_DE_ALCANCE: { mensaje: 'Esta factura usa algo que todavía no soportamos.', accion: 'Por ahora solo facturas de ingreso con IVA trasladado, sin retenciones ni complementos.' },
  CSD_CONTRASENA: { mensaje: 'La contraseña del CSD es incorrecta.', accion: 'Es la contraseña del CSD, no la de tu e.firma ni la del portal del SAT.' },
  CSD_NO_COINCIDE: { mensaje: 'El CSD no pertenece a este emisor.', accion: 'Carga el CSD del RFC del emisor.' },
  CSD_VENCIDO: { mensaje: 'El CSD está vencido o todavía no es vigente.', accion: 'Tramita un CSD nuevo en CertiSAT Web.' },
  CSD_NO_ES_CSD: { mensaje: 'El certificado parece ser de e.firma, no un CSD.', accion: 'Usa el certificado de sello digital (CSD), no el de la e.firma.' },
  CSD_ARCHIVO: { mensaje: 'No se pudo leer el archivo del CSD.', accion: 'Carga el .cer y el .key tal como los descargaste de CertiSAT.' },
  PAC_RECHAZO: { mensaje: 'El PAC rechazó la factura.', accion: 'Revisa el detalle y corrige el dato indicado.' },
  PAC_DUPLICADO: { mensaje: 'Este comprobante ya se había timbrado.', accion: 'Busca la factura en «Emitidas» antes de volver a intentar.' },
  RED_NO_DISPONIBLE: { mensaje: 'No hubo respuesta del servicio.', accion: 'Tu borrador está guardado. Reintentar es seguro: no se timbrará dos veces.' },
  AMBIENTE_NO_DISPONIBLE: { mensaje: 'Este ambiente no está disponible.', accion: 'En la demo solo se puede timbrar en sandbox.' },
  LIMITE_ALCANZADO: { mensaje: 'Se alcanzó el límite de facturas de prueba.', accion: 'Espera un momento e inténtalo otra vez.' },
  PUBLICO_EN_GENERAL: { mensaje: 'El comprador no pidió factura nominativa (RFC XAXX010101000).', accion: 'Si te mandó su constancia, captura sus datos en «Receptor».' },
  ML_YA_TIENE_FACTURA: { mensaje: 'Esta venta ya tiene una factura en MercadoLibre.', accion: 'Timbrar otra podría duplicarla. Revisa la existente.' },
  PDF_MUY_GRANDE: { mensaje: 'El PDF pesa más de 1 MB, el límite de MercadoLibre.', accion: 'Reduce la descripción de los conceptos o súbelo a mano.' },
};

export class ErrorFactura extends Error {
  /**
   * @param {keyof typeof CATALOGO | string} codigo
   * @param {{ detalleTecnico?: string, campo?: string, mensaje?: string }} [extra]
   */
  constructor(codigo, extra = {}) {
    const texto = CATALOGO[codigo] ?? { mensaje: extra.mensaje ?? codigo, accion: '' };
    super(extra.mensaje ?? texto.mensaje);
    this.name = 'ErrorFactura';
    this.codigo = codigo;
    this.accion = texto.accion;
    this.campo = extra.campo;
    this.detalleTecnico = extra.detalleTecnico;
  }
}

/** @param {unknown} e */
export const esErrorFactura = (e) => e instanceof ErrorFactura;
