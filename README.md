# facturador-cfdi

Facturación CFDI 4.0 **low cost**: el XML se arma y se **sella en el navegador**
(el CSD nunca sale del equipo) y se timbra **directo con un PAC**. Empieza como
prueba gratuita en GitHub Pages para las ventas de MercadoLibre de Savia Raíz y
está estructurado para crecer a una plataforma multi-cliente.

```
Venta ──► borrador (cuadra al centavo) ──► XML CFDI 4.0 ──► sello (navegador) ──► relevo ──► PAC ──► PDF con QR
```

Estado: **Fase A (demo)** funcionando: venta de ejemplo o captura manual →
revisar → sellar con el CSD de prueba del SAT → timbre (simulado o sandbox del
PAC) → PDF → guardado en el equipo. Ver
[docs/specs/plataforma-low-cost/](docs/specs/plataforma-low-cost/).

## Probarlo

Requiere Node 24, y `xsltproc` y `xmllint` para las pruebas de oro (vienen en
macOS).

```bash
npm install
```

```bash
npm run fixtures
```

```bash
npm test
```

```bash
npm run dev -w @facturador/web
```

`npm run fixtures` descarga **fuera del repo** (en `~/.cache/facturador/`) el
CSD público de prueba del SAT, la XSLT de la cadena original y los XSD del
CFDI 4.0, verificados con SHA-256.

Sin `VITE_RELEVO_URL` la demo usa un **PAC simulado** (marca el timbre como
«SIMULADO, SIN VALIDEZ»). Con la URL del relevo, timbra en el sandbox del PAC.

## Estructura

```
packages/
  nucleo/              importes, receptor, borrador, XML, cadena original, sello, QR (puro: sin DOM, fs ni red)
  firmador-webcrypto/  abre el CSD y firma en el navegador (node-forge + WebCrypto)
  firmador-node/       el mismo contrato con node:crypto (pruebas y servidor futuro)
  almacen/             emisores, facturas, folios y contadores (memoria / IndexedDB)
  fuentes/             de dónde salen las ventas: ejemplo, captura manual (MercadoLibre en la Fase B)
  pac/                 cliente del relevo, adaptador de SW Sapien, PAC simulado
  pdf/                 representación impresa con QR del SAT
apps/
  web/                 sitio estático (Vite + Preact) → GitHub Pages
  relevo/              Cloudflare Worker sin estado: habla con el PAC
fixtures/ventas/       las dos ventas de referencia, con RFC de prueba
scripts/               descarga de recursos de prueba y revisión de secretos
docs/                  documentación y specs
```

Cada paquete tiene su README.

## Documentación

- [docs/01-como-se-factura.md](docs/01-como-se-factura.md): cómo funciona el
  timbrado, PAC, CSD y datos fiscales.
- [docs/02-arquitectura.md](docs/02-arquitectura.md): arquitectura, dependencias
  y dónde viven los secretos.
- [docs/03-referencia-facturas-manuales.md](docs/03-referencia-facturas-manuales.md):
  las dos facturas de referencia (casos de prueba).
- [docs/specs/plataforma-low-cost/](docs/specs/plataforma-low-cost/):
  requisitos, diseño, tareas y mockups.

## Lo que nunca va en este repo

- CSD reales (`.cer`, `.key`), su contraseña ni la e.firma.
- Credenciales del PAC, tokens de MercadoLibre o de Cloudflare.
- XML/PDF timbrados y datos fiscales de clientes.

`npm run secretos` (y la CI) falla si encuentra certificados, llaves o RFC que
no sean de prueba.

## Licencia

[AGPL-3.0](LICENSE). Puedes usar, estudiar y modificar este código; si lo
ofreces como servicio a otros, debes publicar tus cambios bajo la misma
licencia. Para otros términos de uso (licencia comercial), contacta al titular.
Antes de contribuir, lee [CONTRIBUTING.md](CONTRIBUTING.md).
