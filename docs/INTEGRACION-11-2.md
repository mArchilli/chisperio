# 11.2 — El stock viene del Central

Con `INTEGRACION_STOCK=true` (y `RUKOZ_INTEGRACION=true`), el stock que muestra y valida la tienda es el **«Disponible web» del Central**. La tienda sigue leyendo `productos.stock` y `producto_variantes.stock`; esas columnas las llena el Central (`App\Rukoz\EspejoStock`) y el admin deja de editarlas. Con el interruptor apagado todo funciona como antes.

## Cómo se espeja

Se escucha `StockActualizado` del paquete (lo disparan el webhook, el feed y `rukoz:sync-stock`). Para cada ítem `producto:id` o `variante:id`:

| Lo que informa el Central | Columna de Chisperío |
|---|---|
| un número | ese número (mínimo 0) |
| `a_pedido: true`, o `disponible: null` | `NULL` (ilimitado) |
| `vinculado: false` | **no se toca** (sigue con su stock local) |
| `combo` | se ignora: el combo no tiene columna, su stock se calcula con los componentes (`Combo::stockDisponible`) |

- Un producto con variantes no tiene número propio: el Central informa sus variantes.
- Un artículo del Central vinculado a varios ítems web (p. ej. RKZ-0009 en la PULY Dorada y en la Negra) actualiza todos.
- Se escribe con `DB::table` y solo si el valor cambia: no mueve `updated_at` (ordena la home).
- **Orden / idempotencia:** cada ítem de `rukoz_stock` guarda la `version` del stock publicado (contador por integración que solo crece). El paquete descarta lo que llega con versión menor a la guardada, así que un evento viejo posterior a uno nuevo no llega al espejo; como red extra, el listener compara la versión del evento con la de `rukoz_stock` y salta el ítem si el caché ya tiene una mayor. Repetir un evento no cambia nada.
- El listener se registra en `AppServiceProvider` solo con `INTEGRACION_STOCK` (no está en `app/Listeners` para que Laravel no lo descubra solo).

## Comandos

- `php artisan chisperio:stock-cargar` — carga completa: `GET /stock` → `rukoz_stock` (método `sincronizarStock()` del paquete) y vuelca **todo** el caché a las columnas (el evento del paquete solo trae lo que cambió en el caché, no alcanza si una columna quedó atrás). Idempotente. Resumen: actualizados, sin cambios, ilimitados, sin vincular. `--local` no llama al Central.
- `php artisan chisperio:stock-sin-espejo` — lista productos y variantes **activos** sin fila en `rukoz_stock` o con stock local distinto del espejo. Sale con código 1 si hay alguno. Los ítems `vinculado:false` se informan aparte (no son error). Un producto con variantes se revisa por sus variantes activas. Los combos no aplican (se calculan).

## Admin

Con el espejo activo, el campo de stock de un producto o de una variante pasa a solo lectura («El stock se administra en el Sistema Central») **si el Central lo vincula** (fila vinculada en `rukoz_stock`). Productos con variantes, ítems sin vincular o que el Central todavía no vio siguen editables. El backend ignora un `stock` que llegue en el request para esos ítems (`ProductoController::update` y `sincronizarVariantes`). Los combos no tienen campo de stock.

## Tienda

Con stock 0 o bajo (antes todo era NULL y casi no se había probado):

- Ficha de producto y de combo: «Sin stock» y sin panel de compra; en el carrito no se pasa del tope; el checkout rechaza con 422 y un mensaje claro (`No queda stock de X (Color).` / `Solo quedan N unidades de X…`). Combo con un componente en 0: sin stock y no se compra.
- **Arreglado:** el listado `/tienda` ignoraba las variantes: un producto con todos los colores en 0 no se marcaba «Sin stock» ni iba al final. Ahora sí (`TiendaController::index`, `Tienda.jsx`).
- **Arreglado:** el mensaje del checkout no nombraba el color y dos colores del mismo producto sin stock se pisaban el mensaje.

## Limitación temporal (resuelta en la 11.3)

**Sin `INTEGRACION_CHECKOUT` el checkout sigue descontando stock local.** Con el espejo activo, el próximo evento del Central pisa ese descuento. Por eso: **en producción no se enciende `INTEGRACION_STOCK` sin `INTEGRACION_CHECKOUT`.** Desde la 11.3 el checkout reserva en el Central y no descuenta stock local (ver `docs/INTEGRACION-11-3.md`).

## Recepción de eventos: webhook y feed

| | |
|---|---|
| Webhook (vía principal) | `POST /rukoz/webhook` (`RUKOZ_WEBHOOK_PATH`). Lo registra el paquete con `RUKOZ_INTEGRACION=true`, **fuera del grupo `web`**: sin sesión ni CSRF; la autenticación es la firma (`X-Rukoz-Signature` sobre el path+query tal cual llegan, `RUKOZ_SECRET`; ±300 s de reloj). Se carga en la integración del Central como `webhook_url` (https, sin redirecciones, puerto 443 en producción). Con `route:cache`, hacerlo con la integración encendida. |
| Feed (respaldo) | `rukoz:poll` (`GET /eventos`), cada 5 min (cada minuto con `RUKOZ_WEBHOOK_RECIBE=false`), con solapamiento y descarte por `event_id`. Trae lo que el webhook no entregó. |
| Reintentos | `rukoz:procesar-inbox`, cada minuto. |
| Reconciliación | `rukoz:sync-stock`, cada hora (`GET /stock` → `rukoz_stock`). |

Hace falta **el cron `* * * * * php artisan schedule:run`** (en local, `php artisan schedule:work`). No hace falta cola ni worker. Variables: `RUKOZ_INTEGRACION`, `RUKOZ_CENTRAL_URL`, `RUKOZ_API_KEY`, `RUKOZ_SECRET`, `INTEGRACION_STOCK`, y opcionales `RUKOZ_WEBHOOK_PATH`, `RUKOZ_WEBHOOK_RECIBE`.

**Importante (comprobado):** el Central **solo emite `stock.actualizado` si la integración tiene `webhook_url`**. El feed es respaldo de un webhook que falla (URL cargada pero caída), no reemplazo de la URL: sin URL, el stock llega solo por `rukoz:sync-stock` (cada hora) o `chisperio:stock-cargar`. Una web que no pueda recibir webhooks tiene que correr `rukoz:sync-stock` más seguido (`rukoz.tareas.sync_stock`).

`rukoz:sync-stock` (el de la hora) vuelca al espejo solo lo que cambió en `rukoz_stock`; si una columna local quedó atrás (por ejemplo por el descuento del checkout), la corrige `chisperio:stock-cargar`, no la tarea horaria.

## Prueba local

1. Backup de la base y, si hay migraciones, `migrate` (la 11.2 no tiene).
2. `.env`: `INTEGRACION_STOCK=true`; `php artisan config:clear`.
3. `php artisan chisperio:stock-cargar` y `php artisan chisperio:stock-sin-espejo` (debe dar 0).
4. En el Central, integración → URL `http://127.0.0.1:8002/rukoz/webhook`. Hacer un ajuste de stock: llega en ~30 s (el Central publica el stock una vez por minuto) y se ve en la base, la tienda y el admin.
5. `php artisan schedule:work` en Chisperío para el feed.
