// Motores de almacenamiento con la misma interfaz. Cada documento tiene `id`.

export const COLECCIONES = /** @type {const} */ (['emisores', 'facturas', 'borradores', 'csd', 'folios', 'contadores', 'ajustes']);

/**
 * @typedef {typeof COLECCIONES[number]} Coleccion
 * @typedef {{ id: string } & Record<string, any>} Documento
 * @typedef {object} Motor
 * @property {(c: Coleccion, id: string) => Promise<Documento | undefined>} obtener
 * @property {(c: Coleccion, doc: Documento) => Promise<void>} guardar
 * @property {(c: Coleccion) => Promise<Documento[]>} listar
 * @property {(c: Coleccion, id: string) => Promise<void>} borrar
 * @property {(c: Coleccion, id: string, fn: (actual: Documento | undefined) => Documento) => Promise<Documento>} actualizar  atómico
 */

/** @returns {Motor} */
export function motorMemoria() {
  /** @type {Map<string, Map<string, Documento>>} */
  const datos = new Map(COLECCIONES.map((c) => [c, new Map()]));
  const col = (/** @type {Coleccion} */ c) => /** @type {Map<string, Documento>} */ (datos.get(c));
  return {
    async obtener(c, id) { const d = col(c).get(id); return d && structuredClone(d); },
    async guardar(c, doc) { col(c).set(doc.id, structuredClone(doc)); },
    async listar(c) { return [...col(c).values()].map((d) => structuredClone(d)); },
    async borrar(c, id) { col(c).delete(id); },
    async actualizar(c, id, fn) {
      const nuevo = fn(col(c).get(id) && structuredClone(col(c).get(id)));
      col(c).set(id, structuredClone(nuevo));
      return nuevo;
    },
  };
}

/**
 * @param {IDBRequest} req
 * @returns {Promise<any>}
 */
const esperar = (req) => new Promise((ok, mal) => { req.onsuccess = () => ok(req.result); req.onerror = () => mal(req.error); });

/**
 * @param {string} nombre
 * @param {{ indexedDB?: IDBFactory }} [opciones]
 * @returns {Promise<Motor>}
 */
export async function motorIndexedDB(nombre = 'facturador', opciones = {}) {
  const idb = opciones.indexedDB ?? globalThis.indexedDB;
  const apertura = idb.open(nombre, 1);
  apertura.onupgradeneeded = () => {
    for (const c of COLECCIONES) {
      if (!apertura.result.objectStoreNames.contains(c)) apertura.result.createObjectStore(c, { keyPath: 'id' });
    }
  };
  /** @type {IDBDatabase} */
  const db = await esperar(apertura);
  const almacen = (/** @type {Coleccion} */ c, /** @type {IDBTransactionMode} */ modo) => db.transaction(c, modo).objectStore(c);
  return {
    obtener: (c, id) => esperar(almacen(c, 'readonly').get(id)),
    guardar: async (c, doc) => { await esperar(almacen(c, 'readwrite').put(doc)); },
    listar: (c) => esperar(almacen(c, 'readonly').getAll()),
    borrar: async (c, id) => { await esperar(almacen(c, 'readwrite').delete(id)); },
    actualizar: (c, id, fn) => new Promise((ok, mal) => {
      const tx = db.transaction(c, 'readwrite');
      const st = tx.objectStore(c);
      /** @type {Documento} */
      let nuevo;
      const lectura = st.get(id);
      lectura.onsuccess = () => {
        try { nuevo = fn(lectura.result); st.put(nuevo); } catch (e) { tx.abort(); mal(e); }
      };
      tx.oncomplete = () => ok(nuevo);
      tx.onerror = () => mal(tx.error);
    }),
  };
}
