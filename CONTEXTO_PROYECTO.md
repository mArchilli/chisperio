# Chisperío — Contexto del Proyecto

> Documento generado para dar contexto rápido a un asistente (Claude) sobre el estado actual del sistema. Última actualización: 2026-07-13.

## 1. Qué es

**Chisperío** es un e-commerce (Laravel + Inertia.js + React) para venta de **artículos de pirotecnia y efectos especiales para eventos**: chispas frías, fuegos artificiales, máquinas de humo, lanzallamas, velas, etc. (Nada de golosinas pese al nombre "chispas").

El "checkout" **no es un checkout real**: no persiste pedidos en base de datos. Junta los datos del carrito + formulario del cliente y arma un mensaje de WhatsApp que se envía al número del negocio. El negocio gestiona el pedido manualmente por chat.

## 2. Stack técnico

**Backend**
- PHP `^8.2`, Laravel `^12.0`
- `inertiajs/inertia-laravel` `^2.0`
- `laravel/sanctum` `^4.0`, `laravel/breeze` `^2.3` (origen del scaffolding de auth)
- `tightenco/ziggy` `^2.0` (helper `route()` en JS)
- Base de datos: **SQLite** (`DB_CONNECTION=sqlite`), sesiones/cache/queue en driver `database`

**Frontend**
- React `^18.2.0`, `@inertiajs/react` `^2.0.0`
- Tailwind CSS `^3.2.1` (+ `@tailwindcss/forms`, `@tailwindcss/vite`)
- Vite `^7.0.7`
- `@headlessui/react` `^2.0.0` (Dropdown)
- `quill` `^2.0.3` — editor de texto rico para descripción de productos (admin)
- `dompurify` `^3.4.1` — sanitiza el HTML de Quill

## 3. Base de datos

No existen tablas de `orders`/`pedidos` ni carrito en backend — todo el carrito vive en `localStorage` del navegador.

| Tabla | Columnas clave |
|---|---|
| `users` | id, name, email(unique), password, email_verified_at |
| `categorias` | id, nombre, descripcion |
| `subcategorias` | id, nombre, descripcion, categoria_id (FK) |
| `productos` | id, titulo, descripcion(text), precio(decimal 10,2), is_active(bool), is_featured(bool) |
| `categoria_producto` (pivot) | categoria_id, producto_id — N:M |
| `producto_subcategoria` (pivot) | producto_id, subcategoria_id — N:M |
| `producto_media` | producto_id, tipo('imagen'\|'video'), ruta, orden, is_principal(bool) |
| `ofertas` | producto_id, precio_oferta, porcentaje_descuento, fecha_inicio, fecha_fin, is_active |

**Seeders** (`database/seeders/`): `UserSeeder` (admin), `CategoriaSeeder` (6 categorías), `SubcategoriaSeeder`, `ProductoSeeder` (20 productos demo).

**Credenciales admin seedeadas**: `admin@admin` / `1234`.

## 4. Modelos (`app/Models/`)

- **User**: fillable `name, email, password`. Sin campo de rol — cualquier usuario autenticado tiene acceso admin.
- **Categoria**: `hasMany(Subcategoria)`, `belongsToMany(Producto)`.
- **Subcategoria**: `belongsTo(Categoria)`, `belongsToMany(Producto)`.
- **Producto**: `belongsToMany(Categoria/Subcategoria)`, `hasMany(ProductoMedia)`, `imagenPrincipal()`, `hasMany(Oferta)`, `ofertaVigente()` (oferta activa dentro del rango de fechas).
- **ProductoMedia**: `belongsTo(Producto)`, helpers `esImagen()`/`esVideo()`.
- **Oferta**: `belongsTo(Producto)`, `estaVigente()`.

## 5. Rutas principales (`routes/web.php`, `routes/auth.php`)

**Públicas / tienda**
- `GET /` — landing (Welcome)
- `GET /tienda` — catálogo con filtros (`categoria`, `subcategoria`, `filter=destacados|ofertas`)
- `GET /tienda/{producto}` — detalle de producto
- `GET /carrito`, `GET /checkout`, `GET /confirmacion-pedido` — flujo de compra (closures triviales, no tocan BD)

**Auth (Breeze, sin registro)**
- Login, forgot/reset password, verify email, confirm password, logout
- **No hay rutas de registro** (`RegisteredUserController.php`, `Register.jsx` y su test fueron eliminados) — no hay alta de usuarios self-service, solo vía seeder/tinker.

**Admin** (protegidas solo por middleware `auth`, sin rol/permiso específico)
- `admin/categorias`, `admin/subcategorias`, `admin/productos` (+ `toggle-featured`), `admin/ofertas` (+ `toggle-active`) — CRUD resource completo
- `/dashboard`, `/profile`

## 6. Controladores (`app/Http/Controllers/`)

- **TiendaController**: `index` (catálogo filtrado/paginado 12 por página), `show` (detalle + relacionados)
- **ProductoController**: CRUD admin, maneja upload manual de imágenes (max 5MB) y videos (max 50MB) a `public/productos/img|videos/`, gestiona media principal y `toggleFeatured`
- **CategoriaController** / **SubcategoriaController**: CRUD simple
- **OfertaController**: CRUD de ofertas, calcula `porcentaje_descuento` server-side, valida que el precio de oferta sea menor al original
- **ProfileController**, **AuthenticatedSessionController**: gestión de perfil y sesión (Breeze)

## 7. Frontend — Páginas (`resources/js/Pages/`)

- `Welcome.jsx` — landing con hero, categorías, destacados, reviews
- `Tienda.jsx` — catálogo con filtros y grilla de productos
- `ShowProduct.jsx` — detalle de producto (galería, precio con oferta, descripción Quill, relacionados)
- `Carrito.jsx` — carrito con resumen de orden
- `Checkout.jsx` — formulario de datos del cliente (nombre, DNI, provincia, dirección, etc.), arma mensaje de WhatsApp y limpia el carrito
- `ConfirmacionPedido.jsx` — pantalla de agradecimiento, permite reenviar el mensaje de WhatsApp
- `Auth/*` — Login, ForgotPassword, ResetPassword, ConfirmPassword, VerifyEmail (sin Register)
- `Profile/Edit.jsx` — gestión de perfil
- `Dashboard.jsx` — landing admin
- `Admin/Categorias|Subcategorias|Productos|Ofertas/*` — CRUD completo con Index/Create/Edit

## 8. Frontend — Componentes y layouts clave

- **CartContext** (`resources/js/Context/CartContext.jsx`): estado global del carrito persistido en `localStorage['chisperio_cart']`. API: `addToCart`, `removeFromCart`, `updateQty`, `clearCart`, derivados `cartCount`/`subtotal`. Sin sincronización con backend.
- **CartButton.jsx** — botón flotante con mini-carrito (popover)
- **WhatsAppButton.jsx** — botón flotante de contacto directo
- **Landing/** — HeroSection, TrustBanner, CategoriesSection, FeaturedProductsSection, ReviewsSection, LandingHeader, LandingFooter
- **GuestLayout.jsx** — layout oscuro para páginas de auth
- **AuthenticatedLayout.jsx** — shell de dashboard admin con sidebar colapsable

## 9. Integración WhatsApp

- Número **hardcodeado en 3 archivos distintos** (`WhatsAppButton.jsx`, `Checkout.jsx`, `ConfirmacionPedido.jsx`): `5491133973222`. No hay una constante/config compartida — sería una buena mejora a futuro centralizarlo (env var o config JS único).
- El pedido nunca se persiste en backend: se arma el texto en el cliente, se abre `wa.me`/`whatsapp://` y se guarda una copia en `sessionStorage['chisperio_last_order']` para poder reenviarlo desde la pantalla de confirmación.

## 10. Puntos importantes / deuda técnica a tener en cuenta

- **No hay sistema de roles**: cualquier usuario logueado accede a todo `/admin/*`. Solo existe un middleware custom (`HandleInertiaRequests`), no hay chequeo de admin.
- **No hay registro de usuarios**: fue removido intencionalmente (controller, página y test eliminados). Alta de usuarios solo por seeder.
- **No hay persistencia de pedidos**: todo el flujo de compra vive en el navegador (localStorage/sessionStorage) y termina en un mensaje de WhatsApp manual.
- **Rutas de carrito/checkout/confirmación son closures triviales** en `web.php`, no controladores — no tocan la base de datos.
- `PRODUCTOS_IMG_PATH` / `PRODUCTOS_VIDEO_PATH` son configurables por env pero **no están declaradas en `.env.example`**, se usan los defaults del código (`/productos/img/`, `/productos/videos/`).
- Las imágenes/videos de productos se sirven directo desde `public/productos/` (no vía disco de Storage de Laravel).

## 11. Assets públicos

- `public/productos/img/` y `public/productos/videos/` — media de productos, nombrados `{timestamp}_{index}_{nombre-original}`.
- `public/images/` — assets estáticos de marca (logo, imagen hero).
