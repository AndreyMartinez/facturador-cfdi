import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manejar } from '../src/index.js';

const ORIGEN = 'https://saviaraiz.github.io';
const HUELLA = 'a'.repeat(64);
const XML = '<cfdi:Comprobante Sello="QUJD" NoCertificado="30001000000500003416"><cfdi:Emisor Rfc="EKU9003173C9"/></cfdi:Comprobante>';
const XML_TIMBRADO = '<x><tfd:TimbreFiscalDigital UUID="6f1c2a3b-9d4e-4f10-8a7b-2c5d6e7f8a90"/></x>';

/** D1 en memoria con lo mínimo que usa el relevo. */
function d1() {
  /** @type {any[][]} */
  const filas = [];
  return {
    filas,
    prepare: (/** @type {string} */ sql) => ({
      bind: (/** @type {any[]} */ ...v) => ({
        first: async () => ({ n: filas.filter((f) => f[1] === v[0] && f[2] >= v[1]).length }),
        run: async () => { filas.push(v); },
      }),
    }),
  };
}

const entorno = (extra = {}) => ({
  ORIGENES_PERMITIDOS: ORIGEN, SW_USUARIO_SANDBOX: 'u', SW_CONTRASENA_SANDBOX: 'p', TOPE_DIARIO_SANDBOX: '2', DB: d1(), ...extra,
});

const pedir = (/** @type {any} */ cuerpo, origen = ORIGEN) => new Request('https://relevo.prueba/pac/timbrar', {
  method: 'POST', headers: { Origin: origen, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
});

/** fetch falso de SW; guarda lo que le llega para revisar que no se registre contenido. */
function swFalso() {
  /** @type {string[]} */
  const urls = [];
  const f = /** @type {typeof fetch} */ (async (url) => {
    urls.push(String(url));
    if (String(url).endsWith('/authenticate')) return Response.json({ status: 'success', data: { token: 'T' } });
    return Response.json({ status: 'success', data: { cfdi: XML_TIMBRADO } });
  });
  return { f, urls };
}

test('timbra en sandbox y guarda solo metadatos', async () => {
  const env = entorno();
  const sw = swFalso();
  const r = await manejar(pedir({ xml: XML, ambiente: 'sandbox', emisorId: 'em_demo', idempotencia: HUELLA }), env, { fetch: sw.f, ahora: () => new Date('2026-10-23T18:00:00Z') });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGEN);
  const cuerpo = /** @type {any} */ (await r.json());
  assert.equal(cuerpo.uuid, '6F1C2A3B-9D4E-4F10-8A7B-2C5D6E7F8A90');
  assert.ok(sw.urls[1].startsWith('https://services.test.sw.com.mx/'));
  assert.deepEqual(env.DB.filas, [['em_demo', 'sandbox', '2026-10-23T18:00:00.000Z', 'ok', HUELLA]]);
  assert.ok(!JSON.stringify(env.DB.filas).includes('EKU9003173C9'), 'no guarda RFC ni XML');
});

test('rechaza orígenes no permitidos', async () => {
  const r = await manejar(pedir({ xml: XML }, 'https://otro.sitio'), entorno());
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
});

test('responde el preflight CORS', async () => {
  const r = await manejar(new Request('https://relevo.prueba/pac/timbrar', { method: 'OPTIONS', headers: { Origin: ORIGEN } }), entorno());
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('Access-Control-Allow-Methods'), 'POST, GET, OPTIONS');
});

test('producción deshabilitada en la demo', async () => {
  const r = await manejar(pedir({ xml: XML, ambiente: 'produccion', emisorId: 'e', idempotencia: HUELLA }), entorno({ SW_USUARIO_PRODUCCION: 'u', SW_CONTRASENA_PRODUCCION: 'p' }));
  assert.equal(r.status, 403);
  assert.equal(/** @type {any} */ (await r.json()).codigo, 'AMBIENTE_NO_DISPONIBLE');
});

test('exige XML sellado, emisor y huella', async () => {
  for (const cuerpo of [{ xml: '<sin-sello/>', emisorId: 'e', idempotencia: HUELLA }, { xml: XML, idempotencia: HUELLA }, { xml: XML, emisorId: 'e', idempotencia: 'corta' }, null]) {
    const r = await manejar(pedir(cuerpo), entorno());
    assert.equal(r.status, 400, JSON.stringify(cuerpo));
  }
});

test('límite por IP y tope diario de la demo', async () => {
  const lleno = { limit: async () => ({ success: false }) };
  const r1 = await manejar(pedir({ xml: XML, emisorId: 'e', idempotencia: HUELLA }), entorno({ LIMITADOR: lleno }));
  assert.equal(r1.status, 429);

  const env = entorno();
  const sw = swFalso();
  const ahora = () => new Date('2026-10-23T18:00:00Z');
  for (let i = 0; i < 2; i++) await manejar(pedir({ xml: XML, emisorId: 'e', idempotencia: HUELLA }), env, { fetch: sw.f, ahora });
  const r2 = await manejar(pedir({ xml: XML, emisorId: 'e', idempotencia: HUELLA }), env, { fetch: sw.f, ahora });
  assert.equal(r2.status, 429);
  assert.equal(/** @type {any} */ (await r2.json()).codigo, 'LIMITE_ALCANZADO');
});

test('salud y rutas desconocidas', async () => {
  const s = await manejar(new Request('https://relevo.prueba/salud'), entorno());
  assert.equal(s.status, 200);
  const n = await manejar(new Request('https://relevo.prueba/otra'), entorno());
  assert.equal(n.status, 404);
});
