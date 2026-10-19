# Relevamiento para la integración con el Sistema Central Rukoz — Chisperío

Proyecto: **Chisperío** (`C:\Users\MatiasPC\Desktop\chisperio`), rama `main`, commit `c4e77b6` (2026-10-12), árbol limpio.
Alcance: **solo lectura**. No se modificó código, configuración, base ni dependencias; el único archivo escrito es este informe.

Qué se hizo y qué no (para saber cuánto confiar en cada dato):

| Qué | Cómo |
|---|---|
| Código | Leído completo en las partes que tocan catálogo, stock, pedidos, panel, checkout y frontend asociado. |
| Base **local** (MySQL de XAMPP, `chisperio`, ya encendido, no lo inicié yo) | Solo `SELECT` agregados y `information_schema`, con la sesión en `READ ONLY`. **Sin datos personales**: solo conteos. Los números de §2 y §4 son de esta copia local, **no de producción**. |
| Tests | Corrí `php artisan test` **excluyendo** `StockServiceConcurrencyTest` y con `--do-not-cache-result` (ver §1). `git status` quedó limpio después. |
| Producción | **No verificado** nada de producción (valores del `.env` real, hosting, cantidad de pedidos reales). Cada vez que algo depende de eso lo marco **(no verificado)**. |

Referencias leídas: `sistema-rukoz/docs/API.md` + `INTEGRACION-WEB.md`, `rukoz-core-client/README.md` (v0.1.0) y el relevamiento de Chispas Frías.

---

## 0. Resumen ejecutivo (lo que más condiciona el diseño)

1. **Tres cosas son distintas a Chispas Frías y cambian el plan:**
   - **Los pedidos se pueden editar después de creados**, incluso ya despachados, con precios libres (`PedidoEdicionService`). El Central solo admite `PUT` mientras el pedido está `reservado`. → Hay que decidir qué pasa con la edición y reestructurar el servicio (§4.6, §7.3).
   - **Combos "mixtos"**: una línea puede ser fija (producto o variante fija) y otra de elección del comprador, en el mismo combo. El Central solo conoce combos `fijo` **o** `seleccion`. Hay un combo así en la base local. → se modela como `seleccion` con un grupo por línea (§7.1).
   - **Sucursales (Buenos Aires / Córdoba)**: cada pedido y cada vendedor tienen sucursal; el Central tiene **un solo stock físico en Buenos Aires** y una integración = una empresa + un punto de atención. Es decisión de negocio (§Preguntas).
2. **Stock: `null` = ilimitado en productos y variantes** (no hay `9999` como en Chispas Frías). En la copia local **18/18 productos y 30/30 variantes tienen `stock = NULL`** y `movimientos_stock` está vacía: hoy no se controla stock de verdad. El listener de ejemplo del README (usa `9999`) **no sirve tal cual**.
3. **SKU: `productos` no tiene columna `sku`.** Solo `producto_variantes.sku` (nullable, sin índice único, **y el panel de admin no permite cargarlo**: `ProductoController::sincronizarVariantes` no lo escribe). 100% sin SKU → el Central no podrá sugerir vínculos; hay que vincular ~48 ítems a mano o agregar SKU primero.
4. **Todo el checkout es una sola transacción con locks** (`PedidoController.php:412-649`) que valida cupón con `lockForUpdate`, crea pedido, y descuenta stock. Hay que partirla: cálculo puro → `Rukoz::reservar` (HTTP) → transacción local. El cupón se consume **dentro** de `transaccionLocal`.
5. **Bug real encontrado, sin relación con la integración:** el botón "eliminar código de descuento" no hace nada (parámetro de ruta `{codigos_descuento}` vs `$codigo_descuento` en `CodigoDescuentoController.php:86`) y la guarda "no se borra un código ya usado" nunca se evalúa. Explica 2 de los 4 tests rojos (§1, §6).
6. **Sin throttling** en el checkout público ni en `/api/codigos-descuento/validar`. Hoy es molesto; con el Central es peor: cada pedido **reserva stock compartido con Chispas Frías** y las reservas no vencen (§6).
7. Lo que está **mejor** que en Chispas Frías: no hay `env()` fuera de `config/`; el rol por defecto de `users` es `vendedor` (no admin); el número de WhatsApp de cada sucursal está centralizado en un solo archivo.

---

## 1. Stack y entorno

### 1.1 Versiones

| Componente | Versión | Fuente |
|---|---|---|
| PHP | `^8.2`; local **8.2.12** ZTS (Windows) | `composer.json:9`, `php -v` |
| Laravel | `laravel/framework ^12.0` | `composer.json:11` |
| Node / npm | v22.18.0 / 10.9.3 (local) | `node -v` |
| Front | **Inertia 2 + React 18** (`@inertiajs/react ^2`, `react ^18.2`), Vite 7, Tailwind 3, Ziggy 2 | `package.json` |
| Otros paquetes | `laravel/sanctum ^4` (**instalado, sin uso**: no hay `HasApiTokens`, ni `config/sanctum.php`), Breeze (dev), `recharts`, `quill`, `dompurify`, `embla-carousel-react`, `yet-another-react-lightbox`, `react-hot-toast` | `composer.json`, `package.json` |
| Sin | Livewire, Horizon, Telescope, Mercado Pago SDK, ningún cliente de transportista | — |

El paquete `rukoz/core-client` pide `php ^8.2` e `illuminate/* ^11\|^12`: **compatible**.

### 1.2 Tests

- `phpunit.xml:21-34`: fuerza `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, `CACHE_STORE=array`, `SESSION_DRIVER=array`, `QUEUE_CONNECTION=sync`, `MAIL_MAILER=array`. **No hay `.env.testing`.** Los `<env>` de PHPUnit ganan sobre el `.env` (dotenv no pisa variables ya definidas), así que la suite no toca la base de desarrollo.
- **Excepción importante:** `tests/Feature/StockServiceConcurrencyTest.php` (setUp ~L55-65, `prepararBaseDeDatosDeTest` ~L173-210) **se conecta al MySQL real, hace `CREATE DATABASE IF NOT EXISTS chisperio_stock_lock_test` y `migrate:fresh` sobre ella**, y lanza un proceso hijo (`tests/Concurrency/descontar_worker.php`). Con MySQL encendido (como ahora) **no se skipea y escribe**. Por eso **no lo corrí**; excluí ese test con `--filter='^(?!.*StockServiceConcurrencyTest)'`.
- Cantidad: **383 métodos** de test (grep de `function test_`/`#[Test]` en ~50 archivos). Ejecuté 382.
- Evidencia de que ese test ya escribió antes en MySQL: la base `chisperio_stock_lock_test` existe en el MySQL local con 32 tablas creadas el 2026-10-08 (no por mi corrida: la excluí).
- Resultado: **378 pasan, 4 fallan** (24,6 s):

| Test | Por qué falla (diagnóstico leyendo código y `route:list`, no abrí un navegador) |
|---|---|
| `CodigoDescuentoTest::test_no_se_puede_eliminar_codigo_ya_usado` (`:181`) | **Bug real**: `DELETE admin/codigos-descuento/{codigos_descuento}` vs `destroy(CodigoDescuento $codigo_descuento)` (`CodigoDescuentoController.php:86`). Laravel no hace el binding y entrega un modelo vacío: `usos_actuales` es `null`, `delete()` no borra nada, redirige "OK". |
| `RoleAccessTest::test_admin_puede_eliminar_codigo_descuento` (`:127`) | Mismo bug (el código sigue en la base después del "borrado"). `toggleActive` sí anda porque su ruta usa `{codigo_descuento}` explícito (`routes/web.php`, grupo `role:admin`). |
| `VendedorFlujoCompletoTest::test_vendedor_puede_crear_un_producto_con_stock` (`:34`) | Test **viejo**: el vendedor ya no puede crear productos (`routes/web.php:128` mete `admin/productos` en `role:admin`); el 403 no genera errores de sesión y la fila no se crea. |
| `VendedorFlujoCompletoTest::test_vendedor_puede_editar_producto_y_actualizar_stock` (`:57`) | Ídem. |

- Conclusión: **la suite no está verde.** Hay que dejarla verde antes de tocar nada (§Plan 11.0). `UserFactory` crea admin por defecto (`database/factories/UserFactory.php`), la migración crea `vendedor`: los tests no cubren el default real.
- `.phpunit.result.cache` existe en la raíz (ignorado por git); no lo toqué (`--do-not-cache-result`).

### 1.3 Zona horaria, `env()`, colas, scheduler

- `config/app.php:68`: `'timezone' => env('APP_TIMEZONE', 'UTC')`. `.env.example` trae `APP_TIMEZONE=America/Argentina/Buenos_Aires` pero el `.env` **local no lo define → UTC**. El `.env` de producción: **(no verificado)**.
  - Impacto: `MetricasController.php:64-100` agrupa con `DATE(created_at)` / `HOUR(created_at)` sobre lo guardado (que es hora de `app.timezone` al escribir). Si producción corre en UTC, "pedidos por día" y "ventas por hora" están corridos 3 h. `DashboardController::pedidosPorDia` igual. El frontend convierte bien las fechas ISO (`new Date(iso).toLocaleString('es-AR')`), así que lo visible al usuario en el detalle del pedido es correcto; lo incorrecto son los **agrupamientos** por fecha.
  - Impacto en la integración: `creado_at`/`confirmado_at` van en ISO 8601 con offset; con `UTC` van bien pero el Central los muestra en UTC.
- **`env()` fuera de `config/`: ninguno** en `app/`, `routes/`, `bootstrap/`, `resources/views/`, `database/` (grep). Los `env()` están en `config/productos.php:16,18`, `config/documentos.php:15`, `config/services.php:32` (Meta Pixel) y los del esqueleto. Solo `StockServiceConcurrencyTest` usa `env()` (es un test). → `config:cache` es seguro.
- Colas: `QUEUE_CONNECTION=database` (`.env`), tablas `jobs`/`failed_jobs` existen (0 filas). **Ningún código despacha jobs.** El paquete **no necesita cola ni worker** (README: "Sin cola, sin worker").
- Scheduler: `routes/console.php` solo trae `inspire`; no hay `Schedule::`. Hay que instalar el cron `* * * * * php artisan schedule:run` en el hosting (el paquete se registra solo en el scheduler).
- Mail: `MAIL_MAILER=log`. **No existen** `app/Mail`, `app/Notifications`, `app/Jobs`, `app/Events`, `app/Listeners`, `app/Observers`.
- Sesión y caché: `database` (`.env`). Carrito del cliente: **`localStorage`** (`resources/js/Context/CartContext.jsx:10`), no sesión servidor.

### 1.4 Hosting (lo que se deduce del repo)

- `bootstrap/app.php:67-69`: si existe `../public_html` (hermano del proyecto) se usa como `public_path`. → **Hosting compartido tipo cPanel** (inferencia, **no verificado**), con el proyecto fuera del webroot.
- `public/.user.ini`: `upload_max_filesize=64M`, `post_max_size=64M`, `max_execution_time=300`, `memory_limit=256M` (típico de FastCGI/LiteSpeed compartido).
- `public/.htaccess` es el estándar de Laravel (con quitado de `/` final). **No fuerza HTTPS ni `www`/apex**: si eso está en el cPanel, no se ve en el repo.
- No hay scripts de deploy, ni `.github/`, ni CI. `vendor/` y `public/build` están en `.gitignore` → el despliegue sube `vendor`/`build` por fuera de git **(no verificado cómo)**.
  - **Consecuencia para el paquete:** `rukoz/core-client` está pensado como *path repository con symlink* (`../rukoz-core-client`). En producción tiene que viajar **copiado dentro de `vendor/`** (no symlink) o desde un repo git privado.
- URL pública usada por el script de catálogo: `https://chisperio.com.ar` (`scripts/sync-public-catalog.mjs:12`), mientras el `.env` local dice `APP_URL=http://www.chisperio.com.ar`. El `webhook_url` del Central **no admite redirecciones** (API.md §6): hay que usar la URL canónica final (HTTPS, puerto 443, sin redirect www→apex).
- PWA: `public/sw.js` (cache-first solo de `/build/assets/*` y favicons; navegaciones siempre a la red; **ignora todo lo que no sea GET**). No interfiere con `POST /rukoz/webhook` ni con el checkout.
- Puntos que ya funcionan como base: `routes/api.php` está registrado en `bootstrap/app.php:13` (con 2 rutas públicas); el 403/404/5xx tienen páginas Inertia propias (`bootstrap/app.php:33-64`) y devuelven JSON crudo cuando `expectsJson()`.

---

## 2. Modelo de catálogo

Conteos de la **base local** (copia del catálogo público; ver aviso al inicio):

| Concepto | Local |
|---|---|
| Productos | 18 (18 activos, 18 con `stock NULL`) |
| Productos con variantes | 6 |
| Variantes | 30 (30 activas, **30 sin SKU**, 30 con `stock NULL`, 1 "a elección del cliente", 1 con recargo) |
| SKUs repetidos en variantes | 0 (no hay ninguno cargado) |
| Combos | 1 (activo, con envío gratis, sin descuento) |
| Líneas de combo | 2 (ninguna con variante fija; **1** es "el comprador elige color") |
| Add-ons / vínculo producto-addon | 1 / 1 |
| Escalas de precio por cantidad | 55 |
| Ofertas | 0 |
| Categorías / subcategorías | 4 / 17 |

### 2.1 Tablas y columnas

**`productos`** (`Producto.php`; columnas verificadas en la base): `id`, `titulo`, `descripcion`, `precio decimal(10,2)`, `is_active`, `is_featured`, `sugerir_en_carrito`, **`stock int NULL`**, timestamps. **No hay `sku`.** Relaciones: `categorias`/`subcategorias` (N:M), `media` (`producto_media`, con `producto_variante_id` opcional), `escalasPrecio` (`producto_escalas_precio`: `cantidad_minima`, `precio_unitario`), `ofertas`, `variantes`, `addons` (pivote `producto_addon`: `precio_override`, `orden`), `comboProductos`, compatibles (`producto_compatible`, simétrica).

**`producto_variantes`** (`ProductoVariante.php`): `id`, `producto_id` (cascade), `nombre` (≤100), `color_hex`, **`es_color_personalizado`**, `precio_adicional` (recargo fijo por unidad), **`stock int NULL`**, **`sku varchar NULL`**, `orden`, `is_active`. Único: `(producto_id, nombre)`. **Sin índice único en `sku`.**

**`combos`** (`Combo.php`): `titulo`, `descripcion`, `precio` (fijo), `is_active`, `is_featured`, descuento propio (`tipo_descuento`, `valor_descuento`, fechas, `descuento_activo`), `envio_gratis`. **No tiene SKU ni stock propio.**
**`combo_productos`** (`ComboProducto.php`): `combo_id`, `producto_id` (RESTRICT), **`producto_variante_id` NULL** (variante fija; `NULL` = la elige el comprador si el producto tiene variantes activas), `cantidad`, `orden`. **Sin único**: un producto puede repetirse dentro del combo.

### 2.2 SKU

- Producto: **no existe**. Variante: existe pero nullable, sin único y **no editable desde el panel** (`ProductoController.php:541-555` validación y `:606-614` atributos no incluyen `sku`; ningún `.jsx` lo menciona; solo está en `ProductoVariante::$fillable`, `ProductoVariante.php:24`).
- Productos sin SKU: **18/18**. Variantes sin SKU: **30/30**. Repetidos: **0** (porque no hay).
- Combos: sin SKU (el Central no los vincula, igual: "Combo fijo/selección: no tiene vínculo propio").
- IDs estables: las variantes se actualizan por `id` (`sincronizarVariantes`, `ProductoController.php:616-621`), no se recrean; pero **se borran** las que el formulario deja de mandar (`:601`).

### 2.3 Variantes "a elección del cliente"

- Existen: `es_color_personalizado` (máximo una por producto, validado en `ProductoController.php:651-662`). Si el cliente la elige, tiene que escribir el color libre → `pedido_items.color_personalizado_texto` (validado en `PedidoController.php:490-500`). La variante en sí es "Otro / a elección del cliente"; el color real **vive solo en ese texto**.
- Para el Central esto es el caso de **genérico** ("color a elección"): lo vincula un admin a un artículo genérico y el color real lo elige quien empaqueta. **El API no tiene campo para el texto libre** (ver Preguntas).

### 2.4 Combos

- Sí hay. Cada línea (`combo_productos`) es: producto sin variantes, **variante fija**, o producto con variantes **a elección del comprador** (una sola variante para toda la `cantidad` de la línea).
- Cómo se guarda la elección en el pedido: **una sola fila** en `pedido_items` con `combo_id` y `combo_items_seleccionados` (JSON): por componente `producto_id, producto_variante_id, titulo, variante_nombre, variante_color_hex, cantidad_por_combo, cantidad_total` (`ComboPedidoResolver.php:62-73`). **El snapshot no guarda `combo_producto_id`** (hace falta para armar `selecciones`, ver §7.1).
- Precio: fijo (`combos.precio`) con descuento propio opcional (`PricingService::calcularPrecioCombo`); sin escalas, ni variante, ni add-ons.

### 2.5 Precios (todo vive en la web; el Central solo recibe el precio cobrado)

`PricingService::calcularPrecio` (`PricingService.php:46-110`): escala por cantidad (la de mayor `cantidad_minima ≤ cantidad`; en checkout la cantidad es el **total de unidades de ese producto en el pedido**, sumando colores, `PedidoController.php:423-425`) → oferta vigente sobre el precio de lista → `+ precio_adicional` de variante `+ Σ add-ons`. Recargo por tarjeta: `RecargoPagoService` (informativo, sobre el total del pedido; **no** está en `pedidos.total`). Código de descuento: porcentaje/fijo sobre el subtotal (`CodigoDescuentoService`). Hay dos implementaciones de las reglas de precio: PHP y `resources/js/lib/pricing.js` (a mano).

### 2.6 "A pedido" / sin control de stock

No hay un flag. **`stock = NULL` es la única forma de "no controlar"** (producto o variante), y es el valor por defecto de todo el catálogo (`2026_08_15_051921_add_stock_to_productos_table.php`). Equivale exactamente a `a_pedido: true` del Central.

---

## 3. Stock

### 3.1 Dónde vive y qué significa

- `productos.stock` y `producto_variantes.stock`, ambos `int NULL`. **`NULL` = ilimitado**; `0` = agotado. No hay `9999` ni valores mágicos (a diferencia de Chispas Frías).
- Si el producto tiene variantes, `productos.stock` se **ignora**: manda cada variante (`Producto::tieneStockDisponible`, `Producto.php:251-260`; `scopeConStock`, `Producto.php:275-286`; `ComboProducto::stockDisponibleUnidad`, `ComboProducto.php:66-101`).
- **Combos: sin columna**; se derivan de los componentes (`Combo::stockDisponible`, `Combo.php:106-122`): mínimo entre líneas de `floor(stock de la línea ÷ cantidad)`; sin selección todavía se usa la suma de variantes activas.
- **No hay stock por sucursal.** La sucursal solo existe en `pedidos.sucursal` y `users.sucursal` (enum `Sucursal`, `app/Enums/Sucursal.php`).

### 3.2 `StockService` (`app/Services/StockService.php`, 366 líneas)

| Método | Línea | Qué hace |
|---|---|---|
| `validarDisponibilidad(array $items)` | 24 | Chequeo optimista sin lock; devuelve faltantes `[producto_id, variante_id?, cantidad, stock_disponible]`. |
| `descontar(Pedido)` | 83 | `DB::transaction` + `lockForUpdate` por fila, orden estable (producto_id, variante_id), `StockInsuficienteException`. Si `stock === null` no hace nada **y no registra movimiento** (`:276`, `:300`). |
| `reponer(Pedido)` | 110 | Idempotente por existencia de un movimiento `pedido_cancelado` del pedido (`:113-119`). Como con stock `NULL` no se crean movimientos, la guarda no protege nada en ese caso (no importa: no hay nada que reponer). |
| `ajustarPorEdicion($pedido, $antes, $despues)` | 150 | Aplica la **diferencia** al editar un pedido (movimientos `ajuste_manual`). |
| `operacionesDe(Pedido)` | 223 | Foto `{producto_id, producto_variante_id, cantidad}` del pedido (combos expandidos). |
| privados | 240, 272, 296, 326, 346 | `operacionesOrdenadasParaLock`, `descontar/reponer` de producto y variante. |

### 3.3 Todos los lugares que leen o modifican stock

**Escriben (modifican `stock`):**

| Dónde | Qué |
|---|---|
| `StockService::descontarProducto/Variante` (`:272-324`) y `reponerProducto/Variante` (`:326-365`) | Único camino transaccional. Llamados desde: |
| → `PedidoController::store` `:646` | `descontar` al crear el pedido (misma transacción). |
| → `PedidoController::cambiarEstado` `:269` | `reponer` al pasar a `cancelado` (transacción con `liberarUso` `:270` y el update de estado). |
| → `PedidoEdicionService::actualizar` `:84` | `ajustarPorEdicion` (dentro de la transacción de la edición, con `lockForUpdate` del pedido `:59`). |
| `ProductoController::store` `:149` / `update` `:293` | Edición manual de `productos.stock` (`nullable|integer|min:0`, `:126`/`:270`; vacío → `NULL`). **No registra movimiento.** |
| `ProductoController::sincronizarVariantes` `:611` | Edición manual de `stock` de cada variante (`:549`). **No registra movimiento.** Además **borra** las variantes que el form no manda (`:601`). |
| `database/seeders`, `factories`, tests | Datos de prueba. |

No hay importaciones masivas, ni devoluciones, ni endpoints que escriban stock.

**Leen:**

| Dónde | Para qué |
|---|---|
| `Producto.php:251, 275` · `ProductoVariante.php:63-71` · `ComboProducto.php:66` · `Combo.php:106-129` | Disponibilidad y filtro de listados. |
| `StockService::validarDisponibilidad` (`:24`) | Pre-chequeo del checkout (`PedidoController.php:405`). |
| `TiendaController.php:295` | Orden: productos con `stock = 0` al final (solo mira `productos.stock`; productos con variantes quedan en `NULL`). `:225`, `:554` (stock de combos), `:568`, `:573`, `:575` (stock de componentes/variantes expuesto al navegador). Listados con `conStock()`: home (`routes/web.php:~62-73`), relacionados, sugerencias. |
| `PedidoController::edit` `:146` | Stock de variantes en la pantalla de edición del pedido. |
| `DashboardController.php:26` | "Sin stock" = `productos.stock = 0` (no mira variantes). |
| `ComboController::productosDisponibles` `:180` | Catálogo del repeater. |
| Frontend | `resources/js/lib/stock.js`, `lib/combo.js`, `Context/CartContext.jsx` (foto del stock al agregar, tope de cantidad, revalida al montar), `Components/{PillsCantidad,RepartoVariantes,VarianteColorSwatches,NuevaLineaPedido}.jsx`, `Pages/{Tienda,ShowProduct,ShowCombo,Carrito,Checkout}.jsx`, `Pages/Admin/{Productos,Precios,Pedidos}/…`. El stock **viaja al navegador** en los props de Inertia. |

### 3.4 `inStock()` equivalentes

`Producto::scopeConStock` (`Producto.php:275`) **sí mira variantes** (si el producto tiene variantes exige alguna **activa** con `stock NULL` o `> 0`; si no, usa `productos.stock`). `Producto::tieneStockDisponible` igual. El punto ciego es `TiendaController.php:295` y `DashboardController.php:26`, que solo miran `productos.stock`.

### 3.5 Movimientos

`movimientos_stock` (`MovimientoStock`): `producto_id`, `producto_variante_id`, `pedido_id`, `cantidad` (±), `motivo` (**enum de base**: `pedido_creado|pedido_cancelado|ajuste_manual`), `stock_resultante`. Vacía en la copia local (todo es ilimitado). `ajuste_manual` **sí se usa** acá, pero solo por la edición de pedidos (`StockService.php:203-211`), no por ajustes manuales del panel.

---

## 4. Checkout y pedidos

### 4.1 Flujo completo de compra

```
[Navegador]  carrito en localStorage (CartContext.jsx)
   │  /carrito  →  /checkout (Checkout.jsx: datos, sucursal, forma de pago, cupón)
   │  handleSubmit  (Checkout.jsx:403)  →  axios.post(route('checkout.store'))   (:423)
   ▼
[Servidor]  POST /checkout  (routes/web.php:52)  → PedidoController::store (PedidoController.php:322)
   1. validate()                                              :324-355
   2. exige ≥1 item o combo                                   :357
   3. resolverLineaCombo → ComboPedidoResolver                :371
   4. arma el pre-chequeo aplanado (producto:variante)        :373-401
   5. StockService::validarDisponibilidad  (sin lock)         :405  → 422 stock.{producto_id}
   6. try { DB::transaction(…)                                :412
        a. recarga productos/escalas/ofertas                  :413
        b. por item: variante obligatoria, calcularPrecio,
           add-ons, color libre                               :430-520
        c. por combo: calcularPrecioCombo                     :526-547
        d. CodigoDescuentoService::resolverParaCheckout
           (lockForUpdate del código)                         :554
        e. plan de tarjeta + RecargoPagoService               :565-593
        f. envío gratis (monto mínimo snapshot / combos)      :604-607
        g. Pedido::create                                     :609
        h. items()->createMany                                :632
        i. increment('usos_actuales') del código              :638
        j. StockService::descontar($pedido)  (locks)          :646
      }
   7. catch StockInsuficienteException → 422 stock.*          :650
      catch VarianteRequeridaException → 422                  :656
   8. return 201 {id, total}                                  :671
   ▼
[Navegador]  guarda el pedido en sessionStorage, arma el mensaje (lib/whatsapp.js),
             abre WhatsApp (abrirWhatsApp), limpia el carrito, /confirmacion-pedido
             (Checkout.jsx:490-510)
```

- **Transacciones y locks:** una `DB::transaction` (`:412`) que contiene el lock del cupón (`resolverParaCheckout`, `CodigoDescuentoService.php:74`) y los `lockForUpdate` de productos/variantes (`StockService.php:274, 298`), ordenados por id para no deadlockear. `descontar` abre una transacción anidada (savepoint).
- **No hay pago online ni Mercado Pago.** El pago y el envío se coordinan por WhatsApp con la sucursal elegida. El plan de tarjeta es un recargo **informativo**. `README`/`CONTEXTO` coinciden con el código.
- El mensaje de WhatsApp se arma **en el cliente** y **ya no se guarda** en el servidor (`pedidos` no tiene `mensaje_whatsapp`).
- **Sin idempotencia** ni clave de pedido: dos POST iguales crean dos pedidos. **Sin throttle** (§6).

### 4.2 Tablas

**`pedidos`** (columnas verificadas en la base): `id`, `cliente_nombre`, `cliente_dni`, `cliente_telefono`, `cliente_email`, `cliente_provincia`, `cliente_ciudad`, `cliente_codigo_postal`, `observaciones`, `subtotal`, `total`, `plan_pago_tarjeta_id`, `plan_pago_nombre`, `plan_pago_cuotas`, `recargo_porcentaje`, `recargo_monto`, `total_con_recargo`, `envio_gratis`, `envio_gratis_monto_minimo`, `codigo_descuento_id|texto|tipo|valor`, `descuento_monto`, **`estado` (default `pendiente`)**, **`sucursal` (default `buenos-aires`)**, `despachado_at`, `editado_at`, timestamps. **No tiene `user_id`, ni vendedor, ni pago, ni envío, ni transportista, ni tracking, ni referencia externa.**

**`pedido_items`**: `pedido_id`, `producto_id` (nullOnDelete), `producto_variante_id` (nullOnDelete), `combo_id` (nullOnDelete), `combo_items_seleccionados` (JSON), `titulo`, `variante_nombre`, `variante_color_hex`, `color_personalizado_texto`, `recargo_variante_unitario`, `addons_seleccionados` (JSON: `addon_id, nombre, precio, texto_personalizado`), `addons_total_unitario`, `precio_base_unitario`, `precio_unitario` (**final por unidad, con recargo de variante y add-ons**), `cantidad`, `subtotal`, `envio_gratis`. **No guarda SKU.**

**Totales:** `subtotal` = suma de líneas; `total = subtotal − descuento_monto` (`PedidoController.php:559`) → **sin envío y sin recargo**. `total_con_recargo` aparte. Es exactamente el `total` que espera `POST /pedidos` del Central.

### 4.3 Estados (`app/Enums/EstadoPedido.php`)

Tres: `pendiente`, `despachado`, `cancelado`. Transiciones (`:46-53`): `pendiente → despachado|cancelado`; **`despachado → pendiente`** (reversible, sin tocar stock); `cancelado` terminal; `despachado → cancelado` prohibido (`PedidoController.php:312`).

- Quién y dónde: **un único lugar** cambia `estado`: `PedidoController::cambiarEstado` (`:236-279`, `PATCH admin/pedidos/{pedido}/estado`, `routes/web.php:123`), usado desde `Pages/Admin/Pedidos/Show.jsx` (botones `:420-445`) y `Index.jsx` (acciones rápidas). Admin **y** vendedor (este último solo de su sucursal, `autorizarSucursal` `:286`). No hay Observer/Event/Policy.
- Stock: solo `cancelado` repone (`reponer` + `liberarUso`, `:268-272`). `pendiente↔despachado` no toca stock (`:274`). `despachado_at` se setea/borra ahí (`:254-259`).
- Hay además **edición**: `PedidoController::edit/actualizar` (`:113`, `:184`) → `PedidoEdicionService::actualizar` (`:53`): cambia cliente, cantidades, variantes, **precio unitario a mano**, suma/quita líneas (productos y combos) y recalcula subtotal/cupón/recargo/envío gratis; ajusta stock por diferencia. **Se permite en `pendiente` y en `despachado`** (`EstadoPedido::esEditable`, `:35`).

### 4.4 Pagos, envío, vendedor

| Dato | ¿Se registra? |
|---|---|
| Medio / cuenta / monto cobrado / fecha de pago | **No.** Solo el snapshot del plan de tarjeta (informativo). |
| Costo de envío / forma de envío / transportista / tracking | **No.** Solo `envio_gratis` (bool) y `envio_gratis_monto_minimo` (snapshot). |
| Vendedor que atendió o confirmó | **No.** `pedidos` no tiene `user_id`/`confirmed_by`. El vendedor existe como `users.role='vendedor'` con `sucursal`, y solo **filtra** qué pedidos ve. |
| Usuarios y roles | `users`: `role` (`admin`\|`vendedor`, **default `vendedor`**), `sucursal`, `debe_cambiar_password`. Sin registro público. Gate: middleware `role:admin` (`EnsureUserHasRole`) y `autorizarSucursal`. Local: 1 admin + 1 vendedor BA + 1 vendedor Córdoba. |
| Pasarela | Ninguna. |

### 4.5 Qué ve el cliente después de comprar

Solo la pantalla `/confirmacion-pedido` (lee `sessionStorage`, número de pedido, total, botón de reenviar por WhatsApp). **No hay mail, ni página de seguimiento, ni notificaciones.** Lo posterior es por WhatsApp a mano; el panel ya tiene un botón "Contactar por WhatsApp" con un mensaje armado (`Show.jsx:70-71`, `lib/whatsapp.js:295 buildPedidoClienteMessage`) → lugar natural para el tracking.

### 4.6 Cancelaciones y abandonados

- Cancelación: solo admin/vendedor desde `pendiente`. **No hay cancelación por el cliente.**
- Abandono: un pedido `pendiente` retiene stock (cuando el stock es finito) **indefinidamente**; no hay scheduler ni worker que lo libere. Con el Central las reservas tampoco vencen (API.md §1 "Reservas") y **comparten stock con Chispas Frías**: hace falta una política de cancelación de pedidos viejos (cron propio).
- Local: 7 pedidos (3 `pendiente`, 2 `despachado`, 2 `cancelado`; BA 5 / Córdoba 2; 1 editado, 2 con plan de tarjeta, 1 con cupón, 4 con envío gratis). **Datos de la copia local, no de producción.**

---

## 5. Panel de administración

Layout: `AuthenticatedLayout`. Rutas bajo `admin/*`; admin y vendedor comparten pedidos, precios, documentos y reseñas; **todo el resto es `role:admin`** (`routes/web.php:128-231`).

| Sección | Controller | Pantallas | Notas para la integración |
|---|---|---|---|
| Productos (+ variantes, escalas, add-ons, media, compatibles) | `ProductoController` (812 l.) | `Admin/Productos/{Index,Create,Edit}.jsx`, `VariantesColorRepeater.jsx`, `EscalasPrecioRepeater.jsx` | Stock editable a mano (`:126, :149, :270, :293, :549, :611`). Hooks de sync de catálogo: `store`, `update`, `destroy` (`:414`), `toggleFeatured`. |
| Aumento/baja masiva de precios | `ProductoController::aumentarPrecios/bajarPrecios` (`:40`, `:72`) → `AumentoPreciosService` | `AumentoPreciosModal.jsx` | Cambia `precio` y escalas de muchos productos: el catálogo del Central lleva precios (informativo) → sync completo nocturno alcanza. |
| Combos | `ComboController` (`store :42`, `update :97`, `destroy :150`) | `Admin/Combos/*`, `ComboProductosRepeater.jsx` | Cada alta/edición/baja y cada cambio de variantes de un componente debe re-sincronizar el combo. |
| Ofertas, códigos de descuento, add-ons, planes de pago, envío gratis, reseñas, documentos, usuarios, métricas | controllers homónimos | | Se quedan 100% en la web. |
| **Pedidos** | `PedidoController` (710 l.) | `Admin/Pedidos/{Index,Show,Edit}.jsx` | Ver abajo. |
| Dashboard | `DashboardController` (89 l.) | `Dashboard.jsx` | Conteos por estado y sucursal. |

**Pantalla de pedidos**
- `Index`: una "cola" filtrada por **un estado** (default `pendiente`) y por sucursal (el vendedor queda fijo a la suya), tarjetas con contadores, 15 por página (`PedidoController.php:36-84`). Los estados salen de un mapa **duplicado en el front** (`Index.jsx:7-11`, `Show.jsx:13-17`) y de `EstadoPedido`.
- `Show` — acciones (`Show.jsx:404-460`): *Editar pedido*, *Marcar como despachado*, *Cancelar pedido* (con modal), *Volver a pendiente*; botón "Contactar por WhatsApp". `Edit.jsx` (540 l.): edición completa (§4.3).
- **Dónde iría "Confirmar venta":** en el bloque *Acciones* de `Show.jsx`, **reemplazando** el botón "Marcar como despachado" (`:420-424`) para pedidos integrados en `pendiente`; backend: ruta nueva `POST admin/pedidos/{pedido}/confirmar` junto a `routes/web.php:123`, en el grupo `auth` (admin y vendedor), reusando `autorizarSucursal` (`PedidoController.php:286`). Un modal/pantalla con cuenta, medio, monto, forma de envío, costo, transportista, observaciones.

**Dashboard / métricas — ¿cuentan pendientes como ingreso? Sí.**
- `Pedido::facturables()` = `estado != cancelado` (`Pedido.php:87-90`) se usa para: `facturacion` y `unidades_vendidas` del listado (`PedidoController.php:79-81`), **Métricas** (`MetricasController.php:36-38, 64, 94, 115`: facturación, cantidad, ticket promedio, serie, top productos), total descontado por código (`CodigoDescuentoController.php:22`). Es decir: **un pedido pendiente (reservado, sin pago) cuenta como facturación.**
- `Dashboard`: `pedidos_pendientes_count`, `pedidos_despachados_mes` (por `despachado_at`), `producto_mas_vendido` (no cancelados), `pedidos_por_dia` (todos).
- Suman `total` (sin recargo ni envío): consistente con el `total` del Central antes de confirmar; **no** con el `total` de la venta (que incluye el envío, §7.4).
- Además el Meta Pixel dispara `Purchase` al crear el pedido (`ConfirmacionPedido`), o sea ya con el pedido pendiente.

---

## 6. Riesgos y limpieza previa (antes de integrar)

Ordenados por importancia. **[Bloqueante]** = hay que resolverlo antes de encender la integración.

| # | Tema | Detalle | Dónde |
|---|---|---|---|
| 1 | **[Bloqueante] Suite de tests no verde** | 4 rojos (2 por un bug real de rutas, 2 por tests viejos de permisos). Sin suite verde no se puede refactorizar el checkout. | §1.2 |
| 2 | **[Bloqueante] Bug: eliminar código de descuento no elimina** | Param `{codigos_descuento}` vs `$codigo_descuento`. Silencioso: redirige "Código eliminado" sin borrar. Arreglar el nombre en `destroy` y `toggleActive` y agregar test. | `CodigoDescuentoController.php:86`; ruta resource en `routes/web.php` |
| 3 | **[Bloqueante] `liberarUso` no es idempotente** | `CodigoDescuentoService::liberarUso` (`:125`) decrementa cada vez que se llama; solo se protege porque `cancelado` es terminal. Con webhooks (at-least-once, reintentos) y cancelaciones desde el Central (`pedido.anulado`, `reserva_liberada`) se podría descontar dos veces. Falta un flag tipo `codigo_descuento_liberado_at` en `pedidos`. | `CodigoDescuentoService.php:125-141` |
| 4 | **[Bloqueante] Sin SKU** | `productos` sin columna; `variantes.sku` no editable ni único; 0 cargados. | §2.2 |
| 5 | **[Bloqueante] Sin throttle, con stock compartido** | `POST /checkout` (`routes/web.php:52`) y `POST /api/codigos-descuento/validar` (`routes/api.php`) son públicos y sin límite (`bootstrap/app.php` no llama a `throttleApi()`/`throttle`). Hoy permite enumerar códigos (la API distingue "inválido"/"vencido"/"límite") y llenar la tabla de pedidos; con el Central cada pedido **reserva stock real compartido**. Agregar `throttle` por IP y, si hace falta, honeypot/captcha. | `routes/web.php:52`, `routes/api.php` |
| 6 | **Zona horaria** | `APP_TIMEZONE` no está en el `.env` local; en producción **(no verificado)**. Métricas agrupan con `DATE()`/`HOUR()`. Fijar `America/Argentina/Buenos_Aires` en el `.env` real y revisar `MetricasController`/`DashboardController`. | `config/app.php:68`, `MetricasController.php:64-100` |
| 7 | **Métricas cuentan pendientes e incluirían anulados** | `facturables()` = `!= cancelado`. Con el Central aparece `anulado` (y `reservado` sin pago). Definir qué es "ingreso" antes de agregar estados. | `Pedido.php:87` |
| 8 | **Seeder con credencial fija y trivial** | `UserSeeder` crea `admin@admin` con una contraseña corta fija; `DatabaseSeeder` la llama. No correr `db:seed` en producción; cambiar o sacar la credencial. | `database/seeders/UserSeeder.php:23`, `DatabaseSeeder.php:18-19` |
| 9 | **Test de concurrencia escribe en MySQL** | Crea una base y corre `migrate:fresh` si hay MySQL local. Debería requerir un flag explícito (p. ej. `RUN_MYSQL_LOCK_TEST=1`) para no correr con `php artisan test`. | `StockServiceConcurrencyTest.php` |
| 10 | **Editar pedidos ya despachados / con precios libres** | Incompatible con el Central tras confirmar (`409 PEDIDO_NO_EDITABLE`). Decisión de negocio + rediseño (§7.3). | `EstadoPedido.php:35`, `PedidoEdicionService.php` |
| 11 | **`despachado → pendiente`** | Reversible solo en la web. El Central solo revierte `empaquetado/despachado → confirmado`, y desde el Central. | `EstadoPedido.php:50` |
| 12 | **Snapshot de combo sin `combo_producto_id`** | Necesario para construir `selecciones` de forma estable (nombres de grupo). | `ComboPedidoResolver.php:62-73` |
| 13 | **Stock `NULL` = ilimitado por defecto** | Mientras el espejo no cargue, todo parece disponible. El Central igual rechaza con `SIN_STOCK`/`ITEM_NO_VINCULADO`. Hace falta un chequeo de "ítems sin fila de stock" antes de encender. | §3, §7.2 |
| 14 | **El stock se expone al navegador** | Props de Inertia y `localStorage` del carrito llevan el stock numérico exacto. No es nuevo; con stock compartido entre webs se vuelve información comercial. | `TiendaController.php:568-575`, `CartContext.jsx:36,58` |
| 15 | **`updated_at` ordena la home** | `routes/web.php:70` ordena destacados por `updated_at`. Un listener de stock que use `Producto::update()` va a reordenar la home en cada evento. Escribir el espejo sin tocar timestamps (`withoutTimestamps` / `DB::table`). | `routes/web.php:70` |
| 16 | **Números de WhatsApp hardcodeados en JS** | Un solo archivo, dos sucursales. Está bien centralizado, pero cambiar un número implica un build. | `resources/js/lib/whatsapp.js:51-66` |
| 17 | **Duplicación de reglas** | Precios PHP/JS; umbral de stock bajo; estados en `Index.jsx`, `Show.jsx` y `EstadoPedido`. Al agregar estados hay que tocar los tres. | — |
| 18 | **`.env.example` desactualizado** | Dice `APP_URL=http://localhost` y trae `APP_TIMEZONE`; el `.env` real no. Falta documentar las `RUKOZ_*` cuando se agreguen. | `.env.example` |
| 19 | **Ziggy expone todas las rutas** (incluidas las de admin y las nuevas) a cualquier visitante | Bajo riesgo (están protegidas), pero conviene saberlo. | `app.blade.php` (`@routes`) |
| 20 | **Borrado de variantes por el formulario** | `sincronizarVariantes` borra las que no vienen (`:601`). Un sync **parcial** al Central no desactiva variantes borradas (solo el completo nocturno lo hace). | `ProductoController.php:601` |
| 21 | **Sin deploy documentado** | Cómo llega `vendor/` (con el paquete, sin symlink) a producción es un dato faltante. | §1.4 |

No encontré: `env()` fuera de `config/`, rol por defecto admin en `users` (el default es `vendedor`), registro público, logging de datos personales evidente (`Log::` no se usa en `app/`).

---

## 7. Mapeo contra la integración

### 7.1 `ProveedorCatalogo` (clase `App\Rukoz\CatalogoDeChisperio`)

Tamaño: 18 productos + 30 variantes + 1 combo ≈ 49 ítems → **un solo request**, sin partes.

**`productos(?array $ids)`** — base: `Producto::with('variantes')->lazyById(200)`:

| Campo del Central | De dónde |
|---|---|
| `id` | `(string) productos.id` |
| `nombre` | `titulo` |
| `sku` | **`null` hoy** (no hay columna). Recomendado: agregar `productos.sku`. |
| `precio` | `productos.precio` (lista; informativo en el Central) |
| `activo` | `is_active` |
| `variantes[]` (solo si tiene) | `id` = variante.id; `nombre`; `sku` = `variantes.sku`; `precio` = `productos.precio + precio_adicional`; `activo` = `variante.is_active && producto.is_active` |

Notas: se mandan **todas** las variantes (activas e inactivas, con `activo` correspondiente). Un producto con variantes **no se vincula**: se vincula cada variante y los pedidos se hacen por variante. La variante `es_color_personalizado` corresponde a un **genérico** en el Central (la vincula un admin).

**`combos(?array $ids)`** — base: `Combo::with('items.producto.variantesActivas')->lazyById(200)`:

- **Combo fijo** (`tipo: fijo`): si **ninguna** línea requiere elección (`ComboProducto::requiereSeleccionVariante()` es `false` para todas, `ComboProducto.php:48-51`). `items[]`: línea con variante fija → `{tipo:'variante', id: producto_variante_id, cantidad}`; si no → `{tipo:'producto', id: producto_id, cantidad}`.
- **Combo con elección** (`tipo: seleccion`): si **alguna** línea requiere elección. Como el Central no admite mezcla fijo+elección, **cada línea pasa a ser un grupo**:
  - línea fija → grupo de **una sola opción** (`opciones:[{tipo, id}]`) con `cantidad` = `combo_productos.cantidad`;
  - línea de elección → grupo con **todas las variantes activas** del producto como opciones y `cantidad` = `combo_productos.cantidad`.
  - `nombre` del grupo debe ser **único dentro del combo** (`SELECCION_INVALIDA: grupo_repetido`) y estable: sugerencia `"{titulo} (#{combo_producto_id})"`. Hay que guardarlo en el snapshot del pedido (§7.5), porque `PUT` posterior debe usar el nombre tal cual lo informó el catálogo.
- `precio` = `combos.precio` (lista); `activo` = `is_active`.
- El combo existente en la base local es justamente un caso **mixto** (una línea fija sin variantes + una con elección).
- Semántica: en la web una línea elige **una** variante para toda su cantidad; en el Central un grupo permite repartir (p. ej. 1+1). Es un superconjunto: lo que acepte la web siempre es válido para el Central.
- Si cambian las variantes activas de un producto, hay que **re-sincronizar los combos que lo contienen** (cambia la lista de opciones).

**Dónde se llama el sync parcial** (`Rukoz::sincronizarProductos([id])` / `sincronizarCombos([id])`, que no rompen el guardado): al final de `ProductoController::store` (`:144`), `update` (`:288`), `destroy` (`:414`; ojo, no desactiva, solo el completo), `toggleFeatured` (no hace falta), y de `ComboController::store/update/destroy` (`:42`, `:97`, `:150`); después de `aumentarPrecios/bajarPrecios` alcanza el sync completo diario. Productos **antes** que combos. Registro: `AppServiceProvider::register` (`$this->app->bind(ProveedorCatalogo::class, CatalogoDeChisperio::class)`; hoy el provider está vacío, `AppServiceProvider.php:12-15`).

### 7.2 Espejar el stock (`StockActualizado`)

Estrategia recomendada (la menos invasiva, igual que la del README): **seguir leyendo `productos.stock` / `producto_variantes.stock`** y llenarlas con un listener `App\Listeners\EspejarStockDelCentral`.

Reglas **distintas al ejemplo del README** (ahí `9999`):

| Evento del Central | `productos.stock` (producto sin variantes) | `producto_variantes.stock` |
|---|---|---|
| `vinculado: false` | `0` (no se vende) | `0` |
| `a_pedido: true` | **`NULL`** | `NULL` |
| `disponible: n` | `max(0, n)` | `max(0, n)` |
| `tipo: combo` | se ignora (no hay columna; `Combo::stockDisponible` se sigue derivando) | — |

- El Central **no informa productos que tienen variantes** (informa sus variantes), coherente con que la web ya ignora `productos.stock` en ese caso.
- Escribir con `DB::table(...)->update(...)` o `Producto::withoutTimestamps(...)`: **no** tocar `updated_at` (ordena la home, `routes/web.php:70`).
- Idempotente y sin HTTP (corre dentro del webhook, dentro de la transacción del inbox).
- Para `aproximado: true` en combos de selección: se sigue mostrando el cálculo local (consistente con las variantes espejadas); la verdad es la reserva.
- Pendiente antes de encender: un comando/consulta que liste ítems **activos sin fila en `rukoz_stock`** (siguen en `NULL` = "ilimitado" por error) y fijarlos en 0 hasta que lleguen.

**Lecturas que cambian:** ninguna si se espeja (todas las de §3.3 siguen leyendo las mismas columnas). Lo que sí hay que tocar:
1. **Formularios de stock del panel** pasan a solo lectura (o se ocultan) con la integración encendida: `ProductoController.php:126, 149, 270, 293, 549, 611` y los campos en `Admin/Productos/{Create,Edit}.jsx` / `VariantesColorRepeater.jsx`. Si no, una edición manual se pisa con el próximo evento y diverge.
2. `StockService::validarDisponibilidad` puede quedar como **pre-chequeo de UX** contra el espejo (barato, sin HTTP); `descontar/reponer/ajustarPorEdicion` dejan de usarse para pedidos integrados.
3. (Opcional) `DashboardController.php:26` y `TiendaController.php:295` para que miren también variantes (defecto actual).

Webhook: el paquete registra `POST /rukoz/webhook` fuera del grupo `web` (sin CSRF ni `RequerirCambioDePassword`/Inertia). `legacy_redirects.php` no tiene catch-all que lo tape. URL a cargar en el Central: `https://<dominio canónico>/rukoz/webhook`. Si el hosting no puede recibir webhooks: `RUKOZ_WEBHOOK_RECIBE=false` y el feed se lee cada minuto.

### 7.3 Dónde va `Rukoz::reservar` y qué reemplaza

Todo en `PedidoController::store` (`PedidoController.php:322-675`). **Regla: ningún HTTP dentro de `DB::transaction` ni con `lockForUpdate` tomado.** Hoy los locks (cupón `:554`, stock `:646`) están dentro de la transacción de `:412`.

Estructura propuesta (extraer, sin cambiar comportamiento, en una subetapa previa):

```
store():
  1. validate()                                        (igual, :324-361)
  2. resolver combos + pre-chequeo contra el espejo    (igual, :371-409; devuelve 422 stock.* como hoy)
  3. $plan = PrepararPedido::calcular($validated)      NUEVO: lo de :413-607 sin crear nada
        → items (con tipo/id para el Central), subtotal, descuento_monto (preview SIN lock),
          total, plan de tarjeta, envío gratis
  4. $ref = ref estable (sesión)                       NUEVO
  5. try { $reserva = Rukoz::reservar(ref: $ref, pedido: [...], transaccionLocal: function ($central) {
          // SOLO base local:
          resolverParaCheckout()  ← el lock del cupón va ACÁ; si el monto difiere del preview → abortar
          Pedido::create(... + central_ref, central_version, central_estado)    (:609)
          items()->createMany(...)                                              (:632)
          increment('usos_actuales')                                            (:638)
          // YA NO: $stockService->descontar($pedido)                           (:646 se elimina)
          return $pedido;
     }) }
  6. catches (SinStock → 422 stock.*; CentralNoDisponible → 503; ItemNoVinculado/…/RukozException → 422 + report)
  7. return 201 {id, total}                            (:671, igual)
```

- **Reemplaza:** `:646` (`descontar`), el catch de `StockInsuficienteException` (`:650-655`, que sigue existiendo para la rama legacy), y los locks de stock. El cupón queda en `transaccionLocal`.
- **Payload al Central** (desde `$plan`): `external_ref`; `cliente` = `{nombre: cliente_nombre, telefono, dni, email, localidad: cliente_ciudad, provincia, cp: cliente_codigo_postal, observaciones}` (no hay `direccion`; el envío es a sucursal); `items[]` = por línea `tipo:'producto'|'variante'|'combo'`, `id`, `nombre`, `cantidad`, `precio_unitario` = `pedido_items.precio_unitario` (**ya incluye recargo de variante y add-ons**, que es "lo que pagó el cliente por unidad"), y `selecciones` para combos con elección; `total` = `pedidos.total` (sin envío ni recargo); `total_con_recargo`; `moneda:'ARS'`; `creado_at` ISO 8601.
  - Un producto con variantes activas **siempre** va como `tipo:'variante'` (id de la variante).
  - Add-ons y color libre **no tienen campo**: ver Preguntas (`nombre` del ítem u `observaciones`, máx. 2000).
  - Sucursal elegida: tampoco tiene campo (Preguntas); mientras tanto, `observaciones`.
- **`ref` estable:** `CHP-` + ULID (≤100 caracteres, sin `/`), generado **antes** y guardado en sesión junto a un hash del payload (la sesión existe: `web` + `SESSION_DRIVER=database`); si el cliente reintenta con el mismo contenido se reutiliza ref y `creado_at`; si cambió el carrito, ref nuevo. `pedidos.central_ref` único.
- **Errores → UI actual:** `Checkout.jsx:460-480` ya muestra `errors['stock.*']` (422) y un mensaje genérico para el resto. `SinStockException::items()` trae `{tipo,id,pedido,disponible}`: mapear variante→`producto_id` y combo→primer componente para reutilizar `abortarPorStockInsuficiente` (`:694`). `CentralNoDisponibleException` → 503 con el texto del README; `Rukoz::circuitoAbierto()` compartido por `HandleInertiaRequests` para **deshabilitar el botón** de comprar.
- **Edición (`PedidoEdicionService`, 486 l.)** no se puede dejar como está: hoy abre una transacción con `lockForUpdate` del pedido (`:56-59`), muta ítems, recalcula y ajusta stock. Debe pasar a `plan puro (calcular el estado final) → Rukoz::editarReserva(ref, pedidoNuevo, transaccionLocal) → aplicar en transacción local`. Reemplaza `ajustarPorEdicion` (`:84`). Solo vale mientras el pedido está `reservado`; **confirmado en adelante no se edita** (decisión de negocio, Preguntas).
- **Cancelación (`cambiarEstado`, `:262-272`):** hoy `reponer + liberarUso + update` van dentro de una transacción. Pasa a: `Rukoz::cancelarReserva($ref, motivo)` **antes** (HTTP, `null` si el Central no respondió → queda compensación y se cancela igual local) y después una transacción local con `liberarUso` (idempotente, §6 #3) + estado. Un pedido ya **confirmado** no se cancela desde la web (`409 ANULAR_DESDE_CENTRAL`): ocultar el botón.
- **Pedidos abandonados:** cron propio (`Schedule::command`) que cancele `pendiente` integrados con más de N días (plazo a definir) vía `cancelarReserva`.
- **Convivencia / rollback:** mantener la rama legacy (`StockService` local) cuando `Rukoz::habilitada()` es `false` (`phpunit.xml` debería fijar `RUKOZ_INTEGRACION=false`); así los 383 tests existentes siguen valiendo y el corte es reversible.

### 7.4 Estados y "Confirmar venta"

**Mapeo propuesto** (`central_estado` guarda el valor crudo; `estado` local lo deriva):

| Central | `estado` local | Etiqueta |
|---|---|---|
| `reservado` (y `requiere_revision`, que no debería ocurrir) | `pendiente` | Pendiente |
| `confirmado` | `confirmado` *(nuevo)* | Venta confirmada |
| `empaquetado` | `empaquetado` *(nuevo)* | Empaquetado |
| `despachado` | `despachado` | Despachado (+ tracking) |
| `retirado` | `retirado` *(nuevo)* | Retirado |
| `cancelado` | `cancelado` | Cancelado |
| `anulado` | `anulado` *(nuevo)* | Anulado |

Se toca: `EstadoPedido` (cases, `label`, `color`, `esEditable` → solo `pendiente` integrado, `puedeTransicionarA` → los pedidos integrados **no** transicionan por el panel salvo `pendiente → cancelado` y `pendiente → confirmado` vía API), `Pedido::facturables` (excluir `cancelado` y `anulado`; definir si `pendiente` cuenta), los mapas de `Index.jsx:7-11` y `Show.jsx:13-17`, filtros y tarjetas de `Index`, y el `Dashboard`. Los **pedidos históricos** (`central_ref IS NULL`) conservan las reglas de hoy.

**Acción "Confirmar venta"** (`POST admin/pedidos/{pedido}/confirmar` → `Rukoz::confirmar`):
- Formulario con `Rukoz::referenciasConCache()`: **cuenta** (`cuentas[].codigo`), **medio** (`medios_pago[]`), **monto** (por defecto `total_con_recargo ?? total`; puede ser menor → queda saldo), **forma de envío** (`formas_envio[]`; `es_retiro` oculta costo/transportista), **costo cobrado**, **es gratis** (precargado con `pedidos.envio_gratis`), **transportista** (sugerido por la forma), observaciones, `descuento` extra (solo si no está ya en el `total`; **no** mandar el cupón de nuevo).
- **Vendedor:** `{id: (string) auth()->id(), email, nombre}` — es `users.id`, estable. Los vendedores deben estar asignados en el Central (si no: `VENDEDOR_NO_MAPEADO`, se reintenta con clave nueva). Guardar `confirmado_by` (FK a `users`).
- **Reintentos idénticos:** guardar `confirmando_at` y los parámetros elegidos en el pedido **antes** del primer intento.
- Manejo de errores como en el README (`VendedorNoMapeado`, `PedidoRequiereRevision`, `YaConfirmado/Cancelado` → `actualizarPedidoDesdeCentral`, `Validacion` → mostrar `detalle()` por campo, `CentralNoDisponible` → "probá de nuevo").
- **Ojo:** tras confirmar, el `total` del Central pasa a ser el **total de la venta (con envío)**. **No pisar `pedidos.total`** (métricas y cupones lo usan sin envío); guardar `venta_total`, `pagado`, `saldo` en columnas propias.
- Autorización: admin y vendedor de la sucursal (`autorizarSucursal`).

**Estados entrantes:** un listener `SincronizarEstadoDelPedido` sobre `PedidoActualizado` (idempotente, rápido, sin HTTP) actualiza `central_estado`, `central_version`, `estado`, `numero_venta`, `transportista`, `numero_seguimiento`, `url_seguimiento`, `confirmado_at`, `empaquetado_at`, `despachado_at` (**reusa la columna existente**), `retirado_at`, `anulado_at`, `pagado`, `saldo`. Reacciona al **estado**, no a la transición (revertir borra fechas). En `cancelado`/`anulado`/`reserva_liberada` libera el cupón **una sola vez** (§6 #3). `CompensacionFallida` → log crítico / aviso a admins.

**Cliente:** el tracking llega al panel; la vía más barata es sumarlo a `buildPedidoClienteMessage` (el vendedor ya contacta por WhatsApp). Página pública o mail son trabajo aparte (no hay mailer real).

### 7.5 Columnas y tablas nuevas

**Migraciones propias:**

| Tabla | Columna | Para qué |
|---|---|---|
| `pedidos` | `central_ref` string(100) **unique** nullable | `external_ref` |
| | `central_version` unsignedInteger nullable | orden de eventos |
| | `central_estado` string(30) nullable, index | estado crudo |
| | `numero_venta` string nullable | número de venta del Central |
| | `venta_total`, `pagado`, `saldo` decimal(12,2) nullable | totales de la venta (no pisan `total`) |
| | `transportista` string nullable · `numero_seguimiento` string nullable · `url_seguimiento` text nullable | seguimiento |
| | `confirmado_by` FK `users` nullOnDelete nullable · `confirmando_at`, `confirmado_at`, `empaquetado_at`, `retirado_at`, `anulado_at` timestamp nullable | quién y cuándo (`despachado_at` ya existe) |
| | `confirmacion_datos` JSON nullable | cuenta/medio/monto/forma de envío/costo/transportista usados (reintento idéntico y auditoría) |
| | `codigo_descuento_liberado_at` timestamp nullable | idempotencia de `liberarUso` |
| `productos` | `sku` string nullable, unique | vínculo por SKU |
| `producto_variantes` | índice único sobre `sku` (nullable) | idem; y exponerlo en el admin |
| `pedido_items` (snapshot) | `central_tipo` string, `central_id` string (opcional) | a qué ítem del Central se mandó cada línea |
| `combo_items_seleccionados` (JSON) | agregar `combo_producto_id` y `grupo` | `selecciones` estables |

**Del paquete** (`php artisan migrate`): `rukoz_requests`, `rukoz_inbox`, `rukoz_estado`, `rukoz_pedidos`, `rukoz_stock`, `rukoz_compensaciones`. Contienen datos del cliente (`body`): tratarlas como dato personal; `rukoz:limpiar` las depura.

**Configuración:** `RUKOZ_INTEGRACION`, `RUKOZ_CENTRAL_URL`, `RUKOZ_API_KEY`, `RUKOZ_SECRET` en el `.env` de producción (nunca al repo); cron de `schedule:run`; agregar las claves a `.env.example` (sin valores).

---

## 8. Diferencias con Chispas Frías

| Tema | Chispas Frías | Chisperío | ¿Se reutiliza el plan? |
|---|---|---|---|
| Idioma de tablas/modelos | inglés (`products`, `orders`) | español (`productos`, `pedidos`) | Cambia solo el nombre. |
| Stack | Laravel 12, PHP 8.2, Inertia+React | **Igual** | ✔ |
| Hosting | compartido, `public_html` | **Igual** (`bootstrap/app.php:67`) | ✔ cron, sin worker |
| `routes/api.php` | no existía | existe (2 rutas públicas) | n/a |
| SKU producto | `products.sku` único nullable | **no existe** | ✘ hay que agregarlo |
| SKU variante | nullable, sin único | **Igual** y además no editable en el panel | ≈ |
| Stock `NULL` / `9999` | producto `NOT NULL default 9999`; variante `NULL` ilimitado | **`NULL` ilimitado en ambos**, sin 9999 | ✘ el listener del README no sirve tal cual |
| Variante "a elección" | `is_custom_color` | `es_color_personalizado` | ✔ igual (texto libre sin campo en el API) |
| Combos | solo productos (+ elección de color por componente), único por producto | línea con **variante fija** o elegida, productos repetibles, descuento propio, envío gratis | ✘ Chisperío necesita `seleccion` con grupos de una opción |
| Estados | 3, `despachado→pendiente` reversible | **Igual** | ✔ mismo mapeo base |
| **Edición de pedidos** | no existe | **sí, incluso despachados, con precio libre** | ✘ trabajo nuevo (`editarReserva`) |
| Sucursales | no | **BA/Córdoba** en pedidos y usuarios; vendedor acotado a la suya | ✘ decisión de negocio |
| Vendedor en pedido | no | no (pero hay `users` con sucursal) | ✔ igual (`confirmed_by`) |
| Totales | `total` sin envío/recargo | **Igual** | ✔ |
| Carrito | sesión del servidor; pedido en `generateWhatsAppMessage` | `localStorage`; `POST /checkout` JSON | ≈ el reemplazo es el mismo, el punto de entrada cambia |
| Mensaje WhatsApp | guardado en `orders.mensaje_whatsapp` | armado en el cliente, no se guarda | — |
| Cupón: liberar uso | flag `discount_usage_repuesto` (idempotente) | **sin flag**, no idempotente | ✘ agregar columna |
| Roles | admin/vendedor/cliente, registro público, **default admin** | admin/vendedor, sin registro, **default vendedor** | ✔ Chisperío mejor |
| `env()` fuera de `config/` | sí (4 lugares) | **ninguno** | ✔ menos limpieza |
| Zona horaria | `UTC` fijo en config | `env('APP_TIMEZONE','UTC')`; ejemplo en BA, `.env` local sin definir | ≈ verificar prod |
| WhatsApp hardcodeado | 1 número en `Checkout.jsx` | 2 números en `lib/whatsapp.js` (centralizado) | ≈ |
| Métricas | cuentan pendientes | **Igual** | ✔ mismo arreglo |
| Mail/jobs/eventos/scheduler | ninguno | **Igual** | ✔ |
| Tests | ~360, suite verde al último registro | **383**, **4 rojos**; un test crea una base MySQL | ≈ arreglar antes |
| CI | `.github` con tests | **sin CI** | — |
| PWA | no | sí (`sw.js`, inocua) | n/a |
| Fases de plan | 10.0–10.4 | mismas, con 11.0 más pesada | ✔ |

**Reutilizable casi tal cual:** instalación del paquete y `.env`; cron; esqueleto del `ProveedorCatalogo`; manejo de errores de `reservar` mapeado al 422 `stock.*` que ambas UIs ya entienden; formulario y listener de estados (10.4); checklist de puesta en marcha. **Hay que rehacer para Chisperío:** SKU, combos con elección, edición de pedidos, sucursales, snapshot de combos, idempotencia del cupón.

---

## Preguntas abiertas para Matias (decisiones de negocio)

Ordenadas de más a menos bloqueantes.

1. **Sucursales.** El Central tiene un único stock físico en Buenos Aires y una integración = una empresa + un punto de atención. ¿Los pedidos de Córdoba salen de ese mismo stock? ¿Se confirman en el Central igual que los de BA, con qué punto de atención? ¿Hace falta una integración (API key) por sucursal o una sola?
2. **Stock real.** Hoy todo el catálogo es "ilimitado" (`NULL`) en la copia local. ¿Es así también en producción? ¿Qué artículos serán "a pedido" en el Central y cuáles tendrán stock real?
3. **Edición de pedidos.** Hoy se editan hasta ya despachados y con precios libres. El Central solo admite editar mientras está **reservado**. ¿Se acepta que después de "Confirmar venta" el pedido sea solo lectura (correcciones = anular en el Central y rehacer)? ¿Se mantiene la edición de precio a mano antes de confirmar?
4. **Color a elección y add-ons con texto.** El API no tiene un campo para "el cliente pidió este color/texto". ¿Dónde viaja: nombre del ítem, `observaciones`, o se agrega un campo al Central? Es información que necesita quien empaqueta.
5. **Cuándo se confirma la venta y quién.** ¿Al acordar por WhatsApp o al acreditarse el pago? ¿Lo hace el vendedor de la sucursal? ¿Qué cuenta/medio/envío/transportista se usan normalmente (el envío hoy no tiene costo en la web)?
6. **Pedidos abandonados.** Las reservas no vencen y el stock se comparte con Chispas Frías. ¿Plazo de auto-cancelación de pedidos `pendiente` (24 h, 48 h, 3 días)?
7. **Ingresos en el panel.** ¿"Facturación" y "ticket promedio" deben contar solo ventas **confirmadas** (hoy cuentan pendientes)? ¿Sobre `total` (sin recargo ni envío), como ahora?
8. **SKU / vínculos.** ¿Se agrega `sku` a productos y a variantes en el panel para que el Central sugiera los vínculos, o los vincula un admin a mano (≈48 ítems)? ¿Quién lo hace?
9. **Pedidos existentes.** ¿Qué se hace con los `pendiente` actuales al hacer el corte (cerrarlos, cancelarlos, o migrarlos al Central)? Los históricos seguirán con el flujo viejo.
10. **Cliente final.** ¿Debe ver estado/tracking? Hoy no hay mail. ¿Alcanza con que el vendedor lo mande por WhatsApp (botón existente)?
11. **Cupones y ofertas.** Confirmar que siguen 100% en la web y que el Central solo recibe el precio cobrado (el descuento extra al confirmar, ¿se usa?).
12. **Hosting.** ¿Hay cron disponible? ¿El dominio canónico es `https://chisperio.com.ar` (sin redirect www)? ¿Cómo se despliega `vendor/` (con el paquete, sin symlink)? ¿`APP_TIMEZONE` está definido en producción?
13. **Anti-spam.** ¿Se acepta `throttle` por IP en el checkout y/o un captcha simple?

---

## Plan sugerido (subetapas)

Tamaños: S ≈ medio día, M ≈ 1–2 días, L ≈ 3–5 días (orientativo). Cada subetapa termina con la suite verde y la integración **apagada** (`RUKOZ_INTEGRACION=false`) hasta 11.5.

### 11.0 — Limpieza previa (sin Central)  · M
1. Arreglar `CodigoDescuentoController` (`destroy`/binding) y sumar test; actualizar los 2 tests de vendedor (que sigan reflejando que el vendedor **no** crea productos) → **suite verde**.
2. `throttle` en `POST /checkout` y `POST /api/codigos-descuento/validar`.
3. `APP_TIMEZONE=America/Argentina/Buenos_Aires` en `.env` real y local; revisar agrupaciones de `MetricasController`/`DashboardController`.
4. `pedidos.codigo_descuento_liberado_at` + `liberarUso` idempotente.
5. `productos.sku` (nullable, único) y `sku` editable (único) en variantes, en el panel; cargar los SKU que existan.
6. Agregar `combo_producto_id` al snapshot de `combo_items_seleccionados` (con backfill/tolerancia a pedidos viejos).
7. Que el test de concurrencia solo corra con un flag explícito; `phpunit.xml` fija `RUKOZ_INTEGRACION=false`.
8. Credencial del seeder; `.env.example` al día; decidir/ejecutar qué se hace con los `pendiente` existentes.
9. Refactor sin cambio funcional: extraer de `PedidoController::store` el cálculo puro (`:413-607`) a un servicio y el armado de payload; los tests actuales lo cubren.
**Riesgo:** el refactor del checkout; mitigación: tests de caracterización antes de mover código.

### 11.1 — Instalar el paquete y catálogo  · M
`composer require` (path repository en local; **copia en `vendor/`**, sin symlink, en producción), `migrate`, `config/rukoz.php` opcional. `CatalogoDeChisperio` (§7.1) + bind en `AppServiceProvider`. Hooks de sync en `ProductoController`/`ComboController`. `rukoz:ping`, `rukoz:referencias`, `rukoz:sync-catalogo`, vincular en el Central hasta **sin vincular = 0** y **combos incompletos = 0**. Integración apagada.
**Riesgos:** nombres de grupo del combo mixto; ítems sin SKU; circular productos→combos (orden de sync).

### 11.2 — Stock  · M
Cron `schedule:run`; webhook (URL canónica) o feed; listener `EspejarStockDelCentral` (reglas de §7.2, sin tocar `updated_at`); campos de stock del panel en solo lectura; comando de control de ítems sin fila de stock; `rukoz:sync-stock`. Verificar: un ajuste en el Central cambia la tienda en ≈1 minuto.
**Riesgos:** `NULL` = "ilimitado" mientras no llega el dato; firma 401 por proxy/subcarpeta; reordenamiento de la home.

### 11.3 — Checkout  · L  (la más delicada)
`reservar` en `store` (§7.3) con `ref` en sesión y `transaccionLocal` (cupón adentro); mapeo de errores y botón deshabilitado por circuito; `cancelarReserva` en `cambiarEstado`; **edición** con `editarReserva` (plan puro + aplicación); cron de cancelación de abandonados; rama legacy bajo `Rukoz::habilitada()`. Tests con el cliente del paquete simulado; prueba con el **Simulador** del Central (`rukoz:simular-web flujo-completo`).
**Riesgos:** HTTP dentro de transacción (revisar `reservar`, `editarReserva`, `cancelar` uno por uno); reintentos con payload distinto (`PEDIDO_YA_EXISTE`); diferencia de cupón entre preview y lock; combos con `selecciones`; reservas huérfanas (compensaciones) y `CompensacionFallida`.

### 11.4 — Confirmación y estados  · L
Migración de columnas (§7.5); `EstadoPedido` ampliado y mapas del front; ruta + formulario "Confirmar venta" (§7.4); listener `SincronizarEstadoDelPedido` + `liberarUso` idempotente en anulaciones; ocultar edición/cancelación/"volver a pendiente" para pedidos confirmados; tracking en `Show.jsx` y en `buildPedidoClienteMessage`; ajuste de `facturables()` y métricas según la decisión de la pregunta 7.
**Riesgos:** no pisar `pedidos.total`; vendedor sin mapear en el Central; estados que el panel no conoce; coexistencia con pedidos históricos.

### 11.5 — Puesta en marcha  · S–M
Checklist del README (§ "Checklist de puesta en marcha") adaptado: credenciales en el `.env` real, vendedores asignados en el Central, **prueba extremo a extremo con un pedido real** (reservar → editar → cancelar; reservar → confirmar → empaquetar → despachar con seguimiento), caída del Central (botón deshabilitado, sin cobro), `rukoz:estado` sin fallidos, monitoreo de la pestaña *Webhooks* y *Pedidos web*. Encender con `RUKOZ_INTEGRACION=true` en horario tranquilo y con rollback listo (apagar el interruptor devuelve el flujo legacy).
**Riesgo:** corte con pedidos `pendiente` en vuelo (pregunta 9).
