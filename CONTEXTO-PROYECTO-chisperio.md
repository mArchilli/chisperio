# Chisperío — Contexto técnico del proyecto

> Generado el 2026-09-30 a partir del código (rutas, controllers, servicios, modelos y migraciones). No incluye credenciales, `.env` ni datos de clientes.
> Reemplaza al anterior `CONTEXTO_PROYECTO.md` (2026-08-30), que ya no cubría combos ni el filtro por sucursal del dashboard.

## 0. Resumen

E-commerce de pirotecnia/efectos para eventos. Catálogo público + panel `/admin` para admin y vendedores. **No hay pasarela de pago ni cálculo de costo de envío**: el pedido se registra en la base (con descuento de stock) y luego el frontend abre WhatsApp con el resumen hacia la sucursal elegida; pago y envío se coordinan por chat.

No existen tablas `clientes`, `vendedores` ni `sucursales`:
- **Cliente** = campos `cliente_*` dentro de `pedidos` (compra como invitado, sin cuenta).
- **Vendedor** = `users.role = 'vendedor'` con `users.sucursal` asignada.
- **Sucursal** = enum PHP `App\Enums\Sucursal` (`buenos-aires`, `cordoba`), guardada como string.

## 1. Stack y paquetes

**Backend** ([composer.json](composer.json))
- PHP `^8.2`, Laravel `^12.0`
- `inertiajs/inertia-laravel ^2.0`, `laravel/sanctum ^4.0` (instalado; no hay rutas API autenticadas con token), `laravel/tinker`, `tightenco/ziggy ^2.0` (helper `route()` en JS)
- Dev: `laravel/breeze ^2.3` (auth scaffolding), `pail`, `pint`, `sail`, `phpunit ^11.5`, `mockery`, `collision`, `faker`
- Sesiones, cache y cola en driver `database` (según `.env.example`; hay tabla `jobs` pero no hay jobs propios). `MAIL_MAILER=log`.
- Script `composer dev`: `artisan serve` + `queue:listen` + `pail` + `vite`.

**Frontend** ([package.json](package.json))
- React `^18.2`, `@inertiajs/react ^2`, Vite `^7`, `laravel-vite-plugin ^2`
- Tailwind (`tailwindcss ^3.2` + `@tailwindcss/vite ^4` + `@tailwindcss/forms`), `@headlessui/react ^2`
- `axios` (checkout y API de precios), `recharts` (gráficos), `lucide-react`, `react-hot-toast`
- `quill` + `dompurify` (descripción rica de productos), `yet-another-react-lightbox`

**Otros**: `bootstrap/app.php` usa `public_html/` como public path si existe (hosting compartido). Tests en `tests/Feature`, `tests/Unit`, `tests/Concurrency`.

## 2. Modelos y tablas

Stock: `stock = NULL` significa **ilimitado**. Si un producto tiene variantes, el stock real vive en cada variante y `productos.stock` se ignora.

### Usuarios y roles
**`users`**: `id, name, email (unique), password, role (admin|vendedor), sucursal (nullable; obligatoria si vendedor, null si admin), debe_cambiar_password (bool), email_verified_at, remember_token`.
- Enum `RolUsuario`: `admin`, `vendedor`. Enum `Sucursal`: `buenos-aires`, `cordoba`.
- Un vendedor se crea con `debe_cambiar_password = true`; el middleware `RequerirCambioDePassword` (global en grupo `web`) lo redirige a `password/configurar` hasta que ponga su clave.
- No se puede quitar el rol admin al único admin (`UsuarioController`).

### Catálogo
| Tabla | Campos clave | Relaciones |
|---|---|---|
| `categorias` | nombre, descripcion | N:M con productos (`categoria_producto`); 1:N `subcategorias` |
| `subcategorias` | nombre, descripcion, categoria_id | N:M con productos (`producto_subcategoria`) |
| `productos` | titulo, descripcion, **precio** (base), is_active, is_featured, **stock** (null=ilimitado) | hasMany: media, escalas, ofertas, variantes, movimientos_stock; belongsToMany: addons, categorias, subcategorias |
| `producto_media` | producto_id, tipo (imagen/video), orden, `producto_variante_id` (opcional, media específica de un color) | |
| `producto_escalas_precio` | producto_id, **cantidad_minima**, **precio_unitario** | modelo `EscalaPrecio` |
| `producto_variantes` | producto_id, nombre, color_hex, es_color_personalizado, **precio_adicional**, **stock**, sku, orden, is_active | "Otro / a elección del cliente" = `es_color_personalizado` |
| `addons` | nombre, descripcion, precio, requiere_texto, placeholder_texto, max_caracteres, is_active | catálogo global |
| `producto_addon` (pivot) | producto_id, addon_id, `precio_override`, orden | |
| `ofertas` | producto_id, tipo_descuento (porcentaje/fijo), valor_descuento, alcance (todos/especifico), producto_escala_precio_id, fecha_inicio, fecha_fin, is_active (+ legacy `precio_oferta`, `porcentaje_descuento`) | una "vigente" por producto (`ofertaVigente`) |
| `combos` | titulo, descripcion, **precio** (fijo), is_active, is_featured, tipo_descuento, valor_descuento, descuento_fecha_inicio/fin, descuento_activo, **envio_gratis** | hasMany `combo_productos`, `combo_media` |
| `combo_productos` | combo_id, producto_id, producto_variante_id (fija, o null = la elige el comprador), cantidad, orden | receta del combo |
| `documentos` | titulo, descripcion, tipo, url, ruta, orden, is_active | material para vendedores |

### Precios/cobro
- **`codigos_descuento`**: codigo (se guarda en mayúsculas), tipo_descuento (porcentaje/fijo), valor_descuento, activo, vigente_desde/hasta, limite_usos, usos_actuales.
- **`planes_pago_tarjeta`**: nombre, cuotas, recargo_porcentaje, orden, is_active. Seeder: `PlanPagoTarjetaSeeder`.
- **`configuracion_envio`**: fila única (id=1) con `monto_minimo` para envío gratis (0 = desactivado).

### Pedidos
**`pedidos`**
- Cliente: `cliente_nombre, cliente_dni, cliente_telefono, cliente_email, cliente_provincia, cliente_ciudad, cliente_codigo_postal, observaciones`
- Importes: `subtotal, total` (= subtotal − descuento_monto), `descuento_monto`
- Estado: `estado` (`pendiente|despachado|cancelado`), `despachado_at`
- `sucursal` (enum)
- Snapshot del descuento: `codigo_descuento_id (FK), codigo_descuento_texto, codigo_descuento_tipo, codigo_descuento_valor`
- Snapshot del plan de pago: `plan_pago_tarjeta_id (FK), plan_pago_nombre, plan_pago_cuotas, recargo_porcentaje, recargo_monto, total_con_recargo`
- Relaciones: hasMany `items`, hasMany `movimientosStock`, belongsTo `codigoDescuento`, `planPagoTarjeta`. Scopes: `facturables()` (estado ≠ cancelado), `deSucursal($s)`.
- **No hay `vendedor_id`**: el pedido no se asigna a un vendedor individual, solo a una sucursal.

**`pedido_items`**: `pedido_id, producto_id, producto_variante_id, combo_id, titulo, precio_unitario, cantidad, subtotal, precio_base_unitario, variante_nombre, variante_color_hex, color_personalizado_texto, recargo_variante_unitario, addons_seleccionados (JSON: addon_id, nombre, precio, texto_personalizado), addons_total_unitario, combo_items_seleccionados (JSON: componentes con producto_id, variante, cantidad_por_combo, cantidad_total)`. Todo es snapshot al momento de la compra.

**`movimientos_stock`**: `producto_id, producto_variante_id, pedido_id, cantidad (negativa = salida), motivo (pedido_creado | pedido_cancelado | ajuste_manual), stock_resultante`. Solo se registran movimientos de stock finito.

## 3. Flujo completo de un pedido

1. **Carrito** vive en `localStorage` (`CartContext.jsx`), no en el backend. Espeja el cálculo de precios en `resources/js/lib/pricing.js`.
2. **Checkout** (`GET /checkout`, `Checkout.jsx`): el cliente completa datos, elige forma de pago (efectivo/transferencia o un plan de tarjeta) y sucursal (se sugiere según provincia, editable; por defecto Buenos Aires). Valida el código de descuento contra `POST /api/codigos-descuento/validar` (solo previsualización).
3. **`POST /checkout`** → `PedidoController::store` (sin auth, JSON):
   1. Valida el request; exige al menos un `item` o un `combo`.
   2. Resuelve las líneas de combo (`resolverLineaCombo`: variante fija o elegida, validando que esté activa).
   3. **Chequeo optimista de stock** (`StockService::validarDisponibilidad`), sumando producto suelto + componentes de combos. Falla con 422 `stock.{producto_id}`.
   4. `DB::transaction`:
      - Por cada item: si el producto tiene variantes activas, la variante es obligatoria; precio vía `PricingService::calcularPrecio(... exigirVariante: true, cantidadParaEscala: total de unidades de ese producto en el pedido)`; valida add-ons (texto obligatorio si `requiere_texto`) y texto si la variante es "color personalizado".
      - Por cada combo: `calcularPrecioCombo`.
      - `subtotal` = suma de subtotales.
      - Código de descuento: `CodigoDescuentoService::resolverParaCheckout` (con `lockForUpdate`); si es inválido, aborta todo con 422.
      - `total = subtotal − descuento_monto`.
      - Plan de tarjeta: si viene `plan_pago_tarjeta_id` y está activo, `RecargoPagoService::calcular($total, $plan)` llena `recargo_monto` y `total_con_recargo`.
      - Crea `Pedido` (estado `pendiente`; `sucursal` = la elegida o Buenos Aires) y sus `items`.
      - Incrementa `codigos_descuento.usos_actuales`.
      - **`StockService::descontar($pedido)`**: descuenta el stock aquí (ver abajo). Si falta stock, `StockInsuficienteException` revierte toda la transacción (pedido, cupo del código incluido).
   5. Responde `201 {id, total}`.
4. **Post-pedido en el frontend**: arma el mensaje (`lib/whatsapp.js`), guarda el pedido en `sessionStorage`, abre `wa.me`/`whatsapp://` hacia el número de la sucursal y redirige a `/confirmacion-pedido` (con botón de reenvío). El pedido ya está guardado aunque el mensaje nunca se envíe. Los números de WhatsApp de cada sucursal están hardcodeados en `lib/whatsapp.js` (`WHATSAPP_SUCURSALES`).
5. **Pago**: no se procesa. Es manual por WhatsApp. El plan de tarjeta solo registra un recargo informativo.
6. **Asignación**: por sucursal, la elige el cliente. Cada vendedor ve solo los pedidos de su `users.sucursal`; el admin ve todos.
7. **Cambio de estado** (`PATCH /admin/pedidos/{pedido}/estado`, admin y vendedor de la misma sucursal). Transiciones (`EstadoPedido::puedeTransicionarA`):
   - `pendiente → despachado` (setea `despachado_at`) o `pendiente → cancelado`
   - `despachado → pendiente` (borra `despachado_at`); **no** se puede cancelar directo un despachado
   - `cancelado` es terminal
   - Al **cancelar** (en una transacción): `StockService::reponer` (suma stock y crea movimientos `pedido_cancelado`; es idempotente) y `CodigoDescuentoService::liberarUso` (decrementa `usos_actuales`). Pendiente↔despachado no toca stock.
8. **Dónde se toca el stock**: solo en `StockService` (`descontar` al crear, `reponer` al cancelar). Usa `lockForUpdate` y ordena las operaciones por producto/variante para evitar deadlocks. Los combos descuentan el stock de cada componente (`combo_items_seleccionados`). Hay `MotivoMovimientoStock::AjusteManual` definido en el enum, pero no vi ningún flujo que lo use.

## 4. Precios y envío

**Precio unitario** (`PricingService::calcularPrecio`, espejado en `resources/js/lib/pricing.js`):
1. **Escala por cantidad**: se usa la escala de mayor `cantidad_minima ≤ cantidad` (es un escalón, no interpolación). Si ninguna aplica, `productos.precio`. En checkout la cantidad que define la escala es el **total de unidades de ese producto en el pedido**, sumando todas las líneas (colores) del mismo producto.
2. **Oferta vigente** (`is_active` y fechas): se aplica sobre ese precio de lista, como porcentaje o valor fijo (nunca por debajo de 0). Si `alcance = especifico`, solo aplica si la escala resuelta es la apuntada por `producto_escala_precio_id`.
3. Se suman, sin descuento: `precio_adicional` de la variante y add-ons (`precio_override` del pivote o `addons.precio`).
4. `precio_unitario` guardado = (precio tras oferta) + recargo de variante + add-ons. `subtotal` de línea = unitario × cantidad.

**Combos**: precio fijo (`combos.precio`), sin escalas, variantes ni add-ons; admite un descuento propio con fechas (`descuentoVigente`).

**Total del pedido**:
- `subtotal` = suma de líneas
- `descuento_monto` (código): porcentaje sobre el subtotal, o fijo limitado al subtotal
- `total` = subtotal − descuento
- Con tarjeta: `recargo_monto` = total × recargo_porcentaje/100, y `total_con_recargo`; `monto_por_cuota` = total_con_recargo / cuotas (no se persiste; solo se calcula). **`pedidos.total` no incluye el recargo**, y Dashboard/Métricas suman `total`.

**Envío**: el sistema **no calcula costo de envío**. Solo existe el umbral de **envío gratis**:
- `configuracion_envio.monto_minimo` (editable en `/admin/configuracion/envio`; 0 = desactivado), compartido a todas las páginas por `HandleInertiaRequests`.
- El frontend evalúa `subtotal bruto ≥ monto_minimo` (`BarraEnvioGratis`, `Checkout.jsx`) y lo indica en el mensaje de WhatsApp. **No se guarda en `pedidos`**.
- Los combos con `envio_gratis = true` también lo marcan en el mensaje.

## 5. Dashboard (`GET /dashboard`, `auth` + `verified`)

`DashboardController::index`. **Ambos roles entran**. La sucursal del vendedor filtra los datos de pedidos; el admin ve el total de las dos.
- Pedidos pendientes (link a la lista filtrada)
- Despachados en el mes en curso (por `despachado_at`)
- Productos activos / total, y "sin stock" (`stock = 0`, solo aparece si > 0). **Esos datos de catálogo son globales**, no filtran por sucursal.
- Producto más vendido (suma de unidades en pedidos no cancelados, filtrado por sucursal)
- Gráfico de pedidos por día, últimos 30 días, filtrado por sucursal

Otras pantallas por rol:
- **Admin**: menú completo (categorías, subcategorías, productos, combos, ofertas, códigos de descuento, add-ons, planes de pago, **Métricas**, usuarios, envío gratis, documentos con CRUD).
- **Vendedor**: Dashboard, Pedidos (solo los de su sucursal), Precios (solo lectura) y Documentos (solo activos). Si entra por URL a una ruta `role:admin`, recibe 403 con la página `Error.jsx`.
- **Métricas** (`/admin/metricas`, solo admin): facturación, cantidad de pedidos y ticket promedio del período (mensual o diario), comparación con el período anterior, serie para el gráfico y top 5 productos por monto. Usa pedidos `facturables` (≠ cancelado) y suma `total`.
- **Listado de pedidos** (`/admin/pedidos`): por defecto filtra `pendiente`. Tarjetas: pendientes, despachados, cancelados, unidades vendidas y facturación (respetan la sucursal).
- Observación: en [Dashboard.jsx](resources/js/Pages/Dashboard.jsx) los "Accesos rápidos" (Categorías, Subcategorías, Productos, Ofertas) se muestran a todos los roles aunque sean `role:admin`; para un vendedor llevan a un 403.

## 6. Rutas, jobs, eventos y webhooks

**Públicas** ([routes/web.php](routes/web.php))
- `GET /` (home con destacados), `/tienda` (catálogo), `/tienda/{producto}`, `/tienda/combos/{combo}`, `/contacto`, `/carrito`, `/checkout`, `/confirmacion-pedido`
- `POST /checkout` (crea el pedido)
- `routes/legacy_redirects.php`: redirects 301 del WordPress anterior (se cargan primero)

**API** ([routes/api.php](routes/api.php), prefijo `/api`, sin auth)
- `GET /api/productos/{producto}/precio?cantidad&variante_id&addon_ids[]`: precio calculado con desglose
- `POST /api/codigos-descuento/validar`: valida un código contra un subtotal (solo previsualización)

**Auth** ([routes/auth.php](routes/auth.php), estilo Breeze): login/logout, forgot/reset password, verificación de email, confirm-password, `password/configurar` (cambio forzado para vendedores nuevos), `PUT /password`. No hay registro público (no existe ruta `register`).

**Panel** (`auth`)
- `GET/PATCH /profile`, `DELETE /profile`
- `GET /admin/precios` (admin y vendedor)
- `GET /admin/documentos` (admin y vendedor)
- `GET /admin/pedidos`, `GET /admin/pedidos/{pedido}`, `PATCH /admin/pedidos/{pedido}/estado` (admin y vendedor, scoped por sucursal)
- **Solo `role:admin`**:
  - Resources `admin/categorias`, `subcategorias`, `productos`, `combos`, `ofertas`, `codigos-descuento`, `addons`, `planes-pago`, `usuarios` (sin `show`)
  - Toggles: `productos/{p}/toggle-featured`, `combos/{c}/toggle-featured`, `ofertas/{o}/toggle-active`, `codigos-descuento/{c}/toggle-active`, `addons/{a}/toggle-active`, `planes-pago/{p}/toggle-active`, `documentos/{d}/toggle-active`
  - CRUD de `admin/documentos`
  - `GET /admin/metricas`
  - `GET/PATCH /admin/configuracion/envio`

**Middleware**: alias `role:<rol>` (`EnsureUserHasRole`), `RequerirCambioDePassword` (global en `web`), `HandleInertiaRequests` (comparte `auth.user`, `flash`, `configuracionEnvio.montoMinimo` y `planesPagoTarjeta`). `bootstrap/app.php` renderiza 404 con `NotFound.jsx` y 403/5xx con `Error.jsx`.

**Jobs / eventos / webhooks / mails / scheduler**: **no hay ninguno** propio. No existen clases en `app/Jobs`, `app/Events`, `app/Listeners` ni `app/Mail`, ni tareas en `routes/console.php` (solo el comando `inspire` de ejemplo), ni rutas de webhook. La cola `database` está configurada pero sin uso.

**Comandos artisan propios**: `ofertas:backfill-descuento` (completa `tipo_descuento`/`valor_descuento` de ofertas legacy a partir de `precio_oferta`/`porcentaje_descuento`).

**Servicios** (`app/Services`): `PricingService`, `StockService`, `CodigoDescuentoService`, `RecargoPagoService`. DTOs: `PriceResult`, `ComboPriceResult`. Excepciones: `StockInsuficienteException`, `VarianteRequeridaException`.

**Seeders**: `CategoriaSeeder`, `SubcategoriaSeeder`, `ProductoSeeder`, `PlanPagoTarjetaSeeder`, `UserSeeder` (no revisé su contenido por si trae credenciales).

## 7. Puntos a tener en cuenta

- `pedidos.total` excluye el recargo de tarjeta: para facturación real con tarjeta habría que usar `total_con_recargo` (hoy las métricas no lo hacen).
- El envío gratis es solo informativo (no se persiste ni se valida en el servidor).
- No hay asignación a un vendedor individual ni una tabla de sucursales; agregar una sucursal implica tocar el enum y los números de WhatsApp en el frontend.
- El ajuste manual de stock (`AjusteManual`) está previsto en el enum, pero no vi ningún flujo que lo cree.
- El `.env.example` podría no reflejar la configuración real (el documento anterior menciona MySQL y zona horaria `America/Argentina/Buenos_Aires`; no abrí el `.env` para confirmarlo).
