// Adaptador de SW Sapien (SmarterWeb). Corre en el relevo, nunca en el navegador:
// necesita usuario y contraseña del PAC.
// Referencia: SDK oficial lunasoft/sw-sdk-nodejs (Authentication y Stamp v4).
import { uuidDe } from './respuesta.js';

/** @typedef {import('./respuesta.js').RespuestaTimbrado} RespuestaTimbrado */

export const URLS_SW = {
  sandbox: 'https://services.test.sw.com.mx',
  produccion: 'https://services.sw.com.mx',
};

/**
 * @param {{ url: string, usuario?: string, contrasena?: string, token?: string, fetch?: typeof fetch }} config
 */
export function clienteSw(config) {
  const f = config.fetch ?? fetch;
  let token = config.token;

  async function autenticar() {
    const r = await f(`${config.url}/v2/security/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: config.usuario, password: config.contrasena }),
    });
    const cuerpo = /** @type {any} */ (await r.json().catch(() => ({})));
    if (!r.ok || !cuerpo?.data?.token) throw new Error(`Autenticación con SW falló: ${cuerpo?.message ?? r.status}`);
    token = cuerpo.data.token;
    return token;
  }

  /** @param {string} xmlSellado @returns {Promise<Response>} */
  async function enviar(xmlSellado) {
    const form = new FormData();
    form.append('xml', new Blob([xmlSellado], { type: 'text/xml' }), 'xml');
    return f(`${config.url}/cfdi33/stamp/v4`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  }

  return {
    /** @param {string} xmlSellado @returns {Promise<RespuestaTimbrado>} */
    async timbrar(xmlSellado) {
      try {
        if (!token) await autenticar();
        let r = await enviar(xmlSellado);
        if (r.status === 401 && config.usuario) { await autenticar(); r = await enviar(xmlSellado); }
        const cuerpo = /** @type {any} */ (await r.json().catch(() => null));
        return interpretar(r.status, cuerpo);
      } catch (e) {
        return { ok: false, codigo: 'RED_NO_DISPONIBLE', mensaje: 'El PAC no respondió.', detalleTecnico: String(e), reintentable: true };
      }
    },
  };
}

/**
 * Traduce la respuesta de SW a la forma común.
 * @param {number} status
 * @param {any} cuerpo
 * @returns {RespuestaTimbrado}
 */
export function interpretar(status, cuerpo) {
  const xml = cuerpo?.data?.cfdi;
  if (cuerpo?.status === 'success' && xml) return { ok: true, xmlTimbrado: xml, uuid: (cuerpo.data.uuid ?? uuidDe(xml)).toUpperCase() };

  const mensaje = String(cuerpo?.message ?? `HTTP ${status}`);
  const detalle = cuerpo?.messageDetail ? String(cuerpo.messageDetail) : undefined;
  // 307: el comprobante ya tenía timbre. Si SW regresa el XML previo, es éxito (reintento seguro). (verificar en sandbox)
  if (/^307\b/.test(mensaje)) {
    if (xml) return { ok: true, xmlTimbrado: xml, uuid: uuidDe(xml), duplicado: true };
    return { ok: false, codigo: 'PAC_DUPLICADO', mensaje: 'Este comprobante ya se había timbrado.', detalleTecnico: [mensaje, detalle].filter(Boolean).join(' · '), reintentable: false };
  }
  if (status >= 500 || status === 0) {
    return { ok: false, codigo: 'RED_NO_DISPONIBLE', mensaje: 'El PAC no está disponible.', detalleTecnico: mensaje, reintentable: true };
  }
  const codigoSat = /(CFDI\d{5}|CRP\d{5}|\b\d{3}\b)/.exec(mensaje)?.[1];
  return {
    ok: false,
    codigo: 'PAC_RECHAZO',
    mensaje: codigoSat ? `El PAC rechazó la factura (${codigoSat}).` : 'El PAC rechazó la factura.',
    detalleTecnico: [mensaje, detalle].filter(Boolean).join(' · '),
    reintentable: false,
  };
}
