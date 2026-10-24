// Estado global mínimo con suscripción; los componentes lo leen con useEstado().
import { useEffect, useState } from 'preact/hooks';

/**
 * @typedef {object} Estado
 * @property {boolean} listo
 * @property {import('@facturador/nucleo/puertos').Emisor | null} emisor
 * @property {import('@facturador/nucleo/puertos').Firmador | null} firmador
 * @property {string} csdOrigen        'demo' | 'cargado' | ''
 * @property {'simulado' | 'relevo'} modoPac
 * @property {string} ruta
 * @property {number} version           sube cuando cambian datos guardados
 * @property {unknown} error
 */

/** @type {Estado} */
let actual = { listo: false, emisor: null, firmador: null, csdOrigen: '', modoPac: 'simulado', ruta: location.hash || '#/', version: 0, error: null };
/** @type {Set<(e: Estado) => void>} */
const oyentes = new Set();

export const leer = () => actual;

/** @param {Partial<Estado>} cambios */
export function cambiar(cambios) {
  actual = { ...actual, ...cambios };
  for (const o of oyentes) o(actual);
}

/** Avisa que hay datos nuevos en el almacén. */
export const refrescar = () => cambiar({ version: actual.version + 1 });

export function useEstado() {
  const [e, setE] = useState(actual);
  useEffect(() => { oyentes.add(setE); setE(actual); return () => { oyentes.delete(setE); }; }, []);
  return e;
}

/**
 * Carga datos asíncronos y los vuelve a cargar cuando cambia el almacén.
 * @template T
 * @param {() => Promise<T>} cargar
 * @param {unknown[]} [deps]
 * @returns {{ datos: T | undefined, error: unknown, cargando: boolean }}
 */
export function useDatos(cargar, deps = []) {
  const { version } = useEstado();
  const [r, setR] = useState(/** @type {{ datos: T | undefined, error: unknown, cargando: boolean }} */ ({ datos: undefined, error: null, cargando: true }));
  useEffect(() => {
    let vivo = true;
    cargar().then((datos) => vivo && setR({ datos, error: null, cargando: false }), (error) => vivo && setR({ datos: undefined, error, cargando: false }));
    return () => { vivo = false; };
  }, [version, ...deps]);
  return r;
}
