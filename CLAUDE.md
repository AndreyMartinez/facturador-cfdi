# facturador-cfdi

App en Node para facturar (CFDI 4.0) las ventas de MercadoLibre de Savia Raíz,
timbrando directo con un PAC. Lee primero el [README](README.md) y
[docs/](docs/).

## Reglas

- Español en código visible, documentos y mensajes de commit.
- Node 24, ESM. Pocas dependencias; cada una se justifica en
  `docs/02-arquitectura.md` antes de agregarla.
- **Secretos y datos de clientes fuera del repo**, en `~/.facturador/`: CSD,
  contraseñas, tokens, XML/PDF timbrados, RFC y razones sociales. Ni en
  pruebas ni en documentos.
- Sandbox por defecto. Nada se timbra en producción sin confirmación del
  usuario en pantalla.
- Nunca usar la e.firma del usuario ni escribir sus contraseñas: él inicia
  sesión y él confirma.
- Los importes deben cuadrar al centavo con el total de ML
  (unitario = total / 1.16 a 6 decimales).
- Trabajo nuevo con SDD: requisitos → diseño → tareas, con aprobación entre
  pasos.

## Pendiente antes de programar

1. Elegir PAC y abrir cuenta de sandbox.
2. Tramitar el CSD en CertiSAT Web.
3. Confirmar la clave de producto SAT y los límites de `fiscal_documents` en ML México.
