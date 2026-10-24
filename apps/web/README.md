# @facturador/web

Sitio estático (Vite + Preact + htm). Toda la facturación ocurre en el navegador.

```bash
npm run dev -w @facturador/web
```

- Rutas por hash (`#/panel`, `#/revisar/ejemplo/referencia-198`…) y `base: './'`:
  funciona en cualquier hosting estático.
- `src/flujo.js`: sellada → timbrando → timbrada → entregada, guardando cada paso
  (con pruebas en `test/flujo.test.js`).
- `src/servicios.js`: conecta almacén IndexedDB, fuentes, PAC y CSD.
- Pantallas en `src/vistas/`, iguales a los
  [mockups](../../docs/specs/plataforma-low-cost/mockups/index.html).
- `VITE_RELEVO_URL` vacía → PAC simulado. El emisor de prueba abre solo el CSD
  público del SAT (contraseña pública `12345678a`).
- El build agrega la CSP por `<meta>` y copia el CSD de prueba desde
  `~/.cache/facturador/` (`npm run fixtures`).
