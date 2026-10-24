# Arquitectura

Diseño completo y decisiones (D1–D10):
[specs/plataforma-low-cost/design.md](specs/plataforma-low-cost/design.md).

## En una frase

Un **sitio estático** hace toda la facturación en el navegador; un **relevo**
sin estado en Cloudflare Workers solo pasa el XML ya sellado al PAC. Costo fijo:
$0. Costo variable: el timbre.

```
Navegador (GitHub Pages)                                   Cloudflare Workers
┌──────────────────────────────────────────────┐          ┌──────────────────┐
│ fuentes → nucleo (borrador, XML, cadena)     │  XML     │ relevo           │   REST
│        → firmador-webcrypto (sello)          │ sellado  │ CORS, límite,    │ ──────► PAC
│        → pac (cliente del relevo)  ──────────┼────────► │ secretos del PAC │
│        → pdf → almacen (IndexedDB)           │          │ D1: metadatos    │
└──────────────────────────────────────────────┘          └──────────────────┘
```

## Capas

| Capa | Paquete | Regla |
|---|---|---|
| Núcleo | `packages/nucleo` | Puro: sin DOM, `fs` ni red. Corre igual en navegador, Node y Worker. |
| Adaptadores | `firmador-*`, `almacen`, `fuentes`, `pac`, `pdf` | Cumplen las interfaces de `nucleo/src/puertos.js`. Cambiar de PAC, de almacén o de fuente = otro adaptador. |
| Apps | `apps/web`, `apps/relevo` | Solo conectan piezas. `apps/web/src/flujo.js` es el flujo de una factura, sin interfaz y con pruebas. |

## Stack y dependencias

Pocas dependencias, cada una justificada. Versiones exactas en `package-lock.json`.

| Paquete | Dónde | Por qué | Tamaño (gzip) |
|---|---|---|---|
| `node-forge` 1.4.0 | firmador-webcrypto | La `.key` del SAT es PKCS#8 cifrado con PBES2 + 3DES; WebCrypto no implementa 3DES. Forge solo descifra; la firma la hace WebCrypto con llave no exportable. Se carga solo al abrir un CSD. | ~75 KB |
| `jspdf` 4.2.1 | pdf | PDF en el navegador sin servidor. Se carga solo al timbrar. | ~130 KB |
| `qrcode` 1.5.4 | pdf | QR del SAT; se dibuja vectorial (sin canvas). | ~10 KB |
| `preact` 10.29.8 + `htm` 3.1.1 | web | Interfaz ligera sin paso de compilación de JSX. | ~6 KB |
| `fflate` 0.8.2 | web | Exportar el respaldo `.zip` de facturas. | ~8 KB |
| `vite` 8.3.4 (dev) | web | Build estático con base relativa (portable entre hostings). | — |
| `typescript`, `@types/*` (dev) | raíz | `tsc --checkJs` sobre los tipos JSDoc. | — |
| `fake-indexeddb` (dev) | almacen | Correr las pruebas de IndexedDB en Node. | — |
| `wrangler` 4.149.0 (CI) | relevo | Despliegue del Worker; se usa con `npx` en la CI, no se instala. | — |

Nota de seguridad: `npm audit` reporta un aviso en `node-forge` sobre la
**verificación** de firmas RSA. No nos afecta: forge solo se usa para
descifrar la `.key`; no verificamos firmas con forge.

Sin XSLT en el navegador: Chrome lo retira en noviembre de 2026. La cadena
original se genera en código (`nucleo/src/cadena.js`) y una prueba de oro la
compara con la XSLT oficial del SAT usando `xsltproc`.

## Configuración y secretos

| Qué | Dónde vive |
|---|---|
| CSD del usuario (`.cer`, `.key`) | IndexedDB del navegador, solo si el usuario elige «recordar». La `.key` se guarda tal como la entrega el SAT (cifrada). |
| Contraseña del CSD | En ningún lado. Se pide en cada sesión y la llave descifrada vive como `CryptoKey` no exportable. |
| Facturas (XML, PDF), folios, contadores | IndexedDB del navegador. Respaldo con «Exportar .zip». |
| Credenciales del PAC | Secretos de Cloudflare (`wrangler secret put`). |
| Metadatos de timbres (emisor, ambiente, fecha, resultado) | D1 del relevo. Nunca el contenido de la factura. |
| URL del relevo | Variable del repositorio `RELEVO_URL` → `VITE_RELEVO_URL` en el build. |
| CSD público de prueba, XSLT y XSD del SAT | `~/.cache/facturador/` (lo descarga `npm run fixtures`); el build de la demo copia el CSD de prueba al sitio. |

El token de MercadoLibre (Fase B) será de una **app propia del facturador**: el
refresh token de ML es de un solo uso y compartirlo con Catálogo 3D rompería a
uno de los dos.

## Seguridad

- CSP por `<meta>` en el build (GitHub Pages no permite encabezados):
  `script-src 'self'`, `connect-src` solo al relevo, `form-action 'none'`.
- El relevo acepta solo los orígenes de `ORIGENES_PERMITIDOS`, exige XML
  sellado, limita por IP y tiene tope diario en sandbox. Producción está
  deshabilitada (`PRODUCCION_HABILITADA = "no"`).
- Sandbox por defecto. Nada se timbra en producción sin confirmación en
  pantalla (Fase B).

## Publicación

| Workflow | Qué hace |
|---|---|
| `ci.yml` | Revisión de secretos, tipos, pruebas (con `xsltproc` y `xmllint`) y build en cada PR. |
| `pages.yml` | Publica `apps/web/dist` en GitHub Pages al llegar a `main`. |
| `relevo.yml` | Despliega el Worker; el entorno `relevo` debe pedir aprobación manual. |

Mudarse de GitHub Pages (Fase C, código cerrado): cambiar solo el job de
publicación; el build no cambia.
