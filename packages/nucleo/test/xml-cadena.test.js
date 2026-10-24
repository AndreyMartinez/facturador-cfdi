import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { crearBorrador } from '../src/borrador.js';
import { generarXml, escapar } from '../src/xml.js';
import { cadenaOriginal } from '../src/cadena.js';
import { sellar } from '../src/sellar.js';
import { formatoTotalQr, urlVerificacion } from '../src/qr.js';
import datos from '../../../fixtures/ventas/referencia.json' with { type: 'json' };

const { emisor, ventas } = /** @type {any} */ (datos);
const fecha = new Date('2026-10-23T18:41:03Z');
const cert = { noCertificado: '30001000000500003416' };
const b198 = crearBorrador(ventas[0], emisor, { fecha, serie: 'A', folio: 13 }).comprobante;
const bPublico = crearBorrador({ ...ventas[1], receptor: null }, emisor, { fecha }).comprobante;

test('XML con namespaces, versión y totales', () => {
  const xml = generarXml(b198, cert);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<cfdi:Comprobante xmlns:cfdi="http:\/\/www.sat.gob.mx\/cfd\/4"/);
  assert.match(xml, / Version="4.0" Serie="A" Folio="13" Fecha="2026-10-23T12:41:03" FormaPago="31"/);
  assert.match(xml, /SubTotal="170.69" Moneda="MXN" Total="198.00" TipoDeComprobante="I" Exportacion="01"/);
  assert.match(xml, /<cfdi:Impuestos TotalImpuestosTrasladados="27.31"><cfdi:Traslados><cfdi:Traslado Base="170.69"/);
  assert.doesNotMatch(xml, /Sello=/);
});

test('escapa caracteres especiales', () => {
  assert.equal(escapar('A&B <"x">'), 'A&amp;B &lt;&quot;x&quot;&gt;');
});

test('cadena original del caso de 198.00', () => {
  assert.equal(cadenaOriginal(b198, cert),
    '||4.0|A|13|2026-10-23T12:41:03|31|30001000000500003416|170.69|MXN|198.00|I|01|PUE|42501'
    + '|EKU9003173C9|ESCUELA KEMPER URGATE|601'
    + '|URE180429TM6|UNIVERSIDAD ROBOTICA ESPAÑOLA|65000|601|G01'
    + '|52151600|1|H87|Pieza|Organizador de cubiertos|170.689655|170.689655|02'
    + '|170.689655|002|Tasa|0.160000|27.310345'
    + '|170.69|002|Tasa|0.160000|27.31|27.31||');
});

test('cadena normaliza espacios como normalize-space()', () => {
  const c = structuredClone(b198);
  c.conceptos[0].descripcion = '  Organizador   de\tcubiertos ';
  assert.match(cadenaOriginal(c, cert), /\|Organizador de cubiertos\|/);
});

// Prueba de oro: la cadena debe ser idéntica a la que produce la XSLT oficial del SAT.
const XSLT = join(process.env.FACTURADOR_CACHE ?? join(homedir(), '.cache', 'facturador'), 'xslt', 'cadenaoriginal_4_0.xslt');
let hayXsltproc = false;
try { execFileSync('xsltproc', ['--version'], { stdio: 'ignore' }); hayXsltproc = true; } catch {}
const sinOro = !hayXsltproc || !existsSync(XSLT) ? 'requiere xsltproc y `npm run fixtures`' : false;

for (const [nombre, comprobante] of [['198.00', b198], ['público en general', bPublico], ['caracteres especiales', {
  ...b198, conceptos: [{ ...b198.conceptos[0], descripcion: 'Tazón "grande" & <tapa>  ñandú', noIdentificacion: 'SKU-01' }],
}]]) {
  test(`oro: cadena igual a la XSLT del SAT (${nombre})`, { skip: sinOro }, () => {
    const dir = mkdtempSync(join(tmpdir(), 'cadena-'));
    const archivo = join(dir, 'cfdi.xml');
    writeFileSync(archivo, generarXml(/** @type {any} */ (comprobante), cert));
    const oficial = execFileSync('xsltproc', [XSLT, archivo], { encoding: 'utf8' });
    assert.equal(cadenaOriginal(/** @type {any} */ (comprobante), cert), oficial);
  });
}

test('sellar usa la cadena y agrega Sello, NoCertificado y Certificado', async () => {
  const firmador = {
    certificado: () => ({ noCertificado: cert.noCertificado, certificadoB64: 'Q0VSVA==', rfc: 'EKU9003173C9',
      vigenteDesde: new Date('2023-01-01'), vigenteHasta: new Date('2027-05-18') }),
    firmar: async (/** @type {string} */ cadena) => Buffer.from(`firma:${cadena.length}`).toString('base64'),
  };
  const r = await sellar(b198, firmador, { ahora: fecha });
  assert.equal(r.cadena, cadenaOriginal(b198, cert));
  assert.match(r.xml, new RegExp(`Sello="${r.sello}" FormaPago="31" NoCertificado="30001000000500003416" Certificado="Q0VSVA=="`));
  await assert.rejects(sellar(b198, firmador, { ahora: new Date('2028-01-01') }), { codigo: 'CSD_VENCIDO' });
  await assert.rejects(sellar({ ...b198, emisor: { ...b198.emisor, rfc: 'URE180429TM6' } }, firmador, { ahora: fecha }), { codigo: 'CSD_NO_COINCIDE' });
});

test('URL del QR del SAT', () => {
  assert.equal(formatoTotalQr('198.00'), '198.0');
  assert.equal(formatoTotalQr('188.10'), '188.1');
  assert.equal(formatoTotalQr('0001160.123456'), '1160.123456');
  assert.equal(urlVerificacion({ uuid: '6f1c2a3b-9d4e-4f10-8a7b-2c5d6e7f8a90', rfcEmisor: 'EKU9003173C9', rfcReceptor: 'URE180429TM6', total: '198.00', sello: 'xxxxABCDEFGH' }),
    'https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=6F1C2A3B-9D4E-4F10-8A7B-2C5D6E7F8A90&re=EKU9003173C9&rr=URE180429TM6&tt=198.0&fe=ABCDEFGH');
});
