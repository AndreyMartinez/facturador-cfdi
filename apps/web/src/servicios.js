// Conecta las piezas para el navegador: almacén IndexedDB, fuentes, PAC (relevo o simulado) y CSD.
import { crearAlmacen, motorIndexedDB, motorMemoria } from '@facturador/almacen';
import { fuenteEjemplo, ventaManual, EMISOR_DEMO } from '@facturador/fuentes';
import { pacRelevo, pacSimulado } from '@facturador/pac';
import { ErrorFactura } from '@facturador/nucleo';
import { sellarFactura, timbrarFactura, entregarFactura, reconciliar } from './flujo.js';
import { cambiar, leer, refrescar } from './estado.js';

/** node-forge solo se descarga al abrir un CSD. @type {typeof import('@facturador/firmador-webcrypto').abrirCsd} */
const abrirCsd = async (...a) => (await import('@facturador/firmador-webcrypto')).abrirCsd(...a);

export const RELEVO_URL = import.meta.env.VITE_RELEVO_URL ?? '';
export const CONTRASENA_CSD_DEMO = '12345678a'; // pública: CSD de prueba del SAT
const AMBIENTE = /** @type {const} */ ('sandbox'); // la demo nunca timbra en producción

/** @type {import('@facturador/almacen').Almacen} */
let almacen;
const ejemplo = fuenteEjemplo();
const pac = RELEVO_URL ? pacRelevo({ url: RELEVO_URL }) : pacSimulado();

export const obtenerAlmacen = () => almacen;

export async function iniciar() {
  let motor;
  try { motor = await motorIndexedDB('facturador'); } catch { motor = motorMemoria(); }
  almacen = crearAlmacen(motor);

  const activo = await almacen.ajustes.obtener('emisorActivo');
  let emisor = activo ? await almacen.emisores.obtener(activo.emisorId) : undefined;
  if (!emisor) {
    emisor = await almacen.emisores.guardar(EMISOR_DEMO);
    await almacen.ajustes.guardar({ id: 'emisorActivo', emisorId: EMISOR_DEMO.id });
  }
  cambiar({ emisor: /** @type {any} */ (emisor), modoPac: RELEVO_URL ? 'relevo' : 'simulado' });
  await abrirCsdInicial(/** @type {any} */ (emisor));
  cambiar({ listo: true });
  reconciliar(/** @type {any} */ (emisor).id, deps()).then((r) => r.length && refrescar());
}

/** El emisor de prueba abre su CSD solo; uno real necesita la contraseña en cada sesión. */
async function abrirCsdInicial(/** @type {import('@facturador/nucleo/puertos').Emisor} */ emisor) {
  if (emisor.rfc !== EMISOR_DEMO.rfc) return;
  try {
    const guardado = await almacen.csd.obtener(emisor.id);
    const [cer, key] = guardado
      ? [guardado.cer, guardado.key]
      : await Promise.all(['demo/EKU9003173C9.cer', 'demo/EKU9003173C9.key'].map(async (r) => {
        const res = await fetch(r);
        if (!res.ok) throw new Error(`No se encontró ${r}`);
        return new Uint8Array(await res.arrayBuffer());
      }));
    cambiar({ firmador: await abrirCsd({ cer, key, contrasena: CONTRASENA_CSD_DEMO }), csdOrigen: 'demo' });
  } catch (e) {
    cambiar({ firmador: null, csdOrigen: '', error: e });
  }
}

/** @param {{ cer: Uint8Array, key: Uint8Array, contrasena: string, recordar: boolean }} csd */
export async function cargarCsd({ cer, key, contrasena, recordar }) {
  const emisor = leer().emisor;
  if (!emisor) throw new ErrorFactura('DATO_FALTANTE', { campo: 'emisor' });
  const firmador = await abrirCsd({ cer, key, contrasena });
  if (firmador.certificado().rfc !== emisor.rfc) throw new ErrorFactura('CSD_NO_COINCIDE');
  // Se guarda la .key tal como viene del SAT (ya cifrada con su contraseña). La contraseña no se guarda.
  if (recordar) await almacen.csd.guardar({ id: emisor.id, emisorId: emisor.id, cer, key });
  else await almacen.csd.borrar(emisor.id);
  cambiar({ firmador, csdOrigen: 'cargado' });
  return firmador.certificado();
}

/** @param {import('@facturador/nucleo/puertos').Emisor} emisor */
export async function guardarEmisor(emisor) {
  const anterior = leer().emisor;
  await almacen.emisores.guardar(emisor);
  const cambioRfc = anterior?.rfc !== emisor.rfc;
  cambiar({ emisor, ...(cambioRfc ? { firmador: null, csdOrigen: '' } : {}) });
  refrescar();
}

function deps(fuenteId = '') {
  const { firmador } = leer();
  return {
    almacen,
    pac,
    firmador: /** @type {import('@facturador/nucleo/puertos').Firmador} */ (firmador),
    ambiente: AMBIENTE,
    ...(fuenteId === 'ejemplo' ? { fuente: ejemplo } : {}),
  };
}

/** @param {string} fuente @param {string} id @returns {Promise<import('@facturador/nucleo/puertos').Venta>} */
export async function buscarVenta(fuente, id) {
  if (fuente === 'ejemplo') return ejemplo.buscar(id);
  if (fuente === 'manual') {
    const doc = await almacen.borradores.obtener(id);
    if (!doc) throw new ErrorFactura('DATO_FALTANTE', { campo: 'venta', mensaje: 'No se encontró la venta capturada.' });
    return doc.venta;
  }
  throw new ErrorFactura('DATO_FALTANTE', { mensaje: `Fuente desconocida: ${fuente}` });
}

/** @param {import('@facturador/fuentes').CapturaManual} captura */
export async function guardarVentaManual(captura) {
  const emisor = /** @type {any} */ (leer().emisor);
  const venta = ventaManual(captura);
  await almacen.borradores.guardar({ id: venta.id, emisorId: emisor.id, venta });
  refrescar();
  return venta;
}

/** Ventas de ejemplo y capturadas que todavía no tienen factura timbrada. */
export async function ventasPendientes() {
  const emisor = /** @type {any} */ (leer().emisor);
  const facturas = await almacen.facturas.deEmisor(emisor.id);
  const facturadas = new Set(facturas.filter((f) => !['sellada', 'rechazada'].includes(f.estado)).map((f) => `${f.venta.fuente}:${f.venta.id}`));
  const manuales = (await almacen.borradores.listar((d) => d.emisorId === emisor.id)).map((d) => d.venta);
  const todas = [...(await ejemplo.listarPendientes()), ...manuales];
  return todas.map((v) => ({ venta: v, facturada: facturadas.has(`${v.fuente}:${v.id}`) }));
}

/**
 * @param {import('@facturador/nucleo/puertos').Venta} venta
 * @param {import('@facturador/nucleo/puertos').DatosReceptor | undefined} receptor
 */
export async function facturar(venta, receptor) {
  const { emisor, firmador } = leer();
  if (!emisor) throw new ErrorFactura('DATO_FALTANTE', { campo: 'emisor' });
  if (!firmador) throw new ErrorFactura('CSD_ARCHIVO', { mensaje: 'Falta cargar el CSD del emisor.' });
  const d = deps(venta.fuente);
  const sellada = await sellarFactura({ venta, emisor, receptor }, d);
  refrescar();
  try {
    return await timbrarFactura(sellada.id, d);
  } finally {
    refrescar();
  }
}

/** @param {string} facturaId */
export async function reintentar(facturaId) {
  const f = await almacen.facturas.obtener(facturaId);
  if (!f) return;
  const d = deps(f.venta.fuente);
  try {
    return f.estado === 'error_entrega' ? await entregarFactura(f.id, d) : await timbrarFactura(f.id, d);
  } finally {
    refrescar();
  }
}

/** @param {string} nombre @param {BlobPart | Uint8Array} contenido @param {string} tipo */
export function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([/** @type {BlobPart} */ (contenido)], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
