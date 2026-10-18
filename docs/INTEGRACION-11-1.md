# 11.1 — Catálogo hacia el Central

## Interruptores

`RUKOZ_INTEGRACION` (paquete) habilita la comunicación; cada `INTEGRACION_*` (`config/integracion.php`) habilita una parte de la web. Todo apagado por defecto y en producción hasta la 11.5. Con `INTEGRACION_CATALOGO` apagado no se registra el proveedor (el paquete tampoco programa el sync diario) y guardar en el admin no llama al Central.

| Variable | Etapa | Qué habilita |
|---|---|---|
| `INTEGRACION_CATALOGO` | 11.1 | Mandar productos, variantes y combos al Central |
| `INTEGRACION_STOCK` | 11.2 | Espejar el stock del Central |
| `INTEGRACION_CHECKOUT` | 11.3 | Reservar en el Central al crear un pedido |
| `INTEGRACION_CONFIRMACION` | 11.4 | Confirmar la venta y recibir estados |

## Formato que genera `App\Rukoz\CatalogoDeChisperio`

- **Precio**: el de lista (`productos.precio`; una variante, ese precio + `precio_adicional`). Sin escalas, ofertas ni descuento propio del combo. El Central solo lo informa.
- **Stock**: no viaja. Los `NULL` (ilimitado) se sincronizan igual.
- **Producto con variantes**: se manda con todas sus variantes (activas o no). En el Central se vincula cada variante.
- **Inactivos**: van con `activo: false` (una variante activa de un producto inactivo va inactiva).
- **Variante «a elección del cliente»**: variante normal; en el Central va al artículo genérico.
- **Combo fijo** (ninguna línea requiere elegir variante): `tipo: fijo`; la línea con variante fija manda la variante, si no el producto. Si un mismo ítem está en dos líneas se suman las cantidades.
- **Combo con elección o mixto**: `tipo: seleccion`, un grupo por línea, con la cantidad de la línea. Línea fija = grupo de una opción; línea de elección = grupo con todas las variantes activas. Nombre del grupo: `«{producto} (#{combo_productos.id})»` (único y estable; el id también queda en el snapshot del pedido como `combo_producto_id`).

Producto con variantes:

```json
{"id":"16","nombre":"Chispa Fria 2x20 PULY®","sku":null,"precio":8000,"activo":true,
 "variantes":[{"id":"33","nombre":"Dorada","sku":null,"precio":8000,"activo":true},
              {"id":"34","nombre":"Negra","sku":null,"precio":8000,"activo":true}]}
```

Combo mixto (real de la copia local):

```json
{"id":"1","nombre":"asd","precio":8000,"activo":true,"tipo":"seleccion","grupos":[
  {"nombre":"Pistolas de Chispas Frías (#1)","cantidad":1,"opciones":[
     {"tipo":"variante","id":"23"},{"tipo":"variante","id":"24"},{"tipo":"variante","id":"25"},
     {"tipo":"variante","id":"26"},{"tipo":"variante","id":"27"},{"tipo":"variante","id":"28"}]},
  {"nombre":"Chispas Frías 2x20 (#2)","cantidad":2,"opciones":[{"tipo":"producto","id":"5"}]}]}
```

Combo fijo:

```json
{"id":"7","nombre":"Pack chispas","precio":30000,"activo":true,"tipo":"fijo","items":[
  {"tipo":"producto","id":"15","cantidad":2},{"tipo":"variante","id":"40","cantidad":1}]}
```

## Sincronización

- Completa: `php artisan rukoz:sync-catalogo` (el paquete la programa a diario si el proveedor está registrado).
- Parcial: al guardar un producto/variante o un combo en el admin, fuera de la transacción (`App\Rukoz\SincronizacionDeCatalogo`). Guardar un producto vuelve a mandar también los combos que lo contienen (cambian sus opciones). Nunca rompe el guardado: con el Central caído el paquete deja los ids diferidos; cualquier otra falla se reporta (`report()`) y se sigue.
- Borrar un producto no se informa en el parcial (no puede desactivar): lo desactiva el sync completo.

## Prueba local contra el Central

1. Central (`php artisan serve --port=8000`, `queue:work`, `schedule:work`): *Configuración → Integraciones → Nueva*: empresa Chisperío, punto Buenos Aires, activa, sin webhook. Copiar la clave y el secreto (se ven una sola vez).
2. `.env` de Chisperío: `SESSION_COOKIE=chisperio_session`, `RUKOZ_INTEGRACION=true`, `RUKOZ_CENTRAL_URL=http://localhost:8000`, `RUKOZ_API_KEY`, `RUKOZ_SECRET`, `INTEGRACION_CATALOGO=true`; `php artisan config:clear`.
3. `php artisan rukoz:ping` → «Conexión con el Central OK».
4. `php artisan rukoz:sync-catalogo` → resumen.
5. En el Central: *Integraciones → Web Chisperío (local) → Productos web*: vincular cada producto sin variantes y cada variante con su artículo (las «a elección» al genérico); revisar que el combo quede completo.
6. Repetir el sync: sin vincular = 0 y combos incompletos = 0.
7. `php artisan serve --host=127.0.0.1 --port=8002` y guardar un producto desde el admin: el log de requests de la integración muestra un `POST /catalogo/sync`.
