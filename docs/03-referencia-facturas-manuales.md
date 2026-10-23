# Facturas de referencia (hechas a mano el 2026-10-23)

Dos facturas timbradas en el portal del SAT. Sirven como casos de prueba: el
borrador que arme la app para estas ventas tiene que dar exactamente estos
importes. Los datos de los clientes (RFC, razón social, C.P.) **no van aquí**:
para las pruebas se usan RFC de prueba del sandbox del PAC.

Común a las dos: emisor régimen 625, forma de pago 31, método PUE, MXN,
unidad H87, objeto de impuesto 02, IVA 16 % trasladado, sin retenciones,
receptor persona moral con régimen 601.

| | Caso 1: total con centavos | Caso 2: datos de ML tal cual |
|---|---|---|
| Producto | Organizador de cubiertos, 1 pieza | Organizador de cubiertos, 1 pieza |
| Total ML | 188.10 | 198.00 |
| Uso CFDI | G03 | G01 (el que capturó el comprador en ML) |
| Valor unitario | **162.155172** | **170.689655** |
| Subtotal | 162.16 | 170.69 |
| IVA | 25.94 | 27.31 |
| Total | 188.10 | 198.00 |
| Origen del receptor | Constancia enviada por mensaje (en ML venía RFC genérico) | `billing_info` de la orden |

## Lo que se aprendió en el portal

- Con 2 decimales en el unitario (162.16) el IVA salía 25.95 y el total 188.11.
- El comprador puede dejar en ML el RFC genérico XAXX010101000 y mandar
  después su constancia: la app debe permitir **corregir el receptor a mano**.
- `billing_info` trae `BUSINESS_NAME` con espacio al final: recortar.
- La razón social va sin «S.A. de C.V.».
- En el portal del SAT, un cliente nuevo se captura eligiendo «Otro» en
  Cliente Frecuente (solo aplica al portal, no a la API del PAC).
