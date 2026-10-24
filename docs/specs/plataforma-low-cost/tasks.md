# Plan de implementación

Basado en [requirements.md](requirements.md) y [design.md](design.md).
Cada tarea se hace con pruebas primero (`node:test`) y termina conectada a lo
anterior; nada queda suelto.

Decisión provisional sobre los CSD de prueba (pregunta abierta 1 del diseño):
**no se guardan en el repo**. `npm run fixtures` los descarga del paquete
público de SW a `~/.cache/facturador/csd-prueba/`, y el build de la demo los
copia al sitio. Así `CLAUDE.md` no cambia. Marca provisional: «Facturalow».

- [x] 1. Monorepo y herramientas base
  - [x] 1.1 Crear `package.json` raíz con npm workspaces (`packages/*`, `apps/*`), `"type": "module"`, `engines.node >= 24`, y scripts `test`, `check` (`tsc --noEmit --checkJs`), `fixtures`
    - `tsconfig.json` con `allowJs`, `checkJs`, `strict`, `noEmit`
    - Mover los README de `src/*` a los paquetes equivalentes y borrar `src/`
    - Actualizar `.gitignore` (`node_modules`, `dist`, `.wrangler`, `.cache`)
    - _Requisitos: 9.1, 9.10_
  - [x] 1.2 Script de revisión de secretos `scripts/revisar-secretos.js` con su prueba
    - Falla con `.cer`, `.key`, `.pfx`, `.p12` o RFC que no esté en la lista blanca de RFC de prueba
    - Prueba con un directorio temporal que contiene un `.key` falso
    - _Requisitos: 8.1, 8.4_
  - [x] 1.3 Script `scripts/fixtures.js` que descarga y verifica el CSD de prueba EKU9003173C9 en `~/.cache/facturador/csd-prueba/`
    - _Requisitos: 0.2, 8.3_

- [x] 2. Núcleo: importes y receptor (`packages/nucleo`)
  - [x] 2.1 `puertos.js` y `errores.js`: tipos JSDoc de Venta, Borrador, Factura, Emisor; interfaces FuenteVentas, Firmador, Pac, Almacen; error tipado `{ codigo, mensaje, accion, detalleTecnico }`
    - _Requisitos: 9.2, 10.5_
  - [x] 2.2 `importes.js` con aritmética entera (centavos y millonésimas)
    - Pruebas: 198.00 → 170.689655 / 170.69 / 27.31 y 188.10 → 162.155172 / 162.16 / 25.94; varias unidades; varios conceptos; error `IMPORTE_NO_CUADRA`
    - _Requisitos: 4.1, 4.2, 4.3, 4.4_
  - [x] 2.3 `catalogos/` (régimen fiscal, uso CFDI con regímenes permitidos, forma de pago, tipo de persona) y `receptor.js`
    - Normaliza (recorta, mayúsculas, quita régimen capital), valida RFC, valida régimen ↔ uso CFDI, avisa `PUBLICO_EN_GENERAL`
    - _Requisitos: 3.4, 3.5, 4.5, 4.6_
  - [x] 2.4 `borrador.js`: Venta + Emisor → Borrador validado (usa importes y receptor)
    - Pruebas con las ventas de `fixtures/ventas/` (RFC de prueba)
    - _Requisitos: 4.1–4.6, 9.4_

- [x] 3. Núcleo: XML, cadena original y QR
  - [x] 3.1 `xml.js`: Borrador + certificado → XML CFDI 4.0 sin sello; escape XML; rechaza lo que salga del subconjunto
    - _Requisitos: 5.1_
  - [x] 3.2 `cadena.js`: cadena original 4.0 del subconjunto
    - Prueba de oro: igual a `xsltproc` con `cadenaoriginal_4_0.xslt` oficial (descargado por `npm run fixtures`, se omite si no hay `xsltproc`)
    - _Requisitos: 5.2, 5.3_
  - [x] 3.3 `sellar.js`: XML + Firmador → XML sellado (`Sello`, `NoCertificado`, `Certificado`)
    - Prueba con un firmador falso determinista
    - _Requisitos: 5.2_
  - [x] 3.4 `qr.js`: URL de verificación del SAT (formato de `tt`, últimos 8 del sello)
    - _Requisitos: 7.1_

- [x] 4. Firmadores
  - [x] 4.1 `packages/firmador-node`: abre `.cer`/`.key` con `node:crypto`, valida RFC y vigencia, firma RSA-SHA256
    - Pruebas con el CSD de prueba: contraseña incorrecta, RFC distinto, firma verificable con el `.cer`
    - _Requisitos: 2.4, 2.5, 5.2_
  - [x] 4.2 `packages/firmador-webcrypto`: forge descifra la `.key`, WebCrypto importa llave no exportable y firma
    - Prueba en Node (que tiene WebCrypto): mismo sello que `firmador-node` para la misma cadena
    - _Requisitos: 2.1, 2.2, 2.4, 2.5, 5.3_
  - [x] 4.3 Prueba de punta a punta del núcleo: venta de ejemplo → borrador → XML → cadena → sello, verificada con el `.cer`
    - _Requisitos: 4.2, 5.1, 5.2_

- [x] 5. Almacén y fuentes
  - [x] 5.1 `packages/almacen`: implementación en memoria e IndexedDB con la misma interfaz; `esquema` en cada documento; `folios.siguiente` atómico; `contadores.sumar`
    - Pruebas compartidas que corren contra ambas (IndexedDB con `fake-indexeddb` en dev, se justifica en arquitectura)
    - _Requisitos: 7.2, 7.5, 9.3, 9.5, 9.9_
  - [x] 5.2 `packages/fuentes`: `ejemplo` (las dos ventas de referencia) y `manual`
    - _Requisitos: 0.3, 9.2_

- [x] 6. PAC y relevo
  - [x] 6.1 `packages/pac/relevo.js`: cliente del relevo (`timbrar`), mapeo de errores y reintento seguro con el mismo XML
    - Pruebas con `fetch` simulado: éxito, duplicado = éxito, red caída
    - _Requisitos: 5.4, 6.3, 6.4, 6.5_
  - [x] 6.2 `packages/pac/sw-sapien.js`: autenticación y `stamp` contra el sandbox, con respuestas grabadas
    - _Requisitos: 6.1, 6.5_
  - [x] 6.3 `apps/relevo`: Worker con `/salud` y `/pac/timbrar`; CORS por origen, ambiente producción deshabilitado, límite de tamaño, rate limit, sin logs de contenido, fila en D1
    - Pruebas del handler con peticiones simuladas
    - _Requisitos: 0.4, 0.6, 1.2, 6.3, 8.2, 8.5, 9.8_

- [x] 7. PDF
  - [x] 7.1 `packages/pdf`: jsPDF + qrcode; emisor, receptor, conceptos, totales, UUID, sellos, QR, marca «SIN VALIDEZ · SANDBOX»; aviso si pasa de 1 MB
    - Prueba: genera en Node y verifica tamaño y presencia del UUID
    - _Requisitos: 0.5, 7.1, 7.6_

- [x] 8. App web (`apps/web`)
  - [x] 8.1 Vite + Preact, rutas por hash, configuración por ambiente (`demo`), CSP por `<meta>`, estilos de los mockups como tokens CSS
    - _Requisitos: 9.6, 10.2, 10.3, 10.4_
  - [x] 8.2 Pantallas Portada y Panel conectadas al almacén y a las fuentes
    - _Requisitos: 0.1, 9.9, 10.1_
  - [x] 8.3 Nueva factura → Revisar (editar receptor, validaciones, cuadre) usando el núcleo
    - _Requisitos: 4.5, 4.6, 10.1, 10.5_
  - [x] 8.4 Sellar y timbrar → Factura lista: firmador WebCrypto con el CSD de prueba de la demo, cliente del relevo, PDF, guardado antes de entregar, máquina de estados de la factura
    - _Requisitos: 0.3, 2.1, 6.4, 7.1, 7.2_
  - [x] 8.5 Emitidas (filtros, contador, exportar `.zip`) y Emisor y CSD (carga de `.cer`/`.key`, «recordar» guardando la `.key` cifrada original)
    - _Requisitos: 2.1, 2.3, 7.5, 9.3_
  - [x] 8.6 Pantalla de errores y textos: mapear todos los códigos de `errores.js` a mensaje y acción
    - _Requisitos: 10.5_

- [x] 9. Cableado de CI y documentación
  - [x] 9.1 Workflow `ci.yml`: `check`, `test` (con `xsltproc`), revisión de secretos y build en cada PR
    - _Requisitos: 9.7, 8.4_
  - [x] 9.2 Workflow `pages.yml` (build de la demo + `deploy-pages`) y `relevo.yml` (wrangler con aprobación)
    - _Requisitos: 0.1, 1.1, 9.6_
  - [x] 9.3 Actualizar `README.md` y `docs/02-arquitectura.md` (nuevo stack, dependencias justificadas, dónde viven los secretos)
    - _Requisitos: 1.3, 9.10_

Notas de la implementación:

- Se agregó un **PAC simulado** (`packages/pac/src/simulado.js`) para que la demo
  funcione en GitHub Pages antes de tener cuentas de Cloudflare y SW Sapien.
- Además de la prueba de oro con `xsltproc`, el XML se valida contra el XSD
  oficial con `xmllint` (detecta claves SAT o C.P. inexistentes).
- Pendiente de verificar contra el sandbox real de SW: respuesta de duplicado
  (307) y aceptación de los importes con 6 decimales en conceptos.

Fase B (MercadoLibre real, confirmación de producción, cancelación) se planea
aparte cuando la demo esté publicada.
