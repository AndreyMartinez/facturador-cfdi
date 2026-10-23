# src/sello — CSD y firma

Todo con `node:crypto`, sin dependencias.

```js
import { createPrivateKey, sign, X509Certificate } from 'node:crypto';

const llave = createPrivateKey({ key: keyDer, format: 'der', type: 'pkcs8', passphrase });
const sello = sign('sha256', Buffer.from(cadena, 'utf8'), llave).toString('base64');

const cert = new X509Certificate(cerDer);
// NoCertificado: serialNumber en hex → pares → ASCII (20 dígitos)
// Certificado: cerDer.toString('base64')
```

- `.cer`, `.key` y contraseña viven en `~/.facturador/` (nunca en el repo).
- Validar al cargar: que el certificado sea **CSD** (no e.firma), que esté
  vigente y que el RFC coincida con el del emisor.

Estado: pendiente.
