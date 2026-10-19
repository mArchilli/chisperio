# 11.4b — Punto de atención por pedido y retención del despacho

Requiere el Central con el campo `punto` y el paquete `rukoz/core-client` **0.1.2**. Se enciende con los mismos interruptores de la 11.3/11.4; con la integración apagada, o en un pedido viejo (sin `rukoz_ref`), todo sigue como antes.

## Decisiones

- **El punto de cada pedido lo define la web**, con la regla que ya usaba: la sucursal. El Central lo necesita para sus métricas, la caja y el empaquetado.
- **Al confirmar, el vendedor elige** si la venta se despacha solo con el pago completo.
- **Comisión:** las ventas web van siempre por el canal Web y el porcentaje se maneja en el Central. Acá no hay nada que hacer.

## Punto de atención

### La regla provincia → sucursal (una sola fuente)

Estaba solo en el frontend (`PROVINCIAS_POR_SUCURSAL` en `resources/js/lib/whatsapp.js`): el checkout **sugiere** la sucursal según la provincia y el cliente puede cambiarla; el servidor guardaba la que llegaba (`pedidos.sucursal`) y, si no llegaba, Buenos Aires. Para que el servidor aplique **la misma regla** (edición de la provincia, pedidos sin sucursal) sin duplicarla, la regla pasó a `resources/data/provincias-por-sucursal.json`:

- el frontend lo importa (`sucursalSugeridaId`, mismo comportamiento: centro + norte + Cuyo → Córdoba; el resto, incluida la Patagonia y el litoral, → Buenos Aires);
- el servidor lo lee con `App\Enums\Sucursal::paraProvincia($provincia)` (sin distinguir mayúsculas, acentos ni espacios, porque en el admin la provincia es texto libre; el selector del checkout manda valores exactos y se comporta igual que antes).

### Sucursal → código del Central

`config/integracion.php` → `puntos` (`INTEGRACION_PUNTO_BUENOS_AIRES=BA`, `INTEGRACION_PUNTO_CORDOBA=CBA`); `App\Rukoz\PuntoDeAtencion` lo traduce. Una sucursal con el código vacío no manda `punto` y rige el predeterminado del Central.

`php artisan chisperio:integracion-estado` suma el bloque **Puntos de atención (11.4b)**: muestra el mapeo, los puntos que devuelve `GET /referencias` y marca **ERROR** (código 1) un código que el Central no tiene. Si el Central no contesta, lo avisa sin fallar.

### Qué se manda

| Operación | Cómo |
|---|---|
| `reservar` (checkout) | `punto` = código de la sucursal del pedido. La sucursal ya **no** viaja en `cliente.observaciones` ("Envío gratis" y las observaciones del cliente siguen). Si el cliente no eligió sucursal, se usa la regla de su provincia. |
| `editarReserva` (admin) | Igual, desde el pedido tal como queda guardado. Si la edición **cambia la provincia** a una de otra sucursal, el pedido cambia de sucursal y por lo tanto de punto. Si no cambia la provincia, no se toca la sucursal (puede ser la que el cliente eligió a mano). Solo pedidos con reserva: los viejos conservan su comportamiento. Un vendedor que pasa el pedido a la otra sucursal vuelve al listado (ya no lo ve). |
| `confirmar` | `punto` = el del pedido, **corregible en el modal** con la lista de `referencias.puntos`; se valida contra esa lista antes de llamar al Central. |

El punto que informa el Central (`punto` de las respuestas y eventos) se guarda en `pedidos.rukoz_punto` y la ficha lo muestra.

`PUNTO_DESCONOCIDO` (código mal configurado): el checkout cae en su mensaje genérico de problema de catálogo (queda en el log), la edición y la confirmación explican que es un problema de configuración (`INTEGRACION_PUNTO_*`) y listan los puntos válidos; en ningún caso se guarda nada.

### Pedidos viejos

Una reserva anterior a la 11.4b (con `rukoz_ref` y sin `rukoz_punto`) sigue funcionando: el Central la tiene en su punto predeterminado. Al confirmar, el modal propone el punto de su sucursal y el vendedor lo puede corregir.

## Retención del despacho

En el modal de **Confirmar venta**, la casilla **«Despachar solo con pago completo»**:

- desmarcada por defecto;
- solo se puede marcar si **queda saldo** (deshabilitada si el pago cubre el total; si se tilda y después se agregan pagos hasta cubrirlo, se deshabilita y no se manda);
- se manda como `solo_con_pago_completo`. Con saldo, el Central permite empaquetar pero no despachar ni retirar hasta que se cobre el saldo; entonces se libera sola.

El estado vuelve en `retenido_por_pago` (respuesta de `confirmar` y todos los eventos `pedido.*`) y se guarda en `pedidos.rukoz_retenido_por_pago`. La ficha muestra **«Retenido hasta completar el pago»** mientras sea `true`; el `pedido.pago_actualizado` que completa el pago lo pone en `false`. Un estado que no trae `punto` / `retenido_por_pago` (anterior a la 0.1.2) no borra lo ya sabido.

## Migración, variables y archivos

- Migración aditiva `2026_10_21_120000_add_punto_y_retencion_to_pedidos_table`: `pedidos.rukoz_punto` y `pedidos.rukoz_retenido_por_pago` (nullable). Backup antes de migrar.
- Variables: `INTEGRACION_PUNTO_BUENOS_AIRES` (`BA`), `INTEGRACION_PUNTO_CORDOBA` (`CBA`).
- Archivos: `app/Rukoz/PuntoDeAtencion.php`, `App\Enums\Sucursal::paraProvincia`, `resources/data/provincias-por-sucursal.json`.

## Tests

`tests/Unit/SucursalPorProvinciaTest` (la regla original, provincia por provincia, y que el frontend usa el JSON) y `tests/Feature/Rukoz/PuntoYRetencionTest`: payload de `reservar`, `editarReserva` y `confirmar` con `punto` y `solo_con_pago_completo`, validados contra el contrato (`tests/Support/ContratoPedidoCentral` y `ContratoConfirmacionCentral`, 0.1.2, con fixtures oficiales actualizados desde el paquete); cambio de provincia en la edición; casilla con y sin saldo; evento con `retenido_por_pago`; `integracion-estado` con un código inválido. El Central falso (`tests/Support/CentralDePrueba`) responde `PUNTO_DESCONOCIDO`, conserva el punto en un `PUT` sin `punto` y libera la retención al completar el pago.
