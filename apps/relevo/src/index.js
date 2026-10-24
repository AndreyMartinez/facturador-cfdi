// Relevo sin estado. Recibe XML ya sellado y lo pasa al PAC; guarda solo metadatos.
// Nunca registra el XML, RFC ni tokens.
import { clienteSw, URLS_SW } from '@facturador/pac/sw-sapien';

export const VERSION = '0.1.0';
const TAMANO_MAXIMO = 100_000;

/**
 * @typedef {object} Entorno
 * @property {string} ORIGENES_PERMITIDOS  separados por coma
 * @property {string} [PRODUCCION_HABILITADA]
 * @property {string} [TOPE_DIARIO_SANDBOX]
 * @property {string} [SW_USUARIO_SANDBOX]
 * @property {string} [SW_CONTRASENA_SANDBOX]
 * @property {string} [SW_USUARIO_PRODUCCION]
 * @property {string} [SW_CONTRASENA_PRODUCCION]
 * @property {any} [DB]         D1
 * @property {{ limit: (o: { key: string }) => Promise<{ success: boolean }> }} [LIMITADOR]
 */

/**
 * @param {Request} req @param {Entorno} env
 * @returns {Record<string, string>}
 */
function cors(req, env) {
  const origen = req.headers.get('Origin') ?? '';
  const permitidos = env.ORIGENES_PERMITIDOS.split(',').map((s) => s.trim());
  if (!permitidos.includes(origen)) return {};
  return { 'Access-Control-Allow-Origin': origen, 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
}

/** @param {unknown} cuerpo @param {number} status @param {Record<string, string>} encabezados */
const json = (cuerpo, status, encabezados) => new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json', ...encabezados } });

/** @param {string} codigo @param {string} mensaje @param {boolean} reintentable */
const fallo = (codigo, mensaje, reintentable = false) => ({ ok: false, codigo, mensaje, reintentable });

/**
 * @param {Request} req
 * @param {Entorno} env
 * @param {{ fetch?: typeof fetch, ahora?: () => Date }} [deps]
 */
export async function manejar(req, env, deps = {}) {
  const url = new URL(req.url);
  const enc = cors(req, env);
  if (!enc['Access-Control-Allow-Origin'] && req.headers.get('Origin')) return json(fallo('ORIGEN_NO_PERMITIDO', 'Origen no permitido.'), 403, {});
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: enc });

  if (url.pathname === '/salud' && req.method === 'GET') {
    return json({ ok: true, version: VERSION, produccion: env.PRODUCCION_HABILITADA === 'si' }, 200, enc);
  }

  if (url.pathname === '/pac/timbrar' && req.method === 'POST') {
    const largo = Number(req.headers.get('Content-Length') ?? 0);
    if (largo > TAMANO_MAXIMO) return json(fallo('XML_MUY_GRANDE', 'La factura excede el tamaño permitido.'), 413, enc);
    /** @type {any} */
    const cuerpo = await req.json().catch(() => null);
    if (!cuerpo || typeof cuerpo.xml !== 'string' || cuerpo.xml.length > TAMANO_MAXIMO) return json(fallo('PETICION_INVALIDA', 'Petición inválida.'), 400, enc);
    if (!/\sSello="[^"]+"/.test(cuerpo.xml) || !/\sNoCertificado="\d{20}"/.test(cuerpo.xml)) {
      return json(fallo('PETICION_INVALIDA', 'El XML debe llegar sellado.'), 400, enc);
    }
    const ambiente = cuerpo.ambiente === 'produccion' ? 'produccion' : 'sandbox';
    const emisorId = String(cuerpo.emisorId ?? '').slice(0, 64);
    const idempotencia = String(cuerpo.idempotencia ?? '').slice(0, 64);
    if (!emisorId || !/^[0-9a-f]{64}$/.test(idempotencia)) return json(fallo('PETICION_INVALIDA', 'Faltan emisor o huella.'), 400, enc);

    const usuario = ambiente === 'produccion' ? env.SW_USUARIO_PRODUCCION : env.SW_USUARIO_SANDBOX;
    const contrasena = ambiente === 'produccion' ? env.SW_CONTRASENA_PRODUCCION : env.SW_CONTRASENA_SANDBOX;
    if ((ambiente === 'produccion' && env.PRODUCCION_HABILITADA !== 'si') || !usuario || !contrasena) {
      return json(fallo('AMBIENTE_NO_DISPONIBLE', 'Este ambiente no está disponible.'), 403, enc);
    }

    const ip = req.headers.get('CF-Connecting-IP') ?? 'desconocida';
    if (env.LIMITADOR && !(await env.LIMITADOR.limit({ key: `timbrar:${ip}` })).success) {
      return json(fallo('LIMITE_ALCANZADO', 'Demasiadas facturas en poco tiempo.', true), 429, enc);
    }
    const ahora = (deps.ahora ?? (() => new Date()))();
    const dia = ahora.toISOString().slice(0, 10);
    if (ambiente === 'sandbox' && env.DB) {
      const fila = await env.DB.prepare('SELECT COUNT(*) AS n FROM timbres WHERE ambiente = ? AND fecha >= ?').bind('sandbox', dia).first();
      if (Number(fila?.n ?? 0) >= Number(env.TOPE_DIARIO_SANDBOX ?? 300)) {
        return json(fallo('LIMITE_ALCANZADO', 'Se alcanzó el límite diario de la demo.'), 429, enc);
      }
    }

    const sw = clienteSw({ url: URLS_SW[ambiente], usuario, contrasena, fetch: deps.fetch });
    const r = await sw.timbrar(cuerpo.xml);
    if (env.DB) {
      await env.DB.prepare('INSERT INTO timbres (emisor_id, ambiente, fecha, resultado, idempotencia) VALUES (?, ?, ?, ?, ?)')
        .bind(emisorId, ambiente, ahora.toISOString(), r.ok ? (r.duplicado ? 'duplicado' : 'ok') : r.codigo, idempotencia).run();
    }
    const status = r.ok ? 200 : r.codigo === 'RED_NO_DISPONIBLE' ? 502 : 422;
    return json(r, status, enc);
  }

  return json(fallo('NO_ENCONTRADO', 'Ruta no encontrada.'), 404, enc);
}

export default {
  /** @param {Request} req @param {Entorno} env */
  fetch: (req, env) => manejar(req, env),
};
