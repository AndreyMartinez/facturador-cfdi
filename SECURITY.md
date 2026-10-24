# Seguridad

Este proyecto maneja sellos digitales (CSD) y datos fiscales. Si encuentras una
vulnerabilidad, **no abras un issue público**: repórtala en privado con
[GitHub Security Advisories](https://github.com/AndreyMartinez/facturador-cfdi/security/advisories/new).

Principios del diseño:

- El CSD y su contraseña nunca salen del navegador del usuario.
- El relevo no guarda el contenido de las facturas, solo metadatos.
- El repositorio no contiene secretos ni datos de clientes (`npm run secretos`).
