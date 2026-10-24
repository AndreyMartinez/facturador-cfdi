# Cómo contribuir

¡Gracias por tu interés! Este proyecto es código abierto bajo la
[AGPL-3.0](LICENSE).

## Licencia de las contribuciones

El proyecto planea ofrecerse también bajo otras licencias (por ejemplo, una
versión comercial). Para que eso sea posible, **al enviar un pull request
aceptas que**:

1. Tu contribución es obra tuya (o tienes derecho a aportarla) y se publica
   bajo la AGPL-3.0.
2. Otorgas al titular del proyecto (Raphael Andrey Martinez Velàsquez) una
   licencia perpetua, mundial, gratuita e irrevocable para usar, modificar y
   **relicenciar** tu contribución bajo cualquier otra licencia, incluida una
   comercial o cerrada.

Firma cada commit con `git commit -s` (Developer Certificate of Origin) para
dejar constancia.

## Reglas del proyecto

- Español en código visible, documentos y mensajes de commit.
- Nunca subas CSD, contraseñas, tokens, XML/PDF timbrados ni datos de clientes.
  Usa solo los RFC y el CSD **públicos de prueba** del SAT.
- Pocas dependencias: justifica cada una en `docs/02-arquitectura.md`.
- Trabajo nuevo con SDD: requisitos → diseño → tareas
  (ver [docs/specs/](docs/specs/)).

## Antes de abrir un pull request

```bash
npm run fixtures
```

```bash
npm run secretos && npm run check && npm test
```
