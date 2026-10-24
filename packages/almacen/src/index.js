// Almacén del dominio sobre un motor (memoria, IndexedDB; en la Fase C, servidor).
// Todo documento lleva `esquema` (versión) y, salvo los emisores, `emisorId`.
export * from './motores.js';

export const ESQUEMA_ACTUAL = 1;

/** @typedef {import('./motores.js').Motor} Motor */
/** @typedef {import('./motores.js').Documento} Documento */

/** Migraciones por colección: esquema n → n+1. Vacío mientras solo exista la versión 1. */
/** @type {Record<string, Record<number, (doc: Documento) => Documento>>} */
const MIGRACIONES = {};

/** @param {string} coleccion @param {Documento | undefined} doc */
function migrar(coleccion, doc) {
  if (!doc) return doc;
  let d = doc;
  while ((d.esquema ?? 1) < ESQUEMA_ACTUAL) {
    const paso = MIGRACIONES[coleccion]?.[d.esquema ?? 1];
    if (!paso) throw new Error(`Sin migración para ${coleccion} esquema ${d.esquema}`);
    d = paso(d);
  }
  return d;
}

/** @param {string} prefijo */
export function nuevoId(prefijo) {
  return `${prefijo}_${Date.now().toString(36)}${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
}

/** @param {Motor} motor */
export function crearAlmacen(motor) {
  /** @param {import('./motores.js').Coleccion} c */
  const coleccion = (c) => ({
    /** @param {string} id */
    obtener: async (id) => migrar(c, await motor.obtener(c, id)),
    /** @param {Documento} doc */
    guardar: async (doc) => { await motor.guardar(c, { ...doc, esquema: ESQUEMA_ACTUAL }); return doc; },
    /** @param {(d: Documento) => boolean} [filtro] */
    listar: async (filtro = () => true) => (await motor.listar(c)).map((d) => /** @type {Documento} */ (migrar(c, d))).filter(filtro),
    /** @param {string} id */
    borrar: (id) => motor.borrar(c, id),
  });

  const facturas = coleccion('facturas');

  return {
    emisores: coleccion('emisores'),
    borradores: coleccion('borradores'),
    csd: coleccion('csd'),
    ajustes: coleccion('ajustes'),
    facturas: {
      ...facturas,
      /** @param {string} emisorId */
      deEmisor: async (emisorId) => (await facturas.listar((f) => f.emisorId === emisorId))
        .sort((a, b) => String(b.creada).localeCompare(String(a.creada))),
      /** @param {string} emisorId @param {string} estado */
      porEstado: (emisorId, estado) => facturas.listar((f) => f.emisorId === emisorId && f.estado === estado),
    },
    folios: {
      /** Reserva el siguiente folio de forma atómica. @param {string} emisorId @param {string} serie */
      siguiente: async (emisorId, serie) => {
        const doc = await motor.actualizar('folios', `${emisorId}:${serie}`, (actual) => ({
          id: `${emisorId}:${serie}`, emisorId, serie, esquema: ESQUEMA_ACTUAL, ultimo: (actual?.ultimo ?? 0) + 1,
        }));
        return /** @type {number} */ (doc.ultimo);
      },
    },
    contadores: {
      /** @param {string} emisorId @param {'sandbox' | 'produccion'} ambiente @param {string} mes AAAA-MM */
      sumar: (emisorId, ambiente, mes) => motor.actualizar('contadores', `${emisorId}:${ambiente}:${mes}`, (actual) => ({
        id: `${emisorId}:${ambiente}:${mes}`, emisorId, ambiente, mes, esquema: ESQUEMA_ACTUAL, timbres: (actual?.timbres ?? 0) + 1,
      })),
      /** @param {string} emisorId */
      deEmisor: async (emisorId) => (await motor.listar('contadores')).filter((c) => c.emisorId === emisorId),
    },
  };
}

/** @typedef {ReturnType<typeof crearAlmacen>} Almacen */
