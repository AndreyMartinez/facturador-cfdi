import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clienteSw, interpretar } from '../src/sw-sapien.js';
import { pacRelevo, huella } from '../src/relevo.js';
import { uuidDe } from '../src/respuesta.js';

const UUID = '6F1C2A3B-9D4E-4F10-8A7B-2C5D6E7F8A90';
const XML_TIMBRADO = `<cfdi:Comprobante><cfdi:Complemento><tfd:TimbreFiscalDigital Version="1.1" UUID="${UUID.toLowerCase()}"/></cfdi:Complemento></cfdi:Comprobante>`;
const json = (/** @type {any} */ cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

test('UUID del timbre', () => assert.equal(uuidDe(XML_TIMBRADO), UUID));

test('SW: autentica, timbra y regresa el XML', async () => {
  /** @type {string[]} */
  const llamadas = [];
  const sw = clienteSw({
    url: 'https://sw.prueba', usuario: 'u', contrasena: 'p',
    fetch: async (url, init) => {
      llamadas.push(String(url));
      if (String(url).endsWith('/v2/security/authenticate')) {
        assert.deepEqual(JSON.parse(String(init?.body)), { user: 'u', password: 'p' });
        return json({ status: 'success', data: { token: 'T' } });
      }
      assert.equal(/** @type {any} */ (init?.headers).Authorization, 'Bearer T');
      const xml = await /** @type {Blob} */ (/** @type {FormData} */ (init?.body).get('xml')).text();
      assert.equal(xml, '<sellado/>');
      return json({ status: 'success', data: { cfdi: XML_TIMBRADO, uuid: UUID.toLowerCase() } });
    },
  });
  const r = await sw.timbrar('<sellado/>');
  assert.deepEqual(r, { ok: true, xmlTimbrado: XML_TIMBRADO, uuid: UUID });
  assert.deepEqual(llamadas, ['https://sw.prueba/v2/security/authenticate', 'https://sw.prueba/cfdi33/stamp/v4']);
});

test('SW: rechazo del SAT con código CFDI40xxx', () => {
  const r = interpretar(400, { status: 'error', message: 'CFDI40147 - El campo UsoCFDI no contiene un valor permitido', messageDetail: 'detalle' });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.codigo, 'PAC_RECHAZO');
    assert.match(r.mensaje, /CFDI40147/);
    assert.equal(r.reintentable, false);
  }
});

test('SW: duplicado con XML previo es éxito; sin XML es error no reintentable', () => {
  assert.deepEqual(interpretar(400, { status: 'error', message: '307. El comprobante contiene un timbre previo.', data: { cfdi: XML_TIMBRADO } }),
    { ok: true, xmlTimbrado: XML_TIMBRADO, uuid: UUID, duplicado: true });
  const r = interpretar(400, { status: 'error', message: '307. El comprobante contiene un timbre previo.' });
  assert.equal(r.ok ? '' : r.codigo, 'PAC_DUPLICADO');
});

test('SW: error 5xx o caída de red se puede reintentar', async () => {
  const r1 = interpretar(503, null);
  assert.equal(r1.ok ? null : r1.reintentable, true);
  const sw = clienteSw({ url: 'x', token: 'T', fetch: async () => { throw new TypeError('fetch failed'); } });
  const r2 = await sw.timbrar('<x/>');
  assert.equal(r2.ok ? '' : r2.codigo, 'RED_NO_DISPONIBLE');
});

test('relevo: reintenta con el mismo XML y la misma huella hasta tener éxito', async () => {
  /** @type {any[]} */
  const cuerpos = [];
  let n = 0;
  const pac = pacRelevo({
    url: 'https://relevo.prueba', espera: async () => {},
    fetch: async (_url, init) => {
      cuerpos.push(JSON.parse(String(init?.body)));
      n++;
      if (n === 1) throw new TypeError('sin red');
      if (n === 2) return json({ ok: false, codigo: 'RED_NO_DISPONIBLE', reintentable: true }, 502);
      return json({ ok: true, xmlTimbrado: XML_TIMBRADO, uuid: UUID });
    },
  });
  const r = await pac.timbrar('<sellado/>', { ambiente: 'sandbox', emisorId: 'em_1', idempotencia: await huella('<sellado/>') });
  assert.equal(r.uuid, UUID);
  assert.equal(cuerpos.length, 3);
  assert.ok(cuerpos.every((c) => c.xml === '<sellado/>' && c.idempotencia === cuerpos[0].idempotencia));
});

test('relevo: un rechazo no se reintenta y llega como ErrorFactura', async () => {
  let n = 0;
  const pac = pacRelevo({
    url: 'x', espera: async () => {},
    fetch: async () => { n++; return json({ ok: false, codigo: 'PAC_RECHAZO', mensaje: 'El PAC rechazó la factura (CFDI40147).', reintentable: false }, 422); },
  });
  await assert.rejects(pac.timbrar('<x/>', { ambiente: 'sandbox', emisorId: 'e', idempotencia: 'h' }), { codigo: 'PAC_RECHAZO', message: /CFDI40147/ });
  assert.equal(n, 1);
});

test('PAC simulado: agrega un TFD marcado y repite el mismo resultado ante un reintento', async () => {
  const { pacSimulado } = await import('../src/simulado.js');
  const pac = pacSimulado({ ahora: () => new Date('2026-10-23T18:41:04Z'), uuid: () => UUID });
  const xml = '<cfdi:Comprobante Sello="ABC"><cfdi:Emisor/></cfdi:Comprobante>';
  const r = await pac.timbrar(xml, { ambiente: 'sandbox', emisorId: 'e', idempotencia: 'h1' });
  assert.equal(uuidDe(r.xmlTimbrado), UUID);
  assert.match(r.xmlTimbrado, /Leyenda="SIMULADO, SIN VALIDEZ"/);
  assert.match(r.xmlTimbrado, /SelloCFD="ABC"/);
  assert.deepEqual(await pac.timbrar(xml, { ambiente: 'sandbox', emisorId: 'e', idempotencia: 'h1' }), r);
});
