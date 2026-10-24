// Revisa que el repositorio no contenga CSD, llaves ni RFC reales.
// Uso: node scripts/revisar-secretos.js <directorio>
import { readdir, readFile } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXTENSIONES_PROHIBIDAS = new Set(['.cer', '.key', '.pfx', '.p12', '.pem']);
const CARPETAS_IGNORADAS = new Set(['.git', 'node_modules', 'dist', '.wrangler', '.cache']);
const EXTENSIONES_TEXTO = new Set(['.js', '.mjs', '.json', '.md', '.html', '.css', '.txt', '.yml', '.yaml', '.toml', '.sql', '.xml', '']);

// RFC de prueba publicados por el SAT y los PAC, y el genérico de público en general.
export const RFC_PERMITIDOS = new Set([
  'XAXX010101000', 'XEXX010101000',
  'EKU9003173C9', 'URE180429TM6', 'AAA010101AAA', 'XIA190128J61', 'IIA040805DZ4',
]);

const PATRON_RFC = /\b[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}\b/g;

/**
 * @param {string} raiz
 * @returns {Promise<{ archivo: string, motivo: string }[]>}
 */
export async function revisar(raiz) {
  /** @type {{ archivo: string, motivo: string }[]} */
  const hallazgos = [];
  /** @param {string} dir */
  async function recorrer(dir) {
    for (const entrada of await readdir(dir, { withFileTypes: true })) {
      const ruta = join(dir, entrada.name);
      if (entrada.isDirectory()) {
        if (!CARPETAS_IGNORADAS.has(entrada.name)) await recorrer(ruta);
        continue;
      }
      const ext = extname(entrada.name).toLowerCase();
      const archivo = relative(raiz, ruta);
      if (EXTENSIONES_PROHIBIDAS.has(ext)) {
        hallazgos.push({ archivo, motivo: `archivo ${ext} (certificado o llave)` });
        continue;
      }
      if (!EXTENSIONES_TEXTO.has(ext) || entrada.name === 'package-lock.json') continue;
      const texto = await readFile(ruta, 'utf8');
      for (const [rfc] of texto.matchAll(PATRON_RFC)) {
        if (!RFC_PERMITIDOS.has(rfc)) hallazgos.push({ archivo, motivo: `RFC no permitido: ${rfc}` });
      }
    }
  }
  await recorrer(raiz);
  return hallazgos;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const hallazgos = await revisar(process.argv[2] ?? '.');
  for (const h of hallazgos) console.error(`✕ ${h.archivo}: ${h.motivo}`);
  if (hallazgos.length) {
    console.error(`\n${hallazgos.length} hallazgo(s). Los secretos y datos de clientes van fuera del repo.`);
    process.exit(1);
  }
  console.log('✓ Sin secretos ni RFC reales.');
}
