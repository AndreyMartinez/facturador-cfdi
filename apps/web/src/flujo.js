// Flujo de una factura, independiente de la interfaz:
// borrador → folio → sello → (guardar) → PAC → (guardar) → PDF → (guardar) → entregar.
// Cada paso se guarda antes del siguiente para que nada se pierda y un reintento sea seguro.
import { crearBorrador, sellar, ErrorFactura } from '@facturador/nucleo';
import { huella } from '@facturador/pac';
import { nuevoId } from '@facturador/almacen';

/**
 * @typedef {object} Dependencias
 * @property {import('@facturador/almacen').Almacen} almacen
 * @property {import('@facturador/nucleo/puertos').Pac} pac
 * @property {import('@facturador/nucleo/puertos').Firmador} firmador
 * @property {'sandbox' | 'produccion'} ambiente
 * @property {import('@facturador/nucleo/puertos').FuenteVentas} [fuente]  si sabe entregar, se le entrega la factura
 * @property {() => Date} [ahora]
 */

/** @param {any} f @param {string} estado @param {string} [detalle] @param {Date} [fecha] */
function avanzar(f, estado, detalle, fecha = new Date()) {
  return { ...f, estado, eventos: [...(f.eventos ?? []), { fecha: fecha.toISOString(), estado, ...(detalle ? { detalle } : {}) }] };
}

/**
 * Sella y guarda una factura nueva en estado «sellada». No contacta al PAC.
 * @param {{ venta: import('@facturador/nucleo/puertos').Venta, emisor: import('@facturador/nucleo/puertos').Emisor, receptor?: import('@facturador/nucleo/puertos').DatosReceptor, serie?: string }} entrada
 * @param {Dependencias} deps
 */
export async function sellarFactura({ venta, emisor, receptor, serie = 'A' }, deps) {
  const ahora = deps.ahora?.() ?? new Date();
  const previa = crearBorrador(venta, emisor, { fecha: ahora, receptor });
  if (previa.errores.length) throw previa.errores[0];

  const folio = await deps.almacen.folios.siguiente(emisor.id, serie);
  const { comprobante } = crearBorrador(venta, emisor, { fecha: ahora, receptor, serie, folio });
  const sellado = await sellar(comprobante, deps.firmador, { ahora });
  const factura = avanzar({
    id: nuevoId('fa'),
    emisorId: emisor.id,
    ambiente: deps.ambiente,
    venta: { fuente: venta.fuente, id: venta.id },
    serie, folio,
    comprobante,
    xmlSellado: sellado.xml,
    idempotencia: await huella(sellado.xml),
    creada: ahora.toISOString(),
  }, 'sellada', undefined, ahora);
  await deps.almacen.facturas.guardar(factura);
  return factura;
}

/**
 * Timbra una factura sellada (o reintenta una que quedó «timbrando») con el MISMO XML sellado.
 * @param {string} facturaId
 * @param {Dependencias} deps
 */
export async function timbrarFactura(facturaId, deps) {
  /** @type {any} */
  let f = await deps.almacen.facturas.obtener(facturaId);
  if (!f) throw new ErrorFactura('DATO_FALTANTE', { campo: 'factura' });
  if (!['sellada', 'timbrando'].includes(f.estado)) return f;

  f = avanzar(f, 'timbrando');
  await deps.almacen.facturas.guardar(f);

  let r;
  try {
    r = await deps.pac.timbrar(f.xmlSellado, { ambiente: f.ambiente, emisorId: f.emisorId, idempotencia: f.idempotencia });
  } catch (e) {
    const codigo = /** @type {any} */ (e)?.codigo ?? 'RED_NO_DISPONIBLE';
    // Un rechazo vuelve a «sellada» con el error; una caída de red se queda en «timbrando» para reconciliar.
    f = avanzar(f, codigo === 'RED_NO_DISPONIBLE' ? 'timbrando' : 'rechazada', String(/** @type {any} */ (e)?.message ?? e));
    await deps.almacen.facturas.guardar(f);
    throw e;
  }

  const ahora = deps.ahora?.() ?? new Date();
  f = avanzar({ ...f, xmlTimbrado: r.xmlTimbrado, uuid: r.uuid }, 'timbrada', undefined, ahora);
  await deps.almacen.facturas.guardar(f);
  await deps.almacen.contadores.sumar(f.emisorId, f.ambiente, ahora.toISOString().slice(0, 7));

  // jsPDF se carga solo cuando hace falta (pesa ~130 KB comprimido).
  const { generarPdf } = await import('@facturador/pdf');
  const pdf = generarPdf({ comprobante: f.comprobante, xmlTimbrado: r.xmlTimbrado, ambiente: f.ambiente });
  f = { ...f, pdf };
  await deps.almacen.facturas.guardar(f);
  return entregarFactura(f.id, deps);
}

/**
 * Entrega a la fuente (p. ej. subir a MercadoLibre). Si la fuente no entrega, la factura queda «entregada».
 * @param {string} facturaId
 * @param {Dependencias} deps
 */
export async function entregarFactura(facturaId, deps) {
  /** @type {any} */
  let f = await deps.almacen.facturas.obtener(facturaId);
  if (!f || !['timbrada', 'error_entrega'].includes(f.estado)) return f;
  if (!deps.fuente?.entregar) {
    f = avanzar(f, 'entregada', 'Sin entrega automática para esta fuente');
  } else {
    try {
      await deps.fuente.entregar(f.venta.id, { xml: f.xmlTimbrado, pdf: f.pdf });
      f = avanzar(f, 'entregada');
    } catch (e) {
      f = avanzar(f, 'error_entrega', String(/** @type {any} */ (e)?.message ?? e));
    }
  }
  await deps.almacen.facturas.guardar(f);
  return f;
}

/**
 * Al abrir la app: reintenta las facturas que quedaron a medias.
 * @param {string} emisorId
 * @param {Dependencias} deps
 */
export async function reconciliar(emisorId, deps) {
  const pendientes = await deps.almacen.facturas.porEstado(emisorId, 'timbrando');
  const resultados = [];
  for (const f of pendientes) {
    try { resultados.push(await timbrarFactura(f.id, deps)); } catch { /* queda pendiente */ }
  }
  return resultados;
}
