# Catálogo local desde la web publicada

El script `scripts/sync-public-catalog.mjs` copia el catálogo público de
https://chisperio.com.ar a la base SQLite local. Requiere Node.js 24 y las
migraciones de Laravel aplicadas. No necesita credenciales del hosting.

Incluye productos publicados, categorías, variantes activas, precios por cantidad,
personalizaciones, ofertas vigentes, fotos, videos, reseñas públicas, cuotas y el
mínimo de envío gratis. No obtiene productos ocultos, ofertas futuras, usuarios,
clientes ni pedidos de producción. Es una foto del catálogo al descargarlo;
los cambios posteriores en producción requieren repetir el proceso.

## Descargar y preparar una copia

```powershell
node scripts/sync-public-catalog.mjs snapshot
node scripts/sync-public-catalog.mjs stage "storage/app/private/catalog-imports/<fecha>/catalog.json"
```

`snapshot` imprime la ruta de `catalog.json`. También guarda los archivos y
comprobaciones de precios en ese directorio privado. `stage` clona la base local y
reemplaza el catálogo solamente en esa copia; imprime su ruta para revisarla.

## Aplicar a la base local

Una vez revisada la copia:

```powershell
node scripts/sync-public-catalog.mjs apply "storage/app/private/catalog-imports/<fecha>/catalog.json"
```

Solo funciona con `APP_ENV=local`, `DB_CONNECTION=sqlite` y
`database/database.sqlite`. Si hay pedidos, items de pedido o movimientos de stock
locales, se cancela para proteger ese historial. Los usuarios locales se conservan.

Antes de aplicar, crea un respaldo completo en `storage/app/private/backups`.
Reemplaza el catálogo de ejemplo, las reseñas y las condiciones comerciales
locales en una transacción; verifica integridad y referencias. Copia los medios a
`public/productos` o `public/combos`, respetando las rutas originales. Si un archivo
existente difiere, conserva una copia dentro de `previous-media` del snapshot.
Los snapshots y respaldos permanecen en almacenamiento privado e ignorado por Git.

Para volver atrás, detené el servidor local y restaurá el archivo de respaldo
sobre `database/database.sqlite`. No uses `migrate:fresh` ni `db:seed` para
actualizar este catálogo: borrarían datos o volverían a cargar ejemplos.
