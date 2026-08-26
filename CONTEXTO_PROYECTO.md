# Chisperío — Contexto del Proyecto

> Documento generado para dar contexto rápido a un asistente (Claude) sobre el estado actual del sistema. Última actualización: 2026-08-25.

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
| `producto_media` | producto_id, tipo('imagen'\|'video'), ruta, orden, is_principal |
| `producto_escalas_precio` | producto_id, cantidad_minima, precio_unitario — precio por volumen, unique(producto_id, cantidad_minima) |
| `ofertas` | producto_id, `tipo_descuento`('porcentaje'\|'fijo'), `valor_descuento`, `alcance`('todos'\|'especifico'), `producto_escala_precio_id` (si es específica a una escala), fecha_inicio/fin, is_active. (Columnas `precio_oferta`/`porcentaje_descuento` originales quedaron legacy, reemplazadas por el par tipo/valor) |
| `pedidos` | cliente_nombre, cliente_dni, cliente_telefono, cliente_email, cliente_provincia, **cliente_ciudad** (antes `cliente_direccion` — el checkout es a sucursal, no a domicilio), cliente_codigo_postal, observaciones, subtotal, total, estado, despachado_at, codigo_descuento_id + snapshot (texto/tipo/valor), descuento_monto |
| `pedido_items` | pedido_id, producto_id, titulo, precio_unitario, cantidad, subtotal |
| `movimientos_stock` | producto_id, pedido_id, cantidad (con signo), motivo(`pedido_creado`\|`pedido_cancelado`\|`ajuste_manual`), stock_resultante |
| `configuracion_envio` | monto_minimo (decimal, `0` = feature de envío gratis desactivada) — fila única |
| `codigos_descuento` | codigo(unique), tipo_descuento, valor_descuento, activo, vigente_desde/hasta, limite_usos, usos_actuales |

**Seeders** (`database/seeders/`): `UserSeeder` (1 admin), `CategoriaSeeder` (6 categorías), `SubcategoriaSeeder`, `ProductoSeeder` (**3 "Producto de Prueba" con escalas de precio, explícitamente temporales** — el catálogo real se carga a mano desde el panel admin; el seeder viejo que importaba el catálogo real desde un CSV de WordPress fue eliminado).

**Credenciales admin seedeadas**: `admin@admin` / `1234` (rol `admin`).

## 4. Modelos (`app/Models/`)

- **User** — cast `role` a `RolUsuario`, `esAdmin(): bool`.
- **Categoria** / **Subcategoria** — relaciones N:M con Producto vía los pivots.
- **Producto** — `imagenes()`/`videos()` (subsets de `media()` por `tipo`), `imagenPrincipal()`, `ofertaVigente()`, `escalasPrecio()`, `movimientosStock()`. Métodos de negocio: `tieneStockIlimitado()`, `tieneStockDisponible(int)`, `escalaAplicable(int $cantidad): ?EscalaPrecio`, `scopeConStock()`.
- **ProductoMedia** — `esImagen()`/`esVideo()`.
- **EscalaPrecio** (tabla `producto_escalas_precio`) — `belongsTo(Producto)`.
- **Oferta** — `tipo_descuento`/`alcance` cast a enum, `escalaPrecio()` (si `alcance = especifico`), `estaVigente()`.
- **Pedido** — `items()`, `movimientosStock()`, `codigoDescuento()`, cast `estado` a `EstadoPedido`, `scopeFacturables()` (excluye cancelados).
- **PedidoItem**, **MovimientoStock**, **CodigoDescuento** (`estaVigente()`, `yaComenzo()`, `yaTermino()`, `tieneUsosDisponibles()`), **ConfiguracionEnvio** (`static obtener()`, firstOrCreate).

## 5. Enums (`app/Enums/`)

- **RolUsuario**: `Admin` | `Vendedor`.
- **EstadoPedido**: `Pendiente` | `Despachado` | `Cancelado`, con `puedeTransicionarA()` (cancelado es terminal; no se puede cancelar un pedido ya despachado sin volverlo antes a pendiente).
- **TipoDescuento**: `Porcentaje` | `Fijo`.
- **AlcanceOferta**: `Todos` | `Especifico` (a una escala de precio puntual).
- **MotivoMovimientoStock**: `PedidoCreado` | `PedidoCancelado` | `AjusteManual`.

## 6. Servicios (`app/Services/`)

- **PricingService** — `calcularPrecio(Producto, cantidad): PriceResult`. Resuelve la escala de precio aplicable + la oferta vigente (respetando su alcance), devuelve precio de lista/final y ahorro. Espejado 1:1 en el frontend por `resources/js/lib/pricing.js` (mismo comportamiento sin ida y vuelta al server).
- **StockService** — `validarDisponibilidad()` (chequeo optimista), `descontar(Pedido)` (transacción con `lockForUpdate`, lanza `StockInsuficienteException` ante condición de carrera), `reponer(Pedido)` (al cancelar, idempotente).
- **CodigoDescuentoService** — `validar()` (previsualización para el carrito, sin lock), `resolverParaCheckout()` (con lock, dentro de la transacción del checkout — nunca confía en lo que mandó el frontend), `liberarUso(Pedido)` (al cancelar).

## 7. Rutas

**`routes/web.php`** — públicas: `/`, `/tienda` (index con filtros `categoria`/`subcategoria`/`q`/`filter=destacados|ofertas`, show), `/contacto`, `/mayoristas`, `/carrito`, `/checkout` (GET vista + `POST checkout.store`), `/confirmacion-pedido`. Auth genérico: `/profile`, `/dashboard`. Admin (`middleware('auth')`, algunas rutas de `destroy` además con `role:admin`): `admin/categorias|subcategorias|productos|ofertas|codigos-descuento` (CRUD resource), `admin/pedidos` (index/show/cambiar-estado), y **solo admin**: `admin/metricas`, `admin/usuarios`, `admin/configuracion/envio`.

**`routes/api.php`** — `GET /api/productos/{producto}/precio`, `POST /api/codigos-descuento/validar` (público, usado por el carrito/checkout para previsualizar un código).

**`routes/legacy_redirects.php`** — incluido al principio de `web.php`. Redirects 301 desde las URLs indexadas del WordPress anterior (relevadas de su `wp-sitemap.xml` en producción) hacia sus equivalentes acá: páginas fijas y el mapa dinámico `/product-category/{slug}` que resuelve categoría/subcategoría **por nombre** contra la base (no por id hardcodeado, porque en producción se administran a mano). Pendiente a propósito: los 57 redirects de producto individual (`/product/{slug}/`), hasta que el catálogo real esté cargado. Nota: no se puede registrar un redirect en `/productos` porque colisiona con la carpeta física `public/productos/`.

**`routes/auth.php`** — Breeze estándar (login, forgot/reset password, verify-email, confirm-password, logout). **No hay registro self-service** (fue removido intencionalmente).

## 8. Controladores (`app/Http/Controllers/`)

- **TiendaController** — `index` (catálogo público paginado, sin-stock al final del listado en vez de ocultos), `show` (ficha + relacionados), `precio` (API).
- **ProductoController** — CRUD admin, upload de imágenes (max 5MB)/videos (max 50MB) a `public/productos/`, gestión de imagen principal, sync de escalas de precio, `toggleFeatured`.
- **CategoriaController** / **SubcategoriaController** — CRUD simple.
- **OfertaController** — CRUD con tipo/valor/alcance de descuento, valida solapamiento de fechas entre ofertas activas del mismo producto, `toggleActive`.
- **CodigoDescuentoController** — CRUD admin (bloquea borrar códigos ya usados), `toggleActive`. **CodigoDescuentoValidacionController** — endpoint público de previsualización.
- **PedidoController** — `index`/`show`, `cambiarEstado` (valida transición, repone stock y libera cupo de código al cancelar), `store` (checkout: valida stock, calcula precio real server-side, resuelve código con lock, crea pedido+items en transacción, descuenta stock).
- **UsuarioController** — CRUD de usuarios/roles, protege contra eliminar o degradar al único admin.
- **ConfiguracionEnvioController** — edit/update del monto mínimo de envío gratis.
- **MetricasController** — facturación (totales, comparación de período, series, top 5 productos).
- **DashboardController** — stats generales para `/dashboard`.
- **ProfileController**, **Auth/\*** — Breeze estándar.

## 9. Frontend — Páginas (`resources/js/Pages/`)

**Públicas**: `Welcome.jsx`, `Tienda.jsx` (con barra de búsqueda), `ShowProduct.jsx` (galería con lightbox zoom + video, tabla de precios por cantidad), `Carrito.jsx`, `Checkout.jsx` (envío a sucursal: provincia + ciudad, no domicilio; incluye bloque de código de descuento y barra de envío gratis), `ConfirmacionPedido.jsx`, `Contacto.jsx`, `Mayoristas.jsx`, `Dashboard.jsx`.

**Auth/Profile**: Breeze estándar (sin Register).

**Admin**: `Admin/Categorias|Subcategorias|Productos|Ofertas|CodigosDescuento/*` (CRUD), `Admin/Pedidos/{Index,Show}` (gestión de estado, historial de stock), `Admin/Metricas/Index` (gráfico de facturación), `Admin/Usuarios/*` (gestión de roles), `Admin/ConfiguracionEnvio/Edit`.

## 10. Frontend — Componentes, Context, Hooks, Lib

- **CartContext** (`Context/CartContext.jsx`) — carrito en `localStorage['chisperio_cart']`, snapshot de precio/escalas/oferta/stock por item (recalcula en cada render), estado del **drawer de carrito** compartido (`cartDrawerOpen`/`openCartDrawer`/`closeCartDrawer`), y manejo completo de código de descuento (aplicar/quitar/revalidación automática contra el endpoint público).
- **CartButton.jsx** — drawer de carrito de alto completo con overlay blureado; el botón flotante (FAB) solo aparece en **desktop** y recién tras hacer scroll; en **mobile** el ícono del carrito del navbar (`LandingHeader`) dispara el mismo drawer en vez de navegar a `/carrito`.
- **WhatsAppButton.jsx** — flotante, oculto hasta hacer scroll; muestra una leyenda dismisible ("¿Necesitás asesoramiento?") 1.5s después de aparecer, con memoria de cierre por sesión (`sessionStorage`).
- **ProductImageLightbox.jsx** — lightbox de galería con zoom/pan/pinch (`react-zoom-pan-pinch`), navegación entre imágenes. **ImageLightbox.jsx** — versión simple de una sola imagen (usada en `Admin/Pedidos/Show`).
- **PillsCantidad.jsx**, **TablaPreciosPorCantidad.jsx**, **TablaPreciosPreview.jsx**, **EscalasPrecioRepeater.jsx** — UI de precio por cantidad (pública y admin).
- **OfertaDescuentoFields.jsx** — campos tipo/valor/alcance de descuento (espeja validación del backend).
- **BarraEnvioGratis.jsx** — progreso hacia el envío gratis (lee `configuracionEnvio` compartido por Inertia).
- **CodigoDescuentoBlock.jsx** — input + estado de código de descuento aplicado, compartido entre `Carrito.jsx` y `Checkout.jsx`.
- **Landing/** — `LandingHeader`, `HeroSection`, `TrustBanner`, `CategoriesSection`, `OutstandingProducts`, `RentalMachine`, `ReviewsSection`, `FAQSection`, `ContactSection`, `WholesalerSection`, `LandingFooter` (incluye un link discreto **"Acceso equipo"** hacia `/login`, mismo estilo que el resto de los links del footer).
- **hooks/** — `useNotificacionEnvioGratis` (toast una vez por sesión al cruzar el umbral), `useScrolledPast` (bool tras cruzar un umbral de scroll, usado por los botones flotantes).
- **lib/** — `pricing.js` (espejo JS de `PricingService`), `stock.js` (`sinStock`, `tieneStockBajo`, `cantidadMaxima`, etc.).
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

## 15. Assets públicos (`public/`)

- `productos/img/` y `productos/videos/` — media de productos subida desde el admin, nombrada `{timestamp}_{index}_{nombre-original}`.
- `images/` — assets estáticos de marca y landing (logo, heroes, imágenes de filtro por categoría).
- `images/favicons/` — set completo de favicons + `site.webmanifest`.
- `.user.ini` — overrides de límites de PHP (ver sección 13).
- `build/` — output de `vite build` (no commitear manualmente, se regenera).
