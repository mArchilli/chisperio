# 11.4 — Confirmar la venta y los estados

Con `INTEGRACION_CONFIRMACION=true` (más `RUKOZ_INTEGRACION`; los pedidos con reserva existen solo con `INTEGRACION_CHECKOUT`), el admin confirma la venta de un pedido reservado en el Central y la web refleja los estados que el Central informa. Con el interruptor apagado, o en un pedido viejo (sin `rukoz_ref`), todo funciona como antes.

## Decisiones

- El vendedor confirma desde el admin, **con o sin pago**. Sin pago, la venta queda con saldo en el Central.
- Después de confirmar el pedido es **de solo lectura** en la web. Las correcciones se hacen en el Central (anular y rehacer).
- Empaquetado y despacho se hacen en el Central; la web solo muestra el estado que le llega.
- Métricas: para los pedidos con `rukoz_ref` la venta cuenta desde `confirmado_at`.

## «Confirmar venta» (`App\Rukoz\ConfirmacionDeVenta`)

Botón en la ficha del pedido (solo si está `pendiente`, con reserva `reservado` y `puedeConfirmarse()`); **reemplaza** a «Marcar como despachado» para esos pedidos. El modal (`ConfirmarVentaModal.jsx`) pide sus datos al abrirse (`GET admin/pedidos/{id}/confirmacion`) para que la ficha no dependa del Central, y muestra: resumen con las notas por ítem, forma de envío / transportista / **costo de envío cobrado** / envío gratis, **pagos** (ninguno, uno o varios: cuenta, medio, monto), el **saldo** («Queda con saldo $X en el central») y el **vendedor**.

### Qué se manda (`POST /pedidos/{ref}/confirmar`, Central 0.1.1)

Ejemplo real de la prueba local (Pedido B, 2 pagos; vendedor y cliente de prueba):

```json
{
  "vendedor": { "id": "prueba-11-4", "email": "prueba-11-4@chisperio.test", "nombre": "Prueba 11.4" },
  "pagos": [
    { "cuenta": "DIGITAL-CHISPERIO", "medio": "transferencia", "monto": 12000, "fecha": "2026-10-19T11:28:53-03:00" },
    { "cuenta": "EFECTIVO", "medio": "efectivo", "monto": 8000, "fecha": "2026-10-19T11:28:53-03:00" }
  ],
  "envio": { "forma_envio_id": 1, "costo_cobrado": 2600, "es_gratis": false, "transportista_id": 1 },
  "confirmado_at": "2026-10-19T11:28:53-03:00"
}
```

- **No se manda `descuento`**: el del cupón ya viaja en el `total` del pedido (11.3). Tampoco se manda `recargo_medio_pago` ni `observaciones`.
- La venta queda en `productos − cupón + envío cobrado`; el envío nunca entró en el `total` del pedido. Los pagos no pueden superarla (la web lo valida antes de llamar).
- **Idempotencia.** (1) Un lock de caché por pedido serializa el doble clic: el segundo ve el pedido ya confirmado y **no llama al Central** («ya estaba confirmado»). (2) `pedidos.confirmando_at` se fija **una vez**, antes del primer intento, y es el `confirmado_at` y la `fecha` de los pagos: un reintento tras un timeout lleva exactamente los mismos bytes, el paquete reutiliza la `Idempotency-Key` y el Central devuelve la misma venta. Si la respuesta se perdió pero la venta se creó, el reintento la recupera.
- **Nada a medias.** Central caído/timeout/circuito → «no se confirmó y el pedido no cambió». Rechazo (`CONFIRMACION_RECHAZADA`, `VALIDACION`…) → el mensaje del Central y el pedido sin cambios. `VENDEDOR_NO_MAPEADO` → «el vendedor todavía no está habilitado». `PEDIDO_YA_CONFIRMADO`/`PEDIDO_CANCELADO` → se reconcilia con `Rukoz::actualizarPedidoDesdeCentral` (el pedido pasa a su estado real). Si el Central confirma y falla el guardado local, queda un `critical` en el log, la venta existe allá y el estado llega igual por el evento (o `rukoz:revisar-pedidos --reconciliar`).
- Al éxito: `estado = confirmado`, `confirmado_at`, `rukoz_numero_venta`, `rukoz_total_venta`, `rukoz_pagado`, `rukoz_saldo`, `envio_costo_cobrado`, `confirmado_por`, `rukoz_version`.

### El vendedor (adaptador `App\Rukoz\VendedorParaCentral`)

La API **sí** recibe el vendedor: `vendedor.id` (el id con el que la web se presenta; obligatorio) más `email`/`nombre` opcionales. El Central asigna ese `id` a un usuario suyo (Integraciones → Vendedores) y, asignado, figura en `GET /referencias` → `vendedores`. No falta nada en la API; el punto de acoplamiento queda en **una función**, `VendedorParaCentral::payload()`, por si el Central pide otro formato.

- Mapeo web → Central: columna `users.rukoz_vendedor_id` (el `vendedor.id`). Se edita en **Admin → Usuarios** («Vendedor en el Sistema Central», solo con la confirmación encendida; único entre usuarios) o con `php artisan chisperio:vendedor-mapear {email|id} [vendedor] [--quitar] [--listar]` (sin `vendedor` usa el id del usuario).
- **Sin mapeo no se confirma**: el mensaje explica cómo vincularlo y la web ni llama al Central.
- Con mapeo pero sin asignar en el Central: el primer intento da `VENDEDOR_NO_MAPEADO` (el Central lo deja pendiente en su panel para que administración lo asigne) y no se crea nada; el modal avisa de antemano si el Central ya informó su lista y el vendedor no está.
- Vendedor = el usuario logueado; un **admin** puede elegir otro (de los que tienen mapeo). Un vendedor (rol) no puede confirmar a nombre de otro.
- Un vendedor (rol) solo confirma pedidos de su sucursal (como el resto del admin).

### Cuentas, medios y formas de envío

`ReferenciasDelCentral` (`GET /referencias`, caché del paquete por `hash` + caché propio de `INTEGRACION_REFERENCIAS_CACHE` s). Si el Central no contesta: lista de respaldo `INTEGRACION_REFERENCIAS_RESPALDO` (JSON); sin ninguna de las dos el modal avisa y no deja confirmar. Antes de llamar al Central la web valida cuenta y forma de envío existentes, retiro sin costo/transportista y envío gratis sin costo.

## Solo lectura después de confirmar

`Pedido::esEditable()` y `Pedido::puedeTransicionarA()` mandan en el backend (no solo la UI):

- `PUT admin/pedidos/{id}` y `GET .../editar` → rechazados («solo lectura… anulá la venta allá y rehacelo»), también cuando hay notas, cupón o líneas nuevas; no se llama al Central.
- `PATCH .../estado` → cualquier destino rechazado: **«Para anular, hacelo en el Sistema Central.»**
- `chisperio:cancelar-reservas-viejas` no toca un pedido con `confirmado_at`.
- La ficha muestra todo (número de venta, total, pagado, saldo, envío, transportista, seguimiento con enlace, fechas) y el botón de WhatsApp sigue.
- Con la confirmación encendida, un pedido con reserva ya no se «despacha» a mano (se confirma). Con ella apagada, el despacho manual de la 11.3 sigue igual.

## Estados que llegan del Central (`App\Rukoz\EstadoDesdeCentral`)

Listener del evento genérico `PedidoActualizado` (registrado solo con `INTEGRACION_CONFIRMACION`). El paquete ya aplica la regla de `version` sobre `rukoz_pedidos`; el listener la repite sobre `pedidos.rukoz_version` (descarta una versión **menor**, reaplica una igual: idempotente). Sin HTTP; una referencia desconocida se ignora; un pedido cancelado en la web no se reabre.

| Central (`estado`) | Web (`EstadoPedido`) | Notas |
|---|---|---|
| reservado / requiere_revision | sigue Pendiente | solo actualiza `rukoz_estado`/versión |
| confirmado | **Confirmado** (nuevo) | también al revertir (`estado_revertido`): las fechas del estado dejado vuelven a `null` |
| empaquetado | **Empaquetado** (nuevo) | no estaba en la tabla sugerida; sin él un empaquetado se vería como «Confirmado» |
| despachado | Despachado | `despachado_at`, transportista, seguimiento y URL |
| retirado | **Entregado** (nuevo) | el Central no tiene «entregado»: `retirado` (retiro en oficina o entrega en mano) es su equivalente |
| anulado | **Anulado** (nuevo) | motivo en `motivo_cancelacion`, `rukoz_anulado_at` |
| cancelado (`reserva_liberada`) | Cancelado | motivo del Central |

`pago_actualizado` y `envio_actualizado` refrescan pagado/saldo y seguimiento sin cambiar de estado. Confirmar desde el panel del Central también se refleja (confirmado_por queda `NULL`).

**Venta anulada / reserva liberada → el cupón se libera** (`liberarUso`, idempotente): la venta no ocurrió, el cupo vuelve. Es consistente con la 11.3 (cancelar una reserva ya liberaba el cupón). El stock lo devuelve el Central y llega por `stock.actualizado` (11.2): la web nunca descontó stock local de estos pedidos.

## Métricas

`Pedido::ventas()` distingue el origen:

- **Con `rukoz_ref`**: cuentan `confirmado`, `empaquetado`, `despachado` y `entregado` con `confirmado_at`; fecha de la venta = `confirmado_at`. Anulados, cancelados y reservas sin confirmar no cuentan (las reservas van a «pendientes»; un `despachado` manual de la 11.3 sin confirmar tampoco es venta).
- **Sin `rukoz_ref`** (viejos): despachados, por su fecha de creación, como hoy.

`Pedido::ventasEntre($desde,$hasta)` (MetricasController: facturación, cantidad, ticket, serie por día/hora, comparación con el período anterior y top de productos) y `fechaDeVenta()`. Días y meses son **argentinos** (borde de medianoche testeado). El dashboard («producto más vendido») y el listado usan `ventas()`; «Despachados este mes» sigue por `despachado_at`.

## Migración, variables, comandos y archivos

- Migración aditiva `2026_10_20_120000_add_confirmacion_de_venta_to_pedidos_table`: `pedidos.confirmado_at` (índice), `confirmando_at`, `confirmado_por`, `rukoz_numero_venta`, `rukoz_total_venta`, `rukoz_pagado`, `rukoz_saldo`, `envio_costo_cobrado`, `rukoz_transportista`, `rukoz_numero_seguimiento`, `rukoz_url_seguimiento`, `rukoz_empaquetado_at`, `rukoz_retirado_at`, `rukoz_anulado_at`; `users.rukoz_vendedor_id`. Todo nullable.
- Variables: `INTEGRACION_CONFIRMACION` (ya existía), `INTEGRACION_REFERENCIAS_CACHE` (300), `INTEGRACION_REFERENCIAS_RESPALDO` (`{}`), `INTEGRACION_FORMA_ENVIO_ID`, `INTEGRACION_TRANSPORTISTA_ID`. **En producción todo apagado.**
- Comando nuevo: `chisperio:vendedor-mapear`. `chisperio:integracion-estado` suma el bloque «Ventas (11.4)» (ventas por estado, con saldo, usuarios sin mapeo, listener registrado).
- Hace falta el webhook (o `rukoz:poll` cada minuto) para que los estados lleguen; ver 11.2.

## Tests

`tests/Feature/Rukoz/ConfirmarVentaTest`, `PedidoConfirmadoSoloLecturaTest`, `EstadosDesdeCentralTest`, `MetricasConCentralTest`, `VendedorMapeoTest`. Usan el cliente real del paquete contra `tests/Support/CentralDePrueba` (ahora con `GET /referencias`, `POST /pedidos/{ref}/confirmar`, `GET /pedidos/{ref}` y transiciones desde el Central) y **cada body de `confirmar` se valida** contra `tests/Support/ContratoConfirmacionCentral` (reglas de `ConfirmarPedidoWebRequest` del Central, claves del fixture oficial, `descuento` prohibido, cuenta/forma de envío contra `GET /referencias`, pagos ≤ total). Los eventos entran por el camino real (inbox → versión → `PedidoActualizado`) con los fixtures oficiales de `tests/fixtures/rukoz/`.

## Prueba local

1. Backup de la base y `php artisan migrate`.
2. `.env`: `INTEGRACION_CONFIRMACION=true`; `php artisan config:clear`. `php artisan chisperio:integracion-estado`.
3. En el Central, ajustar stock de prueba y tener el webhook apuntando a la web (11.2). Mapear usuarios: `php artisan chisperio:vendedor-mapear tu@mail 2`; el primer intento de confirmar deja el vendedor pendiente en el Central → asignarlo en Integraciones → Vendedores.
4. Pedido en la tienda → admin → «Confirmar venta» → mirar la venta en el Central; empaquetar/despachar/anular allá y ver el estado en la web.
