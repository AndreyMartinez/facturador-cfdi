// Rutas por hash: funcionan en cualquier hosting estático sin reglas de reescritura.
import { cambiar } from './estado.js';

/** @param {string} hash */
export function resolver(hash) {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [nombre = '', ...params] = partes;
  return { nombre, params };
}

/** @param {string} ruta */
export const ir = (ruta) => { location.hash = ruta; };

export function escucharRutas() {
  addEventListener('hashchange', () => { cambiar({ ruta: location.hash || '#/' }); scrollTo(0, 0); });
}
