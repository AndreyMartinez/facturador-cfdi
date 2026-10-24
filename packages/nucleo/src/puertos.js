// Tipos del dominio e interfaces (puertos) que cumplen los adaptadores.
// Solo JSDoc: este archivo no ejecuta nada.

/**
 * @typedef {'sandbox' | 'produccion'} Ambiente
 *
 * @typedef {object} Emisor
 * @property {number} esquema
 * @property {string} id
 * @property {string} rfc
 * @property {string} nombre
 * @property {string} regimenFiscal
 * @property {string} lugarExpedicion
 * @property {{ formaPago: string, metodoPago: string, moneda: string }} comprobante
 * @property {{ claveProdServ: string, claveUnidad: string, unidad?: string, objetoImp: string }} conceptoPorDefecto
 * @property {Ambiente[]} ambientes
 *
 * @typedef {object} DatosReceptor
 * @property {string} rfc
 * @property {string} nombre
 * @property {string} regimenFiscal
 * @property {string} usoCfdi
 * @property {string} codigoPostal
 *
 * @typedef {object} ConceptoVenta
 * @property {string} descripcion
 * @property {number} cantidad      entero, piezas
 * @property {string} total         total con IVA de la línea, p. ej. "198.00"
 * @property {string} [sku]
 * @property {string} [claveProdServ]
 *
 * @typedef {object} Venta  salida normalizada de cualquier fuente
 * @property {string} fuente
 * @property {string} id
 * @property {string} [packId]
 * @property {string} fecha
 * @property {string} total
 * @property {ConceptoVenta[]} conceptos
 * @property {DatosReceptor | null} receptor
 *
 * @typedef {object} Traslado
 * @property {string} base
 * @property {string} impuesto
 * @property {string} tipoFactor
 * @property {string} tasaOCuota
 * @property {string} importe
 *
 * @typedef {object} Concepto
 * @property {string} claveProdServ
 * @property {string} [noIdentificacion]
 * @property {string} cantidad
 * @property {string} claveUnidad
 * @property {string} [unidad]
 * @property {string} descripcion
 * @property {string} valorUnitario
 * @property {string} importe
 * @property {string} objetoImp
 * @property {Traslado[]} traslados
 *
 * @typedef {object} Comprobante  borrador listo para XML
 * @property {string} [serie]
 * @property {string} [folio]
 * @property {string} fecha
 * @property {string} formaPago
 * @property {string} metodoPago
 * @property {string} moneda
 * @property {string} lugarExpedicion
 * @property {string} subTotal
 * @property {string} total
 * @property {{ periodicidad: string, meses: string, anio: string }} [informacionGlobal]
 * @property {{ rfc: string, nombre: string, regimenFiscal: string }} emisor
 * @property {{ rfc: string, nombre: string, domicilioFiscalReceptor: string, regimenFiscalReceptor: string, usoCfdi: string }} receptor
 * @property {Concepto[]} conceptos
 * @property {{ totalImpuestosTrasladados: string, traslados: Traslado[] }} impuestos
 *
 * @typedef {object} Borrador
 * @property {Comprobante} comprobante
 * @property {{ codigo: string, mensaje: string }[]} avisos
 * @property {string} totalVenta
 *
 * @typedef {object} Certificado
 * @property {string} noCertificado   20 dígitos
 * @property {string} certificadoB64  .cer en base64
 * @property {string} rfc
 * @property {Date} vigenteDesde
 * @property {Date} vigenteHasta
 */

/**
 * Firmador: el núcleo nunca ve la llave privada.
 * @typedef {object} Firmador
 * @property {() => Certificado} certificado
 * @property {(cadenaOriginal: string) => Promise<string>} firmar  devuelve el sello en base64
 */

/**
 * PAC
 * @typedef {object} Pac
 * @property {(xmlSellado: string, opciones: { ambiente: Ambiente, emisorId: string, idempotencia: string }) => Promise<{ xmlTimbrado: string, uuid: string }>} timbrar
 */

/**
 * Fuente de ventas: MercadoLibre, captura manual, ejemplo…
 * @typedef {object} FuenteVentas
 * @property {string} id
 * @property {(idVenta: string) => Promise<Venta>} buscar
 * @property {() => Promise<Venta[]>} listarPendientes
 * @property {(idVenta: string, archivos: { xml: string, pdf: Uint8Array }) => Promise<void>} [entregar]
 * @property {(idVenta: string) => Promise<boolean>} [facturaExistente]
 */

export {};
