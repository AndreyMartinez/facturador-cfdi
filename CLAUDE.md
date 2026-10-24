# facturador-cfdi

Facturación CFDI 4.0 low cost: sitio estático (GitHub Pages) que sella en el
navegador y timbra directo con un PAC a través de un relevo en Cloudflare
Workers. Empieza con las ventas de MercadoLibre de Savia Raíz y está pensado
para crecer a plataforma. Lee primero el [README](README.md), [docs/](docs/) y
la spec en [docs/specs/plataforma-low-cost/](docs/specs/plataforma-low-cost/).

Comandos: `npm run fixtures` (recursos públicos de prueba, fuera del repo),
`npm test`, `npm run check`, `npm run secretos`, `npm run dev -w @facturador/web`.

## Reglas

- Español en código visible, documentos y mensajes de commit.
- Node 24, ESM, tipos con JSDoc (`npm run check`). Pocas dependencias; cada una
  se justifica en `docs/02-arquitectura.md` antes de agregarla.
- El núcleo (`packages/nucleo`) es puro: sin DOM, `fs` ni red. Lo demás son
  adaptadores detrás de las interfaces de `nucleo/src/puertos.js`.
- **Secretos y datos de clientes fuera del repo**: CSD, contraseñas, tokens,
  XML/PDF timbrados, RFC y razones sociales. Ni en pruebas ni en documentos;
  solo RFC y CSD públicos de prueba del SAT (el CSD de prueba vive en
  `~/.cache/facturador/`). `npm run secretos` lo revisa.
- Sandbox por defecto. Nada se timbra en producción sin confirmación del
  usuario en pantalla.
- Nunca usar la e.firma del usuario ni escribir sus contraseñas: él inicia
  sesión y él confirma.
- Los importes deben cuadrar al centavo con el total de ML
  (unitario = total / 1.16 a 6 decimales).
- Trabajo nuevo con SDD: requisitos → diseño → tareas, con aprobación entre
  pasos.

## Pendiente

1. Abrir cuenta de sandbox en SW Sapien (PAC de la demo) y cuenta de
   Cloudflare para el relevo; elegir el PAC de producción.
2. Tramitar el CSD en CertiSAT Web (Fase B).
3. Confirmar la clave de producto SAT (provisional: 52151600) y registrar una
   app de MercadoLibre propia del facturador (Fase B).
