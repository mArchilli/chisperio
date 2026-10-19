# 11.3 — El checkout reserva en el Central

Con `INTEGRACION_CHECKOUT=true` un pedido de la tienda **reserva el stock en el Central antes de guardarse** y la web **deja de descontar stock local** para ese pedido. La confirmación de la venta es de la 11.4: acá el pedido queda **reservado**. Con el interruptor apagado todo funciona exactamente como antes (stock local, una sola transacción).

## Regla de encendido

`INTEGRACION_CHECKOUT` exige `INTEGRACION_STOCK` y `RUKOZ_INTEGRACION` (sin el espejo de stock la web reservaría contra un stock que no ve). Con la combinación inválida:

- el checkout **no** usa el Central (sigue con stock local);
- al arrancar queda un `warning` en el log (a lo sumo uno por hora);
- `php artisan chisperio:integracion-estado` lo informa y sale con código 1.

`php artisan chisperio:integracion-estado` muestra además los interruptores, el ping al Central (y el circuito), los ítems activos sin espejo, las reservas abiertas y las **pendientes de compensar** (cancelaciones o creaciones dudosas que el paquete reintenta).

## El checkout, paso a paso (`PedidoController::store`)

1. Validación y chequeo contra el espejo (igual que siempre: sirve para dar el mensaje rápido y no golpear al Central de más).
2. `CalculadoraPedido::calcular()` — precios, cupón **validado sin consumir ni lockear**, ítems y totales.
3. Se arma el pedido para el Central (`App\Rukoz\PedidoParaCentral`) con modelos en memoria.
4. **Referencia externa** `rukoz_ref` (`CHP-` + ULID, ≤100, sin `/`), generada **antes** de reservar y guardada en `pedidos.rukoz_ref` (única). Es la clave de idempotencia (ver «Doble envío»).
5. `Rukoz::reservar(ref, payload, transaccionLocal)` — HTTP, **afuera de toda transacción**.
6. Reserva OK → **transacción local** (sin HTTP): se revalida el cupón con lock (si el descuento cambió se aborta), se crea el pedido con `rukoz_ref`, `rukoz_version` y `rukoz_estado = reservado`, se crean los ítems y se consume el cupo (`consumirUso`, idempotente). **No** se llama a `StockService::descontar`.
7. Si la transacción local falla → el paquete cancela la reserva (`cancelarPedido`); si esa cancelación también falla queda en `rukoz_compensaciones` (tipo `cancelar`) y `rukoz:compensaciones` la reintenta cada 5 min (24 h de vida).

`StockService::descontar`, `reponer` y `ajustarPorEdicion` **ignoran** los pedidos con `rukoz_ref` (guarda dentro del servicio: ningún otro camino puede tocar el stock local de un pedido del Central).

### Qué se manda (formato de `POST /pedidos`, Central 0.1.1)

Ejemplo real de la prueba local (datos del cliente ofuscados):

```json
{
  "cliente": {
    "nombre": "P*** 11.3", "telefono": "11*****000", "localidad": "Prueba", "provincia": "Buenos Aires",
    "observaciones": "Sucursal: Buenos Aires\nPedido de prueba 11.3 - no preparar"
  },
  "items": [
    { "tipo": "producto", "id": "17", "nombre": "Chispa Fria 2x20 con mecha", "cantidad": 2, "precio_unitario": 2800 },
    { "tipo": "variante", "id": "17", "nombre": "Bengala de humo (Verde)", "cantidad": 2, "precio_unitario": 4000 },
    { "tipo": "variante", "id": "25", "nombre": "Pistolas de Chispas Frías (Negra)", "cantidad": 1, "precio_unitario": 100000, "nota": "Marca: PRUEBA" }
  ],
  "total": 113600,
  "moneda": "ARS",
  "creado_at": "2026-10-18T23:44:31+00:00",
  "external_ref": "CHP-01M58PE4GQ403J7HVET2SE5FWG"
}
```

- **Producto o variante**: `tipo:id` + cantidad + `precio_unitario` **final por unidad** (escala por cantidad, oferta, recargo de la variante y add-ons; sin el cupón). Un producto con variantes activas **siempre** va como `variante`.
- **Combo fijo** (ninguna línea pide elegir variante): `tipo: combo`, sin `selecciones`. **Combo con elección o mixto**: `selecciones` con **un grupo por línea de la receta**, con el nombre que informó el catálogo (`«{producto} (#{combo_productos.id})»`, `CatalogoDeChisperio::nombreDeGrupo`) y la opción elegida (variante o producto) con la cantidad por combo. Sale del snapshot del pedido (`combo_producto_id`).
- **`nota`** (≤500 caracteres, solo si hay algo): `Color: {color_personalizado_texto}` y `{add-on}: {texto}` por cada add-on con texto, separados por ` · `. Es parte del contenido del pedido (si cambia, el Central lo toma como edición). **No se loguea**: ningún mensaje de log, excepción ni respuesta incluye la nota ni datos del cliente.
- **Cliente**: se recortan los topes del Central (DNI 30, CP 10, teléfono 60…).
- **Sucursal y envío**: la API no tiene campo para ninguno. La sucursal con la que coordina el cliente (`Sucursal: Córdoba`) y «Envío gratis» (si el pedido califica) van al principio de `cliente.observaciones`. El **envío no es una línea** (solo se admiten producto, variante y combo) **ni suma al `total`**: su costo se informa al confirmar (11.4, `envio.costo_cobrado`).
- `total` = subtotal − descuento del cupón (sin envío ni recargo de tarjeta); `total_con_recargo` solo si el cliente eligió un plan de tarjeta.

### Cupón

El cupón **no se reparte entre las líneas**. Las líneas viajan a su precio final y el `total` viaja con el descuento ya restado: el Central toma `líneas − total` como descuento al confirmar (API.md, «El descuento no se manda dos veces»). Repartirlo habría obligado a prorratear centavos y a que un cambio de cupón reescriba todas las líneas. Al confirmar (11.4) **no** hay que mandar `descuento`.

### Ítems «no aplica»

Son los **productos con variantes activas** (en el catálogo local, 6: Pote de humo, Bengala de humo, Pistolas de Chispas Frías, Baston de bolsillo PULY, Chispa Fria 2x20 PULY y Lanza Confeti). En el Central tienen estado de vínculo `no_aplica` porque **no tienen número propio**: se vincula y se pide cada variante. Por eso nunca viajan como línea: lo que se compra es siempre una variante (el checkout ya exige elegirla). Un `tipo: producto` para uno de ellos daría `ITEM_NO_VINCULADO`; el validador de contrato de los tests lo rechaza. No hace falta omitirlos ni mandarlos «sin stock».

## Si el Central no deja reservar

| Situación | Qué pasa |
|---|---|
| **Sin stock** (`SinStockException`) | 422 con `stock.{producto_id}` (`stock.combo.{id}` para un combo) y el mensaje de siempre nombrando producto y color («No queda stock de X (Color).» / «Solo quedan N unidades de X (Color) (pediste M).»). El carrito no se pierde (queda en el navegador). No se creó pedido, reserva ni consumo de cupón. Se **relee el stock de esos ítems** (`GET /stock?tipo=&ids[]=`, `EspejoStock::refrescar`) y se vuelca al espejo, aunque la columna local estuviera atrasada. |
| **Central caído, timeout o circuito abierto** | **No se crea el pedido.** 503 con `central_no_disponible` y el texto «No pudimos confirmar el stock en este momento. Probá de nuevo en unos minutos o escribinos por WhatsApp.»; el checkout muestra el botón de WhatsApp con el carrito armado en el texto (`Checkout.jsx`). Un timeout deja una compensación `crear_dudoso` (el Central pudo haber reservado): el reintento del cliente con el mismo carrito reutiliza la referencia, **adopta** la reserva y anula esa compensación; si no reintenta, el cron cancela la reserva si existe. |
| **Ítem sin vincular / selección inválida / validación** | 422 con un mensaje general (`pedido`: «Uno de los productos no está disponible por el momento. Escribinos por WhatsApp…») y el detalle técnico solo en el log (código, sin datos del cliente). |

### La decisión «sin Central no se vende»

Es la decisión por defecto y vive en **una función**: `App\Rukoz\CheckoutCentral::permiteVenderSinReserva()` (variable `INTEGRACION_CHECKOUT_SIN_RESERVA`, `false` por defecto). Con `true`, si el Central no responde el pedido se crea igual **sin `rukoz_ref`**, con stock local como antes; el Central no se entera de esa venta (hay que cargarla a mano) y el próximo evento de stock pisa el descuento local. No se recomienda.

## Doble envío

La referencia se guarda en el **caché** (no en la sesión: dos requests de un doble clic leen la sesión antes de que ninguno la escriba), bajo la huella del contenido del pedido (cliente + líneas + notas + totales; sin `external_ref` ni `creado_at`).

- Mismo contenido → misma `rukoz_ref` y mismo `creado_at` (el Central compara el body byte a byte: otro `creado_at` sería `PEDIDO_YA_EXISTE`).
- Un lock del caché por huella serializa dos requests simultáneos; si ya existe el pedido de ese intento, se devuelve **el mismo** (`id`, `total`) sin reservar de nuevo.
- Tras crearse, el intento se conserva `CHECKOUT_VENTANA_DOBLE_ENVIO` segundos (120) para frenar reenvíos; pasado ese tiempo, repetir la misma compra es un pedido nuevo.
- Si el Central rechaza (sin stock, validación) el intento se olvida: un reenvío arma uno nuevo.
- `pedidos.rukoz_ref` es único: una segunda inserción con la misma referencia falla (y el paquete cancela, nunca duplica).

El `creado_at` que recibe el Central es el `created_at` del pedido guardado, así una edición posterior manda la misma hora.

## Editar y cancelar un pedido con reserva

**Editar** (`PedidoEdicionService::actualizarConReserva`): se calcula cómo quedaría el pedido (aplicando la edición dentro de una transacción que **siempre se deshace**, para que la regla de la edición viva en un solo lugar), se manda el contenido **completo** con `Rukoz::editarReserva` (HTTP, sin transacción ni locks) y recién si el Central acepta se aplica de verdad. Antes de aplicar se compara que lo guardado sea exactamente lo enviado.

- Sin stock → la edición **no se guarda** y se muestra el motivo (`items`: «Solo quedan N unidades de X (Color)…»).
- Central caído → no se guarda nada («No pudimos comunicarnos con el Sistema Central…»); queda anotada la reversión por si el PUT sí había llegado.
- `PEDIDO_NO_EDITABLE` (ya no está en reserva) → mensaje con el estado.
- Si falla la transacción local después de un PUT correcto, el paquete vuelve a mandar el pedido anterior (armado desde el estado local previo, no depende de lo que conserve `rukoz_requests`).
- **Cupón**: hoy la edición no puede cambiar el código (no hay campo); recalcula el monto desde el snapshot y el cupo no se toca. Si algún día se permite cambiarlo, hay que aplicar `liberarUso`/`consumirUso` (idempotentes, 11.0).

**Cancelar** (`App\Rukoz\ReservaDePedido::cancelar`, desde `cambiarEstado`): primero `Rukoz::cancelarReserva` (con el motivo), después una transacción local con `liberarUso` (idempotente) y el estado. **No** se repone stock local. Si el Central no responde, el pedido local queda `cancelado` con `rukoz_estado = cancelacion_pendiente`, la cancelación queda en las compensaciones y, al resolverse, un listener lo pasa a `cancelado`. Un pedido ya confirmado en el Central (`ANULAR_DESDE_CENTRAL`) no se cancela desde la web.

Pasar a despachado y volver a pendiente **no toca stock ni llama al Central** para estos pedidos.

**Pedidos viejos (sin `rukoz_ref`)**: siguen con el flujo de siempre (stock local) hasta terminar, aunque el interruptor esté encendido. Tests de los dos casos en `PedidoConReservaAdminTest`.

## Cancelación automática

`php artisan chisperio:cancelar-reservas-viejas [--dry-run] [--dias=N]`, programado **cada hora** (`routes/console.php`, solo con `RUKOZ_INTEGRACION`). Cancela como el admin los pedidos con `rukoz_ref`, **pendientes** y con **más de** `PEDIDOS_CANCELAR_DIAS` (3) días (exactamente 3 días todavía no; un segundo después, sí), con el motivo «Cancelado automáticamente (3 días sin confirmar)». Los pedidos sin `rukoz_ref` no se tocan nunca. `--dry-run` lista sin cancelar ni llamar al Central.

**Vencimiento de las reservas del Central:** las reservas **no vencen** (API.md §1 «Reservas»); el Central solo avisa a sus administradores de los pedidos reservados hace más de 3 días (`rukoz.pedidos_web.dias_aviso`, 3) y **no libera nada solo**. Estamos alineados: el aviso del Central y nuestra cancelación coinciden en 3 días, así que el aviso solo debería aparecer si la web no pudo cancelar (Central caído, compensación fallida). Si se quiere evitar avisos redundantes, subir `dias_aviso` del Central a 4 (no se tocó).

## Pendientes de la 11.2

- «Sin stock» (listado del admin y dashboard) mira también las variantes: `Producto::sinStock()` / `estaSinStock()` (sin variantes: `stock = 0`; con variantes: ninguna variante activa con stock `NULL` o `> 0`). Es lo contrario de `conStock` de la tienda.
- `chisperio:stock-cargar --local` corre **una vez por día** (03:45) como red de seguridad, solo con `INTEGRACION_STOCK` (vuelca `rukoz_stock` a las columnas sin llamar al Central).

## Migración, variables, comandos y tareas

- Migración aditiva `2026_10_19_120000_add_rukoz_reserva_to_pedidos_table`: `pedidos.rukoz_ref` (única, nullable), `rukoz_version`, `rukoz_estado` (`reservado` | `cancelado` | `cancelacion_pendiente`), `motivo_cancelacion`. Los pedidos existentes quedan en `NULL`.
- Variables: `INTEGRACION_CHECKOUT`, `INTEGRACION_CHECKOUT_SIN_RESERVA` (false), `PEDIDOS_CANCELAR_DIAS` (3), `CHECKOUT_VENTANA_DOBLE_ENVIO` (120). **En producción todo queda apagado.**
- Comandos nuevos: `chisperio:integracion-estado`, `chisperio:cancelar-reservas-viejas`.
- Tareas: `chisperio:cancelar-reservas-viejas` cada hora y `chisperio:stock-cargar --local` a las 03:45 (además de las `rukoz:*` del paquete). Hace falta el cron de `schedule:run`.

## Tests

`tests/Feature/Rukoz/CheckoutConReservaTest`, `PedidoConReservaAdminTest`, `CancelarReservasViejasTest`, `IntegracionEstadoTest`, `ContratoPedidoCentralTest` y `tests/Feature/SinStockConVariantesTest`. Usan el cliente **real** del paquete contra `tests/Support/CentralDePrueba` (un Central falso con estado detrás de `Http::fake`) que valida cada body contra el contrato 0.1.1 (`tests/Support/ContratoPedidoCentral`: reglas de `PedidoWebRequest` del Central, claves permitidas según los fixtures de `tests/fixtures/rukoz/` y existencia/forma contra el catálogo real de `CatalogoDeChisperio`, incluidos grupos y cantidades de las selecciones). Si el Central cambia un ejemplo, se vuelven a copiar los fixtures.

## Prueba local

1. Backup de la base y `php artisan migrate`.
2. `.env`: `INTEGRACION_CHECKOUT=true` (con `INTEGRACION_STOCK` y `RUKOZ_INTEGRACION`); `php artisan config:clear`.
3. `php artisan chisperio:integracion-estado` (ping OK, 0 ítems sin espejo).
4. **El Central tiene que tener sus migraciones al día** (en particular `2026_11_04_000001_nota_en_items_de_pedidos_web`, la columna `nota`): sin ella toda reserva da 500 `ERROR_INTERNO` y la tienda responde el mensaje de «no pudimos confirmar el stock».
5. Hacer un pedido en la tienda y mirarlo en el Central (*Integraciones → Pedidos web*); editarlo y cancelarlo desde el admin; el stock del Central baja al reservar y vuelve al cancelar.
