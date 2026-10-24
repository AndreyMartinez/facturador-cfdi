// Cliente del relevo para el navegador: cumple la interfaz Pac del núcleo.
// Reintentar es seguro: se reenvía el mismo XML sellado y el PAC detecta el duplicado.
import { ErrorFactura } from '@facturador/nucleo';

/**
 * Huella del XML sellado (clave de idempotencia).
 * @param {string} xml
 */
export async function huella(xml) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(xml));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {{ url: string, fetch?: typeof fetch, intentos?: number, espera?: (ms: number) => Promise<void> }} config
 * @returns {import('@facturador/nucleo/puertos').Pac}
 */
export function pacRelevo(config) {
  const f = config.fetch ?? fetch;
  const intentos = config.intentos ?? 3;
  const espera = config.espera ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  return {
    async timbrar(xmlSellado, { ambiente, emisorId, idempotencia }) {
      /** @type {any} */
      let ultimo;
      for (let i = 0; i < intentos; i++) {
        if (i) await espera(500 * 2 ** i);
        let r;
        try {
          r = await f(`${config.url}/pac/timbrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xml: xmlSellado, ambiente, emisorId, idempotencia }),
          });
        } catch (e) {
          ultimo = { codigo: 'RED_NO_DISPONIBLE', detalleTecnico: String(e), reintentable: true };
          continue;
        }
        const cuerpo = /** @type {any} */ (await r.json().catch(() => ({ ok: false, codigo: 'RED_NO_DISPONIBLE', reintentable: true })));
        if (cuerpo.ok) return { xmlTimbrado: cuerpo.xmlTimbrado, uuid: cuerpo.uuid };
        ultimo = cuerpo;
        if (!cuerpo.reintentable) break;
      }
      throw new ErrorFactura(ultimo?.codigo ?? 'RED_NO_DISPONIBLE', {
        detalleTecnico: ultimo?.detalleTecnico,
        ...(ultimo?.codigo === 'PAC_RECHAZO' || ultimo?.codigo === 'PAC_DUPLICADO' ? { mensaje: ultimo.mensaje } : {}),
      });
    },
  };
}
