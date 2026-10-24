// Build estático portable: base relativa + rutas por hash = funciona en GitHub Pages o en cualquier hosting.
import { defineConfig, loadEnv } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { CSD_PRUEBA } from '../../scripts/fixtures.js';

/** Sirve (dev) y copia (build) el CSD público de prueba del SAT para la demo. Vive fuera del repo. */
function csdDemo() {
  const archivos = { 'demo/EKU9003173C9.cer': CSD_PRUEBA.cer, 'demo/EKU9003173C9.key': CSD_PRUEBA.key };
  return {
    name: 'csd-demo',
    configureServer(/** @type {any} */ server) {
      server.middlewares.use((/** @type {any} */ req, /** @type {any} */ res, /** @type {any} */ next) => {
        const ruta = Object.entries(archivos).find(([k]) => req.url?.endsWith(k))?.[1];
        if (!ruta || !existsSync(ruta)) return next();
        res.setHeader('Content-Type', 'application/octet-stream');
        res.end(readFileSync(ruta));
      });
    },
    generateBundle() {
      for (const [destino, origen] of Object.entries(archivos)) {
        if (!existsSync(origen)) {
          this.warn(`No está ${origen}. Ejecuta \`npm run fixtures\` para incluir el CSD de prueba en la demo.`);
          continue;
        }
        this.emitFile({ type: 'asset', fileName: destino, source: readFileSync(origen) });
      }
    },
  };
}

/** CSP por <meta>: GitHub Pages no permite encabezados. Solo en el build (Vite dev usa scripts en línea). */
function csp(/** @type {string} */ relevo) {
  const politica = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "frame-src blob:",
    `connect-src 'self'${relevo ? ` ${new URL(relevo).origin}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
  return {
    name: 'csp',
    apply: /** @type {const} */ ('build'),
    transformIndexHtml: (/** @type {string} */ html) => html.replace('<!--CSP-->', `<meta http-equiv="Content-Security-Policy" content="${politica}">`),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    base: './',
    plugins: [csdDemo(), csp(env.VITE_RELEVO_URL ?? '')],
    build: { target: 'es2022', sourcemap: true },
  };
});
