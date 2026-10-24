# @facturador/relevo

Cloudflare Worker **sin estado**. Hace solo lo que el navegador no puede:
hablar con el PAC (sin CORS, con credenciales).

| Ruta | Qué hace |
|---|---|
| `GET /salud` | Versión y si producción está habilitada. |
| `POST /pac/timbrar` | `{ xml, ambiente, emisorId, idempotencia }` → XML timbrado. Exige XML sellado y huella SHA-256. |

- CORS solo para `ORIGENES_PERMITIDOS`. Límite de 5 timbrados por minuto por IP
  (`ratelimits`) y tope diario en sandbox (`TOPE_DIARIO_SANDBOX`, contado en D1).
- Producción deshabilitada mientras `PRODUCCION_HABILITADA = "no"`.
- Guarda en D1 solo metadatos (`esquema.sql`); nunca XML, RFC ni tokens.

Puesta en marcha (la hace el dueño de la cuenta de Cloudflare):

```bash
npx wrangler@4.149.0 d1 create facturador-relevo
```

```bash
npx wrangler@4.149.0 d1 execute facturador-relevo --remote --file=esquema.sql
```

```bash
npx wrangler@4.149.0 secret put SW_USUARIO_SANDBOX
```

```bash
npx wrangler@4.149.0 secret put SW_CONTRASENA_SANDBOX
```

Después, poner el `database_id` en `wrangler.toml`, el origen real del sitio en
`ORIGENES_PERMITIDOS` y la URL del Worker en la variable `RELEVO_URL` del repo.
