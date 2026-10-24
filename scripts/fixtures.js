// Descarga los recursos públicos de prueba fuera del repo, en ~/.cache/facturador/:
//   csd-prueba/EKU9003173C9.cer y .key  (CSD de prueba que publica SW; contraseña pública 12345678a)
//   xslt/cadenaoriginal_4_0.xslt         (XSLT oficial del SAT, sin complementos, solo para pruebas)
//   xsd/4/cfdv40.xsd y sus catálogos     (esquema oficial, para validar el XML en pruebas)
// Cada archivo se verifica con su SHA-256.
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CACHE = process.env.FACTURADOR_CACHE ?? join(homedir(), '.cache', 'facturador');
export const CSD_PRUEBA = {
  rfc: 'EKU9003173C9',
  contrasena: '12345678a',
  cer: join(CACHE, 'csd-prueba', 'EKU9003173C9.cer'),
  key: join(CACHE, 'csd-prueba', 'EKU9003173C9.key'),
};
export const XSLT_CADENA = join(CACHE, 'xslt', 'cadenaoriginal_4_0.xslt');
export const XSD_CFDI = join(CACHE, 'xsd', '4', 'cfdv40.xsd');

const ZIP_SW = 'https://developers.sw.com.mx/wp-content/uploads/2026/10/CSD-Pruebas-SW.zip';
const NOMBRE_EN_ZIP = 'CSD_Sucursal_1_EKU9003173C9_20230517_223850';
// Espejo de los recursos del SAT (sat.gob.mx rechaza descargas automáticas).
const ESPEJO_SAT = 'https://raw.githubusercontent.com/phpcfdi/resources-sat-xml/master/resources/www.sat.gob.mx/sitio_internet/cfd';

const HASHES = {
  cer: '92be3ef448e0fd01467f3b0cbd8e77b568d84ea58f22f5afa400b2ec99bbbb53',
  key: '2d6308aeb5bc6ded4930e2cafd6861f8f7f138e7dd0c27fa25d9138ccbe8b049',
  cadena: '11dafd930e26127fbbd6c5714067286e04d6468ed1f37e4ec5647e5f21894729',
  utilerias: 'd9ef68267747e0f6725295d4012684a4c051cb3f2265dcb2035d32bf40895016',
};

// Ruta en el espejo → SHA-256. Se guardan con la misma estructura para que los imports relativos funcionen.
const ESQUEMAS = {
  '4/cfdv40.xsd': 'd77f7cc7778c18f5b606809829a479de36d80b7eb3b3aba2111a15084ac03357',
  'catalogos/catCFDI.xsd': '46fe267a4b8f2782a3ae9c6086501a9fcf3c4033c309aaffae3382f95882c537',
  'tipoDatos/tdCFDI/tdCFDI.xsd': '8e3a54e0be41f7eef434904d5e405666be84b9977bc1fe2aa6552e78a0c524e6',
};

/** @param {Uint8Array} datos */
const sha256 = (datos) => createHash('sha256').update(datos).digest('hex');

/** @param {Uint8Array} datos @param {string} esperado @param {string} nombre */
function verificar(datos, esperado, nombre) {
  const real = sha256(datos);
  if (real !== esperado) throw new Error(`${nombre}: SHA-256 inesperado (${real}). ¿Cambió la fuente?`);
}

/** @param {string} url */
async function descargar(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo descargar ${url}: HTTP ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/** @param {string} ruta */
const existe = (ruta) => access(ruta).then(() => true, () => false);

async function csdPrueba() {
  if ((await existe(CSD_PRUEBA.cer)) && (await existe(CSD_PRUEBA.key))) return;
  const zip = await descargar(ZIP_SW);
  const tmp = join(tmpdir(), `facturador-zip-${process.pid}`);
  await mkdir(tmp, { recursive: true });
  await writeFile(join(tmp, 'csd.zip'), zip);
  execFileSync('unzip', ['-qjo', join(tmp, 'csd.zip'), `*${NOMBRE_EN_ZIP}.*`, '-d', tmp], { stdio: ['ignore', 'ignore', 'inherit'] });
  const cer = await readFile(join(tmp, `${NOMBRE_EN_ZIP}.cer`));
  const key = await readFile(join(tmp, `${NOMBRE_EN_ZIP}.key`));
  verificar(cer, HASHES.cer, 'cer');
  verificar(key, HASHES.key, 'key');
  await mkdir(join(CACHE, 'csd-prueba'), { recursive: true });
  await writeFile(CSD_PRUEBA.cer, cer);
  await writeFile(CSD_PRUEBA.key, key);
}

async function xsltCadena() {
  if (await existe(XSLT_CADENA)) return;
  const cadena = await descargar(`${ESPEJO_SAT}/4/cadenaoriginal_4_0/cadenaoriginal_4_0.xslt`);
  const utilerias = await descargar(`${ESPEJO_SAT}/2/cadenaoriginal_2_0/utilerias.xslt`);
  verificar(cadena, HASHES.cadena, 'cadenaoriginal_4_0.xslt');
  verificar(utilerias, HASHES.utilerias, 'utilerias.xslt');
  // Se quitan los includes de complementos (el subconjunto soportado no los usa)
  // y se apunta utilerias.xslt al archivo local.
  const texto = new TextDecoder().decode(cadena)
    .replace(/^\s*<xsl:include href="\.\.\/\.\.\/(?!2\/cadenaoriginal_2_0\/utilerias)[^"]+"\s*\/>\s*$/gm, '')
    .replace('../../2/cadenaoriginal_2_0/utilerias.xslt', 'utilerias.xslt');
  await mkdir(join(CACHE, 'xslt'), { recursive: true });
  await writeFile(XSLT_CADENA, texto);
  await writeFile(join(CACHE, 'xslt', 'utilerias.xslt'), utilerias);
}

async function esquemas() {
  for (const [ruta, hash] of Object.entries(ESQUEMAS)) {
    const destino = join(CACHE, 'xsd', ruta);
    if (await existe(destino)) continue;
    const datos = await descargar(`${ESPEJO_SAT}/${ruta}`);
    verificar(datos, hash, ruta);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, datos);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await csdPrueba();
  await xsltCadena();
  await esquemas();
  console.log(`✓ Recursos de prueba en ${CACHE}`);
}
