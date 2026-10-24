// Venta de ejemplo → borrador → XML → cadena → sello en "navegador" (WebCrypto),
// verificado con el certificado y validado contra el esquema oficial del SAT.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createVerify, X509Certificate } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CSD_PRUEBA, XSD_CFDI } from '../../../scripts/fixtures.js';
import { crearBorrador, sellar } from '@facturador/nucleo';
import { abrirCsd } from '../src/index.js';
import datos from '../../../fixtures/ventas/referencia.json' with { type: 'json' };

const { emisor, ventas } = /** @type {any} */ (datos);
const sinCsd = existsSync(CSD_PRUEBA.cer) ? false : 'requiere `npm run fixtures`';
let hayXmllint = false;
try { execFileSync('xmllint', ['--version'], { stdio: 'ignore' }); hayXmllint = true; } catch {}

const casos = [['198.00', ventas[0]], ['188.10', ventas[1]], ['público en general', { ...ventas[1], receptor: null }]];

for (const [nombre, venta] of casos) {
  test(`factura sellada y verificable: ${nombre}`, { skip: sinCsd }, async () => {
    const cer = new Uint8Array(readFileSync(CSD_PRUEBA.cer));
    const firmador = await abrirCsd({ cer, key: new Uint8Array(readFileSync(CSD_PRUEBA.key)), contrasena: CSD_PRUEBA.contrasena });
    const { comprobante, errores } = crearBorrador(venta, emisor, { fecha: new Date('2026-10-23T18:41:03Z'), serie: 'A', folio: 1 });
    assert.deepEqual(errores, []);

    const r = await sellar(comprobante, firmador, { ahora: new Date('2026-10-23T18:41:03Z') });
    const ok = createVerify('sha256').update(r.cadena, 'utf8').verify(new X509Certificate(cer).publicKey, r.sello, 'base64');
    assert.ok(ok, 'el sello se verifica con el .cer');
    assert.equal(r.noCertificado, '30001000000500003416');
    assert.match(r.xml, new RegExp(`Total="${venta.total}"`));

    if (hayXmllint && existsSync(XSD_CFDI)) {
      const dir = mkdtempSync(join(tmpdir(), 'cfdi-'));
      writeFileSync(join(dir, 'cfdi.xml'), r.xml);
      execFileSync('xmllint', ['--noout', '--schema', XSD_CFDI, join(dir, 'cfdi.xml')], { stdio: 'pipe' });
    }
  });
}
