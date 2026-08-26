# Chisperío — Contexto del Proyecto

> Documento generado para dar contexto rápido a un asistente (Claude) sobre el estado actual del sistema. Última actualización: 2026-08-26.

## 1. Qué es

**Chisperío** es un e-commerce (Laravel + Inertia.js + React) para venta de **artículos de pirotecnia y efectos especiales para eventos**: chispas frías, fuegos artificiales, máquinas de humo, lanzallamas, velas, etc. (Nada de golosinas pese al nombre "chispas").

El checkout **sí persiste el pedido en base de datos** (tabla `pedidos` + `pedido_items`, con descuento real de stock y resolución server-side del código de descuento). Una vez creado el pedido, el frontend arma un mensaje de WhatsApp con el resumen y lo abre vía `wa.me`/`whatsapp://` — el negocio coordina el pago/envío por chat, pero el pedido en sí ya quedó registrado antes de eso, no depende de que el mensaje se envíe.

## 2. Stack técnico

**Backend**
- PHP `^8.2`, Laravel `^12.0`
- `inertiajs/inertia-laravel` `^2.0`
- `laravel/sanctum` `^4.0`, `laravel/tinker`, `tightenco/ziggy` `^2.0` (helper `route()` en JS)
- Base de datos: **MySQL** (`DB_CONNECTION=mysql`, DB `chisperio`) — el `.env.example` del repo quedó desactualizado diciendo `sqlite`, ver sección 15.
- Sesiones/cache/queue en driver `database`
- `APP_TIMEZONE=America/Argentina/Buenos_Aires`, `APP_LOCALE=es` (antes `en`/UTC)

**Frontend**
- React `^18.2.0`, `@inertiajs/react` `^2.0.0`
- Tailwind CSS (`@tailwindcss/vite` v4 + `@tailwindcss/forms`)
- Vite `^7`
- `@headlessui/react` — Dropdown
- `quill` + `dompurify` — editor de texto rico para descripción de productos (admin) y sanitizado del HTML resultante
- `lucide-react` — íconos
- `recharts` — gráfico de facturación en `Admin/Metricas`
- `react-hot-toast` — notificaciones (envío gratis desbloqueado, etc.)
- `react-zoom-pan-pinch` — zoom/pan del lightbox de imágenes de producto

## 3. Base de datos

No hay carrito en backend — vive en `localStorage` del navegador (ver `CartContext`). Todo lo demás (catálogo, pedidos, stock, descuentos) sí está persistido.

| Tabla | Columnas clave |
|---|---|
| `users` | id, name, email(unique), password, **role** (`admin`\|`vendedor`) |
| `categorias` | id, nombre, descripcion |
| `subcategorias` | id, nombre, descripcion, categoria_id (FK) |
| `productos` | id, titulo, descripcion(text), precio(decimal 10,2), is_active, is_featured, **stock** (nullable int — `null` = ilimitado) |
| `categoria_producto` / `producto_subcategoria` (pivots) | N:M |
| `producto_media` | producto_id, **producto_variante_id** (nullable FK a `producto_variantes`, `nullOnDelete` — `null` = medio general, se muestra para cualquier color; seteado = imagen/video propio de esa variante), tipo('imagen'\|'video'), ruta, orden, is_principal |
| `producto_escalas_precio` | producto_id, cantidad_minima, precio_unitario — precio por volumen, unique(producto_id, cantidad_minima) |
| `producto_variantes` | producto_id, nombre, color_hex, **es_color_personalizado** (bool, default false — como mucho una fila así marcada por producto: representa "Otro / a elección del cliente", `color_hex` ahí es solo el ícono de referencia del swatch, no el color real que va a pedir el cliente), precio_adicional (recargo sobre el precio base), stock (nullable = ilimitado, mismo criterio que `productos.stock`), sku, orden, is_active |
| `addons` | nombre, descripcion, precio, **requiere_texto** (bool — ej. "Grabado con nombre"), placeholder_texto, max_caracteres (default 40), is_active |
| `producto_addon` (pivot) | producto_id, addon_id, **precio_override** (nullable — si no está seteado, se usa `addons.precio`), orden |
| `ofertas` | producto_id, `tipo_descuento`('porcentaje'\|'fijo'), `valor_descuento`, `alcance`('todos'\|'especifico'), `producto_escala_precio_id` (si es específica a una escala), fecha_inicio/fin, is_active. (Columnas `precio_oferta`/`porcentaje_descuento` originales quedaron legacy, reemplazadas por el par tipo/valor) |
| `pedidos` | cliente_nombre, cliente_dni, cliente_telefono, cliente_email, cliente_provincia, **cliente_ciudad** (antes `cliente_direccion` — el checkout es a sucursal, no a domicilio), cliente_codigo_postal, observaciones, subtotal, total, estado, despachado_at, codigo_descuento_id + snapshot (texto/tipo/valor), descuento_monto |
| `pedido_items` | pedido_id, producto_id, titulo, precio_unitario, cantidad, subtotal, **producto_variante_id** (nullable FK, `nullOnDelete`), **variante_nombre**/**variante_color_hex**/**recargo_variante_unitario** (snapshot de la variante elegida al momento de la compra, no depende de que la fila siga existiendo), **addons_seleccionados** (json: array de `{addon_id, nombre, precio, texto_personalizado}`), **addons_total_unitario**, **precio_base_unitario** (precio sin recargo de variante ni addons, para desglosar en reportes — `precio_unitario` sigue siendo el final con todo incluido), **color_personalizado_texto** (nullable — solo cuando la variante elegida es `es_color_personalizado`; ver §8) |
| `movimientos_stock` | producto_id, **producto_variante_id** (nullable FK, `nullOnDelete` — si está seteado, el movimiento es del stock de la variante y no del producto), pedido_id, cantidad (con signo), motivo(`pedido_creado`\|`pedido_cancelado`\|`ajuste_manual`), stock_resultante |
| `configuracion_envio` | monto_minimo (decimal, `0` = feature de envío gratis desactivada) — fila única |
| `codigos_descuento` | codigo(unique), tipo_descuento, valor_descuento, activo, vigente_desde/hasta, limite_usos, usos_actuales |

**Seeders** (`database/seeders/`): `UserSeeder` (1 admin), `CategoriaSeeder` (6 categorías), `SubcategoriaSeeder`, `ProductoSeeder` (**3 "Producto de Prueba" con escalas de precio, explícitamente temporales** — el catálogo real se carga a mano desde el panel admin; el seeder viejo que importaba el catálogo real desde un CSV de WordPress fue eliminado).

**Credenciales admin seedeadas**: `admin@admin` / `1234` (rol `admin`).

## 4. Modelos (`app/Models/`)

- **User** — cast `role` a `RolUsuario`, `esAdmin(): bool`.
- **Categoria** / **Subcategoria** — relaciones N:M con Producto vía los pivots.
- **Producto** — `imagenes()`/`videos()` (subsets de `media()` por `tipo`), `imagenPrincipal()`, `ofertaVigente()`, `escalasPrecio()`, `movimientosStock()`, `variantes()`/`variantesActivas()` (ordenadas por `orden`), `tieneVariantes(): bool`, `addons()`/`addonsActivos()` (con pivot `precio_override`/`orden`). Métodos de negocio: `tieneStockIlimitado()`, `tieneStockDisponible(int)` (⚠️ con variantes, ignora `productos.stock` y agrega sobre `variantesActivas()` — ver deuda técnica en §14, hay un caso borde con la única variante inactiva), `escalaAplicable(int $cantidad): ?EscalaPrecio`, `scopeConStock()`, `mediaParaVariante(?int $varianteId)` (⚠️ no la llama ningún controller — la resolución real de galería por color pasa por el espejo en JS `resolverMediaParaVariante`, ver §10 y deuda técnica en §14).
- **ProductoVariante** (tabla `producto_variantes`) — `producto()`, `mediaEspecifica()` (medios propios vía `producto_media.producto_variante_id`), `esPersonalizada(): bool` (true = "Otro / a elección del cliente"), `tieneStockIlimitado()`/`tieneStockDisponible(int)` (mismo criterio que Producto), `scopeActivas()`.
- **Addon** — `productos(): BelongsToMany` (pivot `producto_addon`, con `precio_override`/`orden`), `scopeActivos()`. `requiere_texto` (bool) determina si el checklist público exige un texto de personalización (ej. "Grabado con nombre").
- **ProductoMedia** — `esImagen()`/`esVideo()`, `productoVariante()` (nullable — `null` = medio general para cualquier color).
- **EscalaPrecio** (tabla `producto_escalas_precio`) — `belongsTo(Producto)`.
- **Oferta** — `tipo_descuento`/`alcance` cast a enum, `escalaPrecio()` (si `alcance = especifico`), `estaVigente()`.
- **Pedido** — `items()`, `movimientosStock()`, `codigoDescuento()`, cast `estado` a `EstadoPedido`, `scopeFacturables()` (excluye cancelados).
- **PedidoItem** — `pedido()`, `producto()`, `productoVariante()`. Guarda un snapshot completo de la variante/addons/color elegidos al momento de la compra (ver tabla en §3), independiente de que esas filas sigan existiendo o cambien después.
- **MovimientoStock**, **CodigoDescuento** (`estaVigente()`, `yaComenzo()`, `yaTermino()`, `tieneUsosDisponibles()`), **ConfiguracionEnvio** (`static obtener()`, firstOrCreate).

## 5. Enums (`app/Enums/`)

- **RolUsuario**: `Admin` | `Vendedor`.
- **EstadoPedido**: `Pendiente` | `Despachado` | `Cancelado`, con `puedeTransicionarA()` (cancelado es terminal; no se puede cancelar un pedido ya despachado sin volverlo antes a pendiente).
- **TipoDescuento**: `Porcentaje` | `Fijo`.
- **AlcanceOferta**: `Todos` | `Especifico` (a una escala de precio puntual).
- **MotivoMovimientoStock**: `PedidoCreado` | `PedidoCancelado` | `AjusteManual`.

## 6. Servicios (`app/Services/`)

- **PricingService** — `calcularPrecio(Producto, cantidad, ?varianteId, addonIds[], bool $exigirVariante = false): PriceResult`. Resuelve la escala de precio aplicable + la oferta vigente (respetando su alcance) sobre el precio base, y por encima suma el recargo de la variante elegida (`resolverVariante()`) y el total de los add-ons elegidos (`resolverAddons()`) — la oferta nunca se calcula sobre variante/addons, esas opciones no tienen descuento propio. `resolverVariante()`/`resolverAddons()` no confían en lo que mandó el frontend: un `variante_id`/`addon_id` que no pertenezca al producto o no esté activo rechaza con 422 en vez de ignorarlo. `$exigirVariante` (solo lo pasa `PedidoController::store`, ver más abajo) hace que `resolverVariante()` lance `VarianteRequeridaException` si el producto tiene variantes activas y no vino ninguna — el resto de los callers (precio de vidriera en `TiendaController::show`/`precio`) lo dejan en `false` a propósito, para poder seguir mostrando un precio antes de que el cliente elija color. Espejado 1:1 en el frontend por `resources/js/lib/pricing.js` (mismo comportamiento sin ida y vuelta al server, salvo la validación estricta de pertenencia/actividad, que solo vive acá).
- **StockService** — `validarDisponibilidad()` (chequeo optimista), `descontar(Pedido)` / `reponer(Pedido)` (transacción con `lockForUpdate`, lanza `StockInsuficienteException` ante condición de carrera; `reponer()` es idempotente). Por cada item, si tiene `producto_variante_id` descuenta/repone el stock de **esa variante** en vez del producto — el orden de lock dentro de la transacción es siempre (producto_id, luego producto_variante_id) para que dos checkouts concurrentes sobre los mismos productos/variantes no se deadlockeen entre sí. Cubierto por un test de concurrencia real contra MySQL (ver §16).
- **CodigoDescuentoService** — `validar()` (previsualización para el carrito, sin lock), `resolverParaCheckout()` (con lock, dentro de la transacción del checkout — nunca confía en lo que mandó el frontend), `liberarUso(Pedido)` (al cancelar).
- **Excepciones de dominio** (`app/Exceptions/`) — `StockInsuficienteException` y `VarianteRequeridaException`: ambas se lanzan dentro de la transacción del checkout (`PedidoController::store`) y se capturan ahí mismo para convertirlas en un 422 con mensaje legible, nunca burbujean como error 500.

## 7. Rutas

**`routes/web.php`** — públicas: `/`, `/tienda` (index con filtros `categoria`/`subcategoria`/`q`/`filter=destacados|ofertas`, show), `/contacto`, `/mayoristas`, `/carrito`, `/checkout` (GET vista + `POST checkout.store`), `/confirmacion-pedido`. Auth genérico: `/profile`, `/dashboard`. Admin (`middleware('auth')`, algunas rutas de `destroy` además con `role:admin`): `admin/categorias|subcategorias|productos|ofertas|codigos-descuento` (CRUD resource), `admin/pedidos` (index/show/cambiar-estado), y **solo admin**: `admin/metricas`, `admin/usuarios`, `admin/configuracion/envio`.

**`routes/api.php`** — `GET /api/productos/{producto}/precio`, `POST /api/codigos-descuento/validar` (público, usado por el carrito/checkout para previsualizar un código).

**`routes/legacy_redirects.php`** — incluido al principio de `web.php`. Redirects 301 desde las URLs indexadas del WordPress anterior (relevadas de su `wp-sitemap.xml` en producción) hacia sus equivalentes acá: páginas fijas y el mapa dinámico `/product-category/{slug}` que resuelve categoría/subcategoría **por nombre** contra la base (no por id hardcodeado, porque en producción se administran a mano). Pendiente a propósito: los 57 redirects de producto individual (`/product/{slug}/`), hasta que el catálogo real esté cargado. Nota: no se puede registrar un redirect en `/productos` porque colisiona con la carpeta física `public/productos/`.

**`routes/auth.php`** — Breeze estándar (login, forgot/reset password, verify-email, confirm-password, logout). **No hay registro self-service** (fue removido intencionalmente).

## 8. Controladores (`app/Http/Controllers/`)

- **TiendaController** — `index` (catálogo público paginado, sin-stock al final del listado en vez de ocultos; agrega `withCount('variantesActivas')` y expone `tiene_variantes: bool` por producto, sin cargar las filas completas — lo usa el frontend para decidir si el "Agregar" rápido de la card debe mandar a la ficha en vez de agregar directo, ver §9), `show` (ficha completa con `variantes`/`addons` activos + relacionados), `precio` (API, recalcula server-side con variante/addons opcionales — la validación de pertenencia/actividad la hace `PricingService`). El home (closure `/` en `routes/web.php`) hace el mismo `withCount`/`tiene_variantes` para alimentar `OutstandingProducts.jsx`.
- **ProductoController** — CRUD admin, upload de imágenes (max 5MB)/videos (max 50MB) a `public/productos/`, gestión de imagen principal, sync de escalas de precio, `toggleFeatured`. Además sincroniza **variantes de color** (`sincronizarVariantes()` — upsert/delete por id, `orden` según posición en el payload; `validarUnicoColorPersonalizado()` rechaza más de una variante `es_color_personalizado` por producto, resguardo server-side detrás de la misma regla en el frontend) y **add-ons** (`sincronizarAddons()`, `sync()` de la tabla pivot `producto_addon` con `precio_override`/`orden`). El gestor de multimedia permite etiquetar cada imagen/video con el color al que pertenece: `imagenes_variante_clave`/`videos_variante_clave` (paralelos por índice a los archivos nuevos subidos) y `media_variante_asignaciones` (reasigna el color de un medio ya existente, solo en `update`). La "clave" es estable pero no es el id real todavía en el momento del submit — puede ser un uuid generado en cliente para una variante que se está creando en el mismo request — y se traduce a `producto_variante_id` real recién al guardar, vía el mapa que devuelve `sincronizarVariantes()`.
- **CategoriaController** / **SubcategoriaController** — CRUD simple.
- **OfertaController** — CRUD con tipo/valor/alcance de descuento, valida solapamiento de fechas entre ofertas activas del mismo producto, `toggleActive`.
- **CodigoDescuentoController** — CRUD admin (bloquea borrar códigos ya usados), `toggleActive`. **CodigoDescuentoValidacionController** — endpoint público de previsualización.
- **PedidoController** — `index`/`show`, `cambiarEstado` (valida transición, repone stock y libera cupo de código al cancelar), `store` (checkout: valida stock optimista, y por cada item — **antes** de tocar precio o stock — si el producto tiene variantes activas exige `variante_id` en el request, sea la variante de color fijo o "a elección" (rechaza 422 si no vino, mensaje con el producto puntual); calcula precio real server-side con `PricingService` (`exigirVariante: true` como defensa en profundidad detrás del chequeo anterior); si la variante resuelta es `es_color_personalizado`, exige además `color_personalizado_texto` no vacío; valida que cada addon con `requiere_texto` haya traído su texto; resuelve código con lock; crea pedido+items con el snapshot completo en una transacción; descuenta stock).
- **UsuarioController** — CRUD de usuarios/roles, protege contra eliminar o degradar al único admin.
- **ConfiguracionEnvioController** — edit/update del monto mínimo de envío gratis.
- **MetricasController** — facturación (totales, comparación de período, series, top 5 productos).
- **DashboardController** — stats generales para `/dashboard`.
- **ProfileController**, **Auth/\*** — Breeze estándar.

## 9. Frontend — Páginas (`resources/js/Pages/`)

**Públicas**: `Welcome.jsx`, `Tienda.jsx` (con barra de búsqueda; el botón "Agregar" rápido de cada card se comporta como link a la ficha en vez de agregar directo cuando `producto.tiene_variantes` — para no saltear la elección de color; sin variantes, agrega directo al carrito igual que siempre), `ShowProduct.jsx` (galería con lightbox zoom + video; **con variantes**, arranca con la primera variante activa ya seleccionada — no hace falta clickear para ver precio/stock/foto reales — y la galería se resuelve contra la media propia de esa variante, cayendo a la general si no tiene ninguna; si la variante activa es "a elección del cliente", despliega un input de color libre + texto; tabla de precios por cantidad), `Carrito.jsx`, `Checkout.jsx` (envío a sucursal: provincia + ciudad, no domicilio; incluye bloque de código de descuento y barra de envío gratis), `ConfirmacionPedido.jsx`, `Contacto.jsx`, `Mayoristas.jsx`, `Dashboard.jsx`.

**Auth/Profile**: Breeze estándar (sin Register).

**Admin**: `Admin/Categorias|Subcategorias|Productos|Ofertas|CodigosDescuento/*` (CRUD), `Admin/Pedidos/{Index,Show}` (gestión de estado, historial de stock), `Admin/Metricas/Index` (gráfico de facturación), `Admin/Usuarios/*` (gestión de roles), `Admin/ConfiguracionEnvio/Edit`.

## 10. Frontend — Componentes, Context, Hooks, Lib

- **CartContext** (`Context/CartContext.jsx`) — carrito en `localStorage['chisperio_cart']`, snapshot de precio/escalas/oferta/stock por item (recalcula en cada render vía `resolverPrecio`), estado del **drawer de carrito** compartido (`cartDrawerOpen`/`openCartDrawer`/`closeCartDrawer`), y manejo completo de código de descuento (aplicar/quitar/revalidación automática contra el endpoint público). Cada línea de carrito puede llevar `varianteId`/`variante` (snapshot nombre/color_hex/precio_adicional), `addons` (array `{addon_id, nombre, precio, texto_personalizado}`) y `colorPersonalizadoTexto` — `generarLineKey()` arma una identidad de línea distinta por cada combinación (dos líneas del mismo producto con distinto color/addons no se suman entre sí). Al montar, revalida contra `GET /api/productos/{id}/precio` la variante/addons de cada línea persistida: si algo dejó de existir o se desactivó desde que se agregó, se quita de la línea (no del carrito entero) con un aviso.
- **CartButton.jsx** — drawer de carrito de alto completo con overlay blureado; el botón flotante (FAB) solo aparece en **desktop** y recién tras hacer scroll; en **mobile** el ícono del carrito del navbar (`LandingHeader`) dispara el mismo drawer en vez de navegar a `/carrito`.
- **WhatsAppButton.jsx** — flotante, oculto hasta hacer scroll; muestra una leyenda dismisible ("¿Necesitás asesoramiento?") 1.5s después de aparecer, con memoria de cierre por sesión (`sessionStorage`).
- **ProductImageLightbox.jsx** — lightbox de galería con zoom/pan/pinch (`react-zoom-pan-pinch`), navegación entre imágenes. **ImageLightbox.jsx** — versión simple de una sola imagen (usada en `Admin/Pedidos/Show`).
- **VarianteColorSwatches.jsx** — selector de color en `ShowProduct.jsx`: swatches normales por `color_hex`, y un swatch arcoíris para la variante `es_color_personalizado` que, al estar seleccionada (por default o por click, da igual), despliega un `<input type="color">` + un texto libre para que el cliente describa lo que quiere.
- **VariantesColorRepeater.jsx** (admin, `Admin/Productos/Create|Edit`) — repeater de variantes de color (nombre, color, precio adicional, stock, activo, flag "es un color a elección del cliente" — tildar uno destilda automáticamente cualquier otro del mismo producto), con aviso si una variante no tiene imagen propia cargada en el gestor de multimedia.
- **ProductoAddonsChecklist.jsx** (público, en `ShowProduct.jsx`) / **AddonsProductoSelector.jsx** (admin) — checklist/selector de add-ons con su input de texto cuando `requiere_texto`.
- **PillsCantidad.jsx**, **TablaPreciosPorCantidad.jsx**, **TablaPreciosPreview.jsx**, **EscalasPrecioRepeater.jsx** — UI de precio por cantidad (pública y admin).
- **OfertaDescuentoFields.jsx** — campos tipo/valor/alcance de descuento (espeja validación del backend).
- **BarraEnvioGratis.jsx** — progreso hacia el envío gratis (lee `configuracionEnvio` compartido por Inertia).
- **CodigoDescuentoBlock.jsx** — input + estado de código de descuento aplicado, compartido entre `Carrito.jsx` y `Checkout.jsx`.
- **Landing/** — `LandingHeader`, `HeroSection`, `TrustBanner`, `CategoriesSection`, `OutstandingProducts` (mismo criterio que la card de `Tienda.jsx`: "Agregar" se vuelve link a la ficha si `producto.tiene_variantes`), `RentalMachine`, `ReviewsSection`, `FAQSection`, `ContactSection`, `WholesalerSection`, `LandingFooter` (incluye un link discreto **"Acceso equipo"** hacia `/login`, mismo estilo que el resto de los links del footer).
- **hooks/** — `useNotificacionEnvioGratis` (toast una vez por sesión al cruzar el umbral), `useScrolledPast` (bool tras cruzar un umbral de scroll, usado por los botones flotantes).
- **lib/** — `pricing.js` (espejo JS de `PricingService::calcularPrecio`, incluye resolución de variante/addons — sin la validación estricta de pertenencia, esa solo vive en el backend), `stock.js` (`sinStock`, `tieneStockBajo`, `cantidadMaxima`, etc. — todas aceptan un `varianteId` opcional para mirar el stock de esa variante en vez del producto), `media.js` (`resolverMediaParaVariante(imagenes, videos, varianteId)` — espejo pensado para `Producto::mediaParaVariante()`, aunque hoy es el único lado que realmente se usa, ver §14), `whatsapp.js` (`buildOrderMessage(pedido)` — única fuente de verdad del formato del mensaje, compartida por `Checkout.jsx` y `ConfirmacionPedido.jsx`; agrega la línea de color de la variante fija, "Color solicitado" para la variante a elección, y una línea por cada add-on, solo cuando el item efectivamente los tiene).
- **Layouts**: `GuestLayout`, `AuthenticatedLayout` (Breeze).

## 11. Sistema de roles

Ya no es "cualquier usuario logueado tiene acceso admin": existe `RolUsuario` (`admin`/`vendedor`) y el middleware `EnsureUserHasRole` (alias `role`, ver `bootstrap/app.php`). Un vendedor puede operar productos/pedidos pero no accede a `admin/metricas`, `admin/usuarios` ni `admin/configuracion/envio`, y las acciones de `destroy` (borrar categoría/producto/oferta/código) están reservadas a `role:admin`. El admin no se puede eliminar ni degradar a sí mismo si es el único admin del sistema.

## 12. Integración WhatsApp

- Número **hardcodeado en 7 archivos** (`WhatsAppButton.jsx`, `Checkout.jsx`, `ConfirmacionPedido.jsx`, `WholesalerSection.jsx`, `RentalMachine.jsx`, `LandingFooter.jsx`, `FAQSection.jsx`): `5491127930349`. Sigue siendo deuda técnica centralizarlo.
- El pedido **ya está persistido en backend** antes de armar el mensaje (a diferencia de como funcionaba originalmente) — el mensaje de WhatsApp es la vía de aviso/coordinación, no el único registro del pedido. Igual se guarda una copia en `sessionStorage['chisperio_last_order']` para poder reenviarlo desde la confirmación.

## 13. SEO y deploy a producción

- **Estructura de producción**: en el hosting (Hostinger), el contenido de `public/` se sube a `public_html/` y el resto del proyecto a una carpeta hermana `laravel/`. `public/index.php` y `bootstrap/app.php` detectan automáticamente esa estructura (sin tocar nada a mano en cada deploy) y ajustan el `public_path()` interno de Laravel para que Vite, `storage:link` (no usado, ver más abajo) y las subidas de producto apunten al lugar correcto.
- **`public/.user.ini`** — sube los límites de PHP (`upload_max_filesize`/`post_max_size` a 64M, etc.) para que entren los videos de hasta 50MB; solo aplica bajo PHP-FPM (no afecta al server embebido de `php artisan serve`).
- Las imágenes/videos de productos se guardan **directo en `public/productos/`** vía `public_path()`, no por el disco `Storage` de Laravel — por eso `storage:link` no hace falta ni se usa.
- **Favicons** completos en `public/images/favicons/` + referencias en `resources/views/app.blade.php`.
- **`routes/legacy_redirects.php`** — ver sección 7.

## 14. Puntos importantes / deuda técnica a tener en cuenta

- **`.env.example` desactualizado**: sigue diciendo `DB_CONNECTION=sqlite` con placeholders comentados, cuando el proyecto real corre en MySQL. Convendría corregirlo para que un setup nuevo no arranque mal.
- `PRODUCTOS_IMG_PATH`/`PRODUCTOS_VIDEO_PATH` están seteadas en `.env` real y consumidas por `config/productos.php`, pero **no están en `.env.example`**.
- `VITE_PRODUCT_IMAGES_PATH`/`VITE_PRODUCT_VIDEOS_PATH` (env vars con prefijo `VITE_`) existen en `.env` pero **no se usan en ningún lado del frontend** — config muerta, candidata a limpieza.
- Número de WhatsApp sigue hardcodeado en 7 archivos (ver sección 12).
- No hay registro de usuarios self-service (removido a propósito) — alta solo por seeder/admin.
- El carrito sigue viviendo enteramente en el navegador (`localStorage`/`sessionStorage`), no hay sesión de carrito en backend.
- `Producto::mediaParaVariante()` (PHP) no lo llama ningún controller — toda la resolución real de "qué imagen/video mostrar para este color" pasa por su espejo en JS (`resolverMediaParaVariante`, `resources/js/lib/media.js`). Si el día de mañana se toca uno de los dos sin el otro, van a divergir en silencio.
- `Producto::tieneStockDisponible()` decide si usar el branch de stock-por-variante mirando `tieneVariantes()` (cualquiera, activa o no), pero después agrega solo sobre `variantesActivas()`. Un producto cuya **única** variante quedó inactiva termina reportado como sin stock disponible (afecta el chequeo optimista del checkout y potencialmente `scopeConStock()`) aunque el producto en sí tenga de sobra. Detectado en QA de la mejora de color a elección, no forma parte de ella — queda pendiente.
- El "Agregar" rápido de `Tienda.jsx`/`OutstandingProducts.jsx` se volvió link a la ficha para productos con variantes (en vez de agregar sin color), pero como refuerzo real contra cualquier vía de request que se salte el selector, la garantía fuerte vive en el backend: `PedidoController::store` rechaza cualquier item sin `variante_id` si el producto tiene variantes activas, y `PricingService::resolverVariante()` lo vuelve a chequear (`VarianteRequeridaException`) como defensa en profundidad. Ver §6 y §8.

## 15. Assets públicos (`public/`)

- `productos/img/` y `productos/videos/` — media de productos subida desde el admin, nombrada `{timestamp}_{index}_{nombre-original}`.
- `images/` — assets estáticos de marca y landing (logo, heroes, imágenes de filtro por categoría).
- `images/favicons/` — set completo de favicons + `site.webmanifest`.
- `.user.ini` — overrides de límites de PHP (ver sección 13).
- `build/` — output de `vite build` (no commitear manualmente, se regenera).

## 16. Testing

- El grueso de la suite (`tests/Feature`, `tests/Unit`) corre contra **sqlite `:memory:`** (`RefreshDatabase`), configurado en `phpunit.xml`.
- **`StockServiceConcurrencyTest`** es la excepción: prueba el `lockForUpdate()` real de `StockService::descontar()` bajo concurrencia genuina, algo que sqlite `:memory:` no puede simular (ni emite `FOR UPDATE`, ni una segunda conexión ve la misma base). Para eso:
  - Usa una conexión MySQL real y dedicada (`stock_lock_test` → base `chisperio_stock_lock_test`), separada de la base de dev/prod y de la `:memory:` del resto de la suite.
  - El setup corre `migrate:fresh` sobre esa conexión **una vez por proceso de PHPUnit** (flag estático `self::$baseDeDatosMigrada`, no antes de cada test) — antes tenía un guard basado en "si no existe la tabla `productos`, migrar", que dejó de dispararse apenas esa base quedó con `productos` de una corrida vieja, y una migración nueva (`producto_variantes`) nunca llegó a crearse ahí. `migrate:fresh` deja la base siempre igual a `database/migrations` en ese momento, sin importar qué haya quedado de corridas previas.
  - El "lado A" de la carrera corre en un **proceso de PHP real e independiente** (`tests/Concurrency/descontar_worker.php`, mismo `StockService` sin mocks) mientras el "lado B" corre en el proceso de PHPUnit — un solo hilo de PHP no puede simular dos transacciones esperándose entre sí.
  - Si no hay MySQL disponible localmente, el test se **skipea** (no rompe el resto de la suite).
