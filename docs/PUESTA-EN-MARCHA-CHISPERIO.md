# Puesta en marcha de la integración — Chisperío (11.5)

Guía para el día en que la web de producción (`https://chisperio.com.ar`, hosting compartido de Hostinger) empiece a hablar con el Sistema Central (`https://sistema.rukoz.com.ar`, dominio provisorio y configurable con `RUKOZ_CENTRAL_URL`).

- **Versión desplegada hoy:** tag `produccion-pre-integracion`. **Versión a desplegar:** `main` (tag `integracion-local-ok` + los cambios de la 11.5a).
- **Paquete:** `rukoz/core-client` `^0.1.2`, desde el repo privado `github.com/mArchilli/rukoz-core-client`.
- Esta guía **no se ejecutó nunca contra producción**. Todo lo que dice del hosting sale del relevamiento y de las notas de deploy: la Parte 1 sirve justamente para confirmarlo.

Cómo leerla:

1. **Parte 1 — Chequeo del hosting.** Se hace días antes, sin tocar nada (solo comandos de lectura).
2. **Parte 2 — El día del deploy.** Once pasos, en orden. Cada uno termina en algo que se puede verificar.
3. **Anexos.** Token de GitHub, desarrollo local del paquete, cron y cola en hosting compartido.

---

## Parte 1 — Chequeo del hosting (solo lectura)

Todo por SSH, en la carpeta del proyecto. En las notas de deploy de Chisperío el proyecto vive en una carpeta hermana de `public_html` (le llamamos `laravel`); acá la llamamos `<PROYECTO>`. Anotá cada resultado: las dudas abiertas están al final de esta parte.

> Este chequeo no cambia nada. Los únicos comandos que escriben son los marcados como «prueba» y se borran después.

### 1.1 PHP

Laravel 12 y el paquete piden **PHP ≥ 8.2**. Hay que mirar **dos** PHP distintos: el de la línea de comandos (artisan, cron, composer) y el de la web.

| Qué | Cómo verificarlo | Esperado |
|---|---|---|
| PHP de la CLI | `php -v` | 8.2 o superior |
| Otros PHP instalados | `ls /usr/bin/php* /opt/alt/php*/usr/bin/php 2>/dev/null` | si el `php` por defecto es viejo, anotá la ruta del 8.2+ (se usa en el cron y en todos los comandos) |
| PHP de la web | hPanel → *Avanzado → Configuración de PHP* (versión); o `curl -sI https://chisperio.com.ar \| grep -i x-powered-by` (puede no mostrarse) | 8.2 o superior, **igual** al de la CLI |
| Extensiones | `php -m` | ver abajo |
| Límites | `php -i \| grep -E "memory_limit\|max_execution_time\|upload_max_filesize"` | el repo trae `public/.user.ini` (64M / 300 s / 256M); confirmar que el hosting lo respeta |

Extensiones que usa la app: `ctype`, `curl`, `dom`, `fileinfo`, `filter`, `hash`, `iconv`, `json`, `libxml`, `mbstring`, `openssl`, `pcre`, `pdo`, **`pdo_mysql`**, `session`, `tokenizer`, `xml`, `xmlwriter`. (`intl`, `bcmath` y `gmp` son opcionales.) Atajo:

```bash
for e in ctype curl dom fileinfo filter hash iconv json libxml mbstring openssl pcre pdo pdo_mysql session tokenizer xml xmlwriter; do php -m | grep -qix "$e" && echo "ok   $e" || echo "FALTA $e"; done
```

Con el proyecto instalado, además: `composer2 check-platform-reqs --no-dev` (lista lo que falta con nombre y versión).

Si la web y la CLI usan PHP distinto, **la web es la que importa para el sitio y la CLI para cron, artisan y composer**: las dos tienen que cumplir.

### 1.2 Composer

```bash
composer2 --version        # en las notas de deploy el comando es composer2
which composer composer2
```

Si no hay ninguno: instalarlo en la cuenta (sin root) con el instalador oficial de getcomposer.org, dejando `composer.phar` en `~/` y llamándolo con `php composer.phar …`. Comprobar además que tenga **git** (`git --version`) y salida a GitHub (1.4), porque el paquete se baja de ahí.

### 1.3 Cron: ¿cada minuto?

El scheduler de Laravel necesita **un solo cron**, que lo dispare:

```
* * * * * /ruta/al/php /ruta/al/<PROYECTO>/artisan schedule:run >> /dev/null 2>&1
```

**Qué verificar (hPanel → Avanzado → Cron Jobs):**

1. ¿La lista de frecuencias incluye «cada minuto» (`* * * * *`)? Si el campo es libre, ¿acepta `* * * * *` y `*/5 * * * *`? **No lo asumimos: lo confirma quien tenga el panel.** Algunos planes compartidos restringen el intervalo mínimo.
2. Probarlo sin riesgo con un cron de prueba que escriba la hora: `* * * * * date >> $HOME/cron-prueba.log` → esperar 3 minutos, `cat $HOME/cron-prueba.log` (tienen que estar las líneas de cada minuto). **Borrar el cron y el archivo después.**
3. Ruta del PHP en el cron: la del 8.2+ que anotaste en 1.1 (el `php` del cron puede no ser el de la shell: `which php` desde el cron mismo, escribiéndolo al log de prueba).

**Qué depende del cron** (con la integración encendida):

| Tarea | Frecuencia diseñada | De dónde sale | Para qué sirve |
|---|---|---|---|
| `rukoz:procesar-inbox` | cada 1 min | paquete | reintenta los eventos del Central que no se pudieron procesar en el webhook |
| `rukoz:poll` | cada 5 min (1 min si `RUKOZ_WEBHOOK_RECIBE=false`) | paquete | **respaldo del webhook**: lee el feed de eventos |
| `rukoz:compensaciones` | cada 5 min | paquete | reintenta cancelar una reserva o deshacer una edición que no se pudo en el momento |
| `rukoz:revisar-pedidos` | cada 10 min | paquete | pedidos que quedaron «requiere revisión» |
| `rukoz:revisar-pedidos --reconciliar` | cada hora (`0 * * * *`) | paquete | compara pedidos activos con el Central |
| `rukoz:sync-stock` | cada hora (`0 * * * *`) | paquete | reconcilia el caché de stock |
| `rukoz:sync-catalogo` | diaria 03:30 | paquete (si `INTEGRACION_CATALOGO`) | sync completo del catálogo |
| `rukoz:limpiar` | diaria 04:00 | paquete | purga de tablas `rukoz_*` |
| `chisperio:cancelar-reservas-viejas` | cada hora (`0 * * * *`) | **web** (`routes/console.php`) | cancela reservas sin confirmar hace más de `PEDIDOS_CANCELAR_DIAS` (3); **sin esto el stock queda apartado para siempre** |
| `chisperio:stock-cargar --local` | diaria 03:45 | **web** | red de seguridad del espejo de stock |

`php artisan schedule:list` muestra lo que quedó programado (con la integración apagada no hay ninguna tarea del paquete).

**Si el cron mínimo es de 5 minutos** (`*/5 * * * *`): todo sigue funcionando; cambia la demora del *respaldo*.

- `procesar-inbox` pasa de 1 a 5 min: un evento que falló en el webhook se reintenta en ≤ 5 min.
- `poll` (5 min) no cambia.
- `compensaciones` (1, 5, 15, 60 min de espera): el primer reintento de 1 min pasa a 5 min. Sin consecuencias: la reserva sigue apartada hasta que se cancele, nada se pierde.
- `revisar-pedidos` (10 min): sin cambios, `*/5` pasa por los minutos 0, 10, 20…
- Las diarias (03:30, 03:45, 04:00) y las horarias (`:00`) **se ejecutan igual**: `*/5` pasa por esos minutos. Una tarea con hora fija solo corre si el cron cae **exactamente** en ese minuto.
- **Con un cron cada 15 o 30 min** todavía caen 03:30/04:00, pero no 03:45 (se pierde `stock-cargar --local`, que es solo una red de seguridad). **Con un cron cada hora** se pierden 03:30 y 03:45; el sync diario del catálogo y el de stock no corren. No es un escenario recomendable: si pasa, hay que reprogramar esas horas.
- Un cron de **más de 5 minutos** deja al **webhook como única vía rápida**. Hay que asegurarse (1.5) de que el webhook entra.

**Cómo se compensa un cron lento (qué es principal y qué es respaldo):**

| Vía | Rol |
|---|---|
| **Webhook** (`POST /rukoz/webhook`) | **Principal.** El Central avisa en el momento; la web guarda el evento en `rukoz_inbox` y lo procesa en el mismo request. No depende del cron. |
| `rukoz:procesar-inbox` | Respaldo del webhook: reintenta lo que falló al procesar. |
| `rukoz:poll` (feed) | Respaldo si el webhook no llegó (hosting caído, firewall). Recupera los eventos perdidos por secuencia. |
| `rukoz:sync-stock` (hora) y `chisperio:stock-cargar --local` (noche) | Reconciliación de stock. |
| `rukoz:revisar-pedidos --reconciliar` (hora) | Reconciliación de estados de pedidos. |

Si el hosting **no permite ningún cron razonable**, no se enciende la integración de checkout/confirmación: el stock apartado no se libera y los respaldos no corren. (Alternativas a evaluar con Matias en ese caso: un cron externo que dispare `schedule:run` por SSH/HTTP no existe hoy en la web; el camino más simple es un hosting con cron por minuto o correr el scheduler en el VPS del Central.)

### 1.4 Salida a internet hacia el Central y a GitHub

Algunos hostings compartidos filtran conexiones salientes o fallan con certificados.

```bash
# El Central (cuando exista; mientras tanto probar con cualquier HTTPS para ver si la salida funciona)
curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" https://sistema.rukoz.com.ar/
curl -sS -o /dev/null -w "%{http_code}\n" https://example.com/      # control: ¿sale a internet?

# GitHub (para composer y el paquete privado)
curl -sS -o /dev/null -w "%{http_code}\n" https://github.com/
curl -sS -o /dev/null -w "%{http_code}\n" https://api.github.com/
git --version
```

Esperado: `200`/`301`/`302`/`404` (cualquier código HTTP significa que **hay salida**). Un error de resolución, de conexión o `SSL certificate problem` es un problema a resolver con el soporte del hosting **antes** del deploy. Probar también desde PHP (puede tener reglas distintas que `curl` de la shell):

```bash
php -r 'var_dump(file_get_contents("https://api.github.com/", false, stream_context_create(["http"=>["header"=>"User-Agent: x"]])) !== false);'
```

Una vez que el Central exista: `php artisan rukoz:ping` (paso 5) es la prueba real.

### 1.5 El webhook entrante

El Central le manda a la web `POST https://<dominio canónico>/rukoz/webhook`. **No admite redirecciones** (si hay un 301/302, el evento no se entrega).

**Dominio canónico.** Averiguar cuál es el que queda **después** de las redirecciones actuales de producción:

```bash
for u in http://chisperio.com.ar/ http://www.chisperio.com.ar/ https://chisperio.com.ar/ https://www.chisperio.com.ar/; do
  curl -sS -o /dev/null -L -w "$u  ->  %{url_effective}  (%{http_code}, %{num_redirects} redirecciones)\n" "$u"
done
```

La URL que se carga en la integración del Central es la que **termina sin redirecciones** y con `https` (hoy se espera `https://chisperio.com.ar/rukoz/webhook`; el `.env` local dice `APP_URL=http://www.chisperio.com.ar`, así que **no se da por sentado**). Probar que la ruta exacta no redirige:

```bash
curl -sS -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -X POST -H "Content-Type: application/json" -d '{}' https://chisperio.com.ar/rukoz/webhook
```

Qué significa lo que devuelve (la ruta existe **solo con `RUKOZ_INTEGRACION=true`**):

| Código | Con la integración apagada | Con la integración encendida |
|---|---|---|
| `404` con la página de error de la web (Inertia) | **normal** (la ruta no está registrada) | algo anda mal: el paquete no cargó |
| `401` con JSON `{"ok":false,"codigo":"…"}` | — | **correcto**: la petición llegó a Laravel y rechazó la firma |
| `301`/`302` | **malo**: redirección (www ↔ apex, http → https) | **malo**: el Central no sigue redirecciones |
| `403`/`406`/`5xx` con HTML del servidor, sin JSON | **malo**: lo bloquea el servidor (WAF/ModSecurity, `.htaccess`, firewall del hosting) | **malo** |
| `405` | **malo**: algún `.htaccess` o regla filtra los `POST` | **malo** |

Dónde mirar si falla: `public_html/.htaccess` de producción (¡es el real! `public/.htaccess` del repo es el estándar de Laravel y **no fuerza HTTPS ni `www`/apex**, pero el que está en `public_html` puede tener reglas viejas del WordPress anterior) y hPanel → *Seguridad* (WAF / ModSecurity / bloqueo de IPs). Del lado de la web alcanza con el 401: la prueba punta a punta (con firma) es el primer evento real del paso 9, y `php artisan rukoz:estado` lo muestra en «Último webhook recibido».

**Qué NO bloquear:** el `POST` sin sesión ni CSRF a `/rukoz/webhook` (lo registra el paquete fuera del grupo `web`; `public/sw.js` ignora todo lo que no es GET).

### 1.6 Cómo se maneja `vendor/` en el hosting (hoy y mañana)

**Hoy** (según las notas de deploy de Chisperío, *a confirmar*): el repo se clona en una carpeta hermana de `public_html`; se corre `composer2 install` **en el servidor**; el contenido de `public/` vive en `public_html` y se edita a mano `public_html/index.php` para apuntar a `../<PROYECTO>/vendor/autoload.php` y `../<PROYECTO>/bootstrap/app.php`; el `build` de Vite se genera **en local** y se copia a mano a `<PROYECTO>/public/build` **y** a `public_html/build`. `bootstrap/app.php` usa `../public_html` como `public_path` si existe.

Verificar:

```bash
cd <PROYECTO>
git log --oneline -1 && git status --short | head      # ¿es un clon con git? ¿qué commit corre? ¿hay cambios locales?
git describe --tags --always                            # debería decir produccion-pre-integracion
ls -la vendor | head -3; ls vendor/composer/installed.json
ls ../public_html | head -20; grep -n "vendor\|bootstrap" ../public_html/index.php
ls ../public_html/build ../<PROYECTO>/public/build 2>&1 | head
```

**Mañana:** `composer2 install --no-dev --optimize-autoloader` **por SSH** en el servidor. Como el paquete es un repo **privado**, hace falta un **token de solo lectura en la cuenta del hosting** (Anexo A), guardado en `~/.composer/auth.json` (fuera del repo) con `composer2 config --global github-oauth.github.com <token>`. Nada de `auth.json` dentro de `<PROYECTO>`. `composer.lock` fija la versión y los hashes: el servidor instala **exactamente** lo que se probó.

### 1.7 `APP_TIMEZONE` y fechas

```bash
grep -E "^(APP_TIMEZONE|APP_DISPLAY_TIMEZONE|APP_ENV|APP_DEBUG|APP_URL)=" <PROYECTO>/.env
php artisan tinker --execute="echo config('app.timezone').' / '.config('app.display_timezone').' / '.now()->toDateTimeString().PHP_EOL;"
date                          # hora del servidor
```

Cómo funciona la web: lo **guardado** en la base usa `APP_TIMEZONE` (por defecto `UTC`) y lo que **se muestra** en el panel y las métricas usa `APP_DISPLAY_TIMEZONE` (por defecto `America/Argentina/Buenos_Aires`, `app/Support/ZonaHoraria.php`). Qué hay que anotar: si `APP_TIMEZONE` no está en el `.env` real, es `UTC`, y está bien. **No cambiarlo ahora**: si ya hay pedidos guardados en UTC y se pasa a hora argentina, las fechas viejas y las nuevas quedarían en zonas distintas. El Central recibe `creado_at` y `confirmado_at` en ISO 8601 **con offset**, así que no hay ambigüedad en la integración.

Si el relevamiento original sospechaba que producción mostraba las métricas corridas 3 h, esa observación **ya la resolvió `APP_DISPLAY_TIMEZONE`**; verificar mirando «Pedidos por hora» en el panel contra un pedido conocido.

### 1.8 Permisos, `.env` y cola

```bash
cd <PROYECTO>
ls -ld storage storage/app storage/framework storage/logs bootstrap/cache
test -w storage/logs && test -w storage/framework/cache && test -w bootstrap/cache && echo "escribible" || echo "SIN PERMISO"
touch storage/logs/prueba.log && rm storage/logs/prueba.log
ls -la .env && (stat -c '%a' .env)          # 600 o 640; nunca 666/777
grep -E "^(QUEUE_CONNECTION|CACHE_STORE|SESSION_DRIVER|LOG_CHANNEL|LOG_LEVEL)=" .env
```

`storage/` y `bootstrap/cache` tienen que ser escribibles por el usuario que corre **tanto la web como el cron** (en un hosting compartido es la misma cuenta, así que normalmente alcanza con `chmod -R u+rwX storage bootstrap/cache`).

**Cola — qué hace falta realmente.**

- La web tiene `QUEUE_CONNECTION=database` (según `.env.example`) y las tablas `jobs`/`failed_jobs`, pero **ningún código de la web ni del paquete despacha jobs** (no hay `ShouldQueue` ni `dispatch(...)` en `app/` ni en el paquete). El paquete usa **tablas propias (`rukoz_inbox`, `rukoz_compensaciones`, `rukoz_requests`) procesadas por el scheduler**, no por la cola de Laravel. → **No hace falta ningún worker.** En un hosting compartido no hay Supervisor, y no lo necesitamos.
- Si en algún momento se agregara un job, la forma de correrlo ahí sería desde el scheduler, agregando en `routes/console.php`:
  ```php
  Schedule::command('queue:work --stop-when-empty --max-time=50')->everyMinute()->withoutOverlapping();
  ```
  (`--stop-when-empty` termina cuando no hay nada; `--max-time` lo corta antes del próximo minuto). **Hoy no se agrega**: no hay nada que procesar y cada minuto abriría un proceso de PHP sin necesidad.
- Verificar que no hay nada encolado: `php artisan tinker --execute="echo DB::table('jobs')->count().' / '.DB::table('failed_jobs')->count().PHP_EOL;"` → `0 / 0`.

### 1.9 Resumen de la Parte 1: respuestas que tiene que dar alguien con acceso

| # | Pregunta | Dónde se contesta |
|---|---|---|
| 1 | ¿Qué PHP tiene la **CLI** y cuál la **web**? ¿Están las extensiones? | 1.1 |
| 2 | ¿Hay Composer (`composer2`) y git? | 1.2 |
| 3 | ¿El cron admite cada minuto? Si no, ¿cuál es el mínimo? | 1.3 |
| 4 | ¿El servidor sale a `sistema.rukoz.com.ar` y a GitHub? | 1.4 |
| 5 | ¿Cuál es el **dominio canónico** (apex o `www`) sin redirecciones? ¿El `POST` a `/rukoz/webhook` llega a Laravel? | 1.5 |
| 6 | ¿Cómo está desplegado hoy (clon con git, `vendor` instalado en el servidor)? | 1.6 |
| 7 | ¿`APP_TIMEZONE` real? | 1.7 |
| 8 | ¿Permisos de `storage/` y `bootstrap/cache`? | 1.8 |

---

## Parte 2 — El día del deploy

Orden obligatorio. Si un paso falla, **no se sigue**: se resuelve o se vuelve atrás (paso 10).

Convenciones: `<PROYECTO>` = carpeta del proyecto en el servidor; todos los `php artisan` se corren ahí, con el PHP 8.2+ de la CLI. Los valores entre `<…>` los pone quien despliega.

### Paso 1 — Antes de tocar la web

Condiciones que tienen que estar cumplidas **en el Central de producción** (`https://sistema.rukoz.com.ar`):

- [ ] El Central está en el VPS, con los **datos reales** (artículos, precios, cuentas, medios de pago, formas de envío, transportistas).
- [ ] La integración **«Web Chisperío»** está creada: empresa Chisperío, puntos **Buenos Aires (BA)** y **Córdoba (CBA)**, **`dias_aviso_reserva` = 4** (la web cancela a los `PEDIDOS_CANCELAR_DIAS` = 3; el aviso del Central va un día después, como red), activa, y con el **webhook** cargado: `https://<dominio canónico de 1.5>/rukoz/webhook` (https, sin redirecciones). La clave (`API key`) y el secreto se muestran **una sola vez**: copiarlos a un gestor de contraseñas.
- [ ] Los **vendedores** reales están asignados a la integración (Integraciones → Vendedores).
- [ ] El **stock real** está cargado (si no, la web arranca con todo en 0: paso 7).
- [ ] La Parte 1 está completa y sin pendientes (PHP, cron, salida, webhook, dominio).
- [ ] Hay **fecha y hora acordadas**: de baja actividad, con alguien que pueda confirmar pedidos desde el panel de admin durante la prueba.

### Paso 2 — Backup completo (sin backup no se sigue)

Hacer **antes de cualquier cambio** y guardarlo **fuera del servidor**:

```bash
cd <PROYECTO>
mkdir -p ~/backups && STAMP=$(date +%Y%m%d-%H%M)

# Base de datos (credenciales del .env)
DB=$(grep ^DB_DATABASE= .env | cut -d= -f2-); DU=$(grep ^DB_USERNAME= .env | cut -d= -f2-); DH=$(grep ^DB_HOST= .env | cut -d= -f2-)
mysqldump -h "$DH" -u "$DU" -p --single-transaction --routines --triggers "$DB" | gzip > ~/backups/chisperio-db-$STAMP.sql.gz

# Archivos: proyecto (con .env) + public_html (incluye imágenes/videos subidos)
tar --exclude='<PROYECTO>/storage/logs/*' -czf ~/backups/chisperio-archivos-$STAMP.tar.gz ../<PROYECTO> ../public_html
ls -lh ~/backups
```

- Verificar que los archivos **no están vacíos** (`gzip -t` en el `.sql.gz`, `tar -tzf … | head`) y **bajarlos** a una máquina local (hPanel o `scp`). Los productos y videos viven en `public_html/productos` (no están en git).
- hPanel → *Copias de seguridad* también tiene snapshots: sirven como segunda red, **no** reemplazan estos.
- Anotar el commit actual del servidor (`git describe --tags --always`) — es el punto de retorno del paso 10.

### Paso 3 — Pedidos pendientes de la web vieja

Los pedidos que ya existen **no tienen `rukoz_ref`**: el Central no los conoce y nunca los va a conocer. Siguen con el **flujo viejo**: se cierran en el admin con «Marcar como despachado» / «Cancelar» y nada de eso toca el Central. Contarlos:

```bash
php artisan tinker --execute="foreach (App\Models\Pedido::query()->selectRaw('estado, count(*) c')->groupBy('estado')->get() as \$r) echo \$r->estado.': '.\$r->c.PHP_EOL;"
php artisan tinker --execute="echo App\Models\Pedido::where('estado','pendiente')->whereNull('rukoz_ref')->count().PHP_EOL;"
```

(La segunda línea falla **antes** de migrar, porque `rukoz_ref` todavía no existe: contar con `where('estado','pendiente')` solo. Después del paso 4 se puede usar la completa.)

Recomendación: **cerrar todos los pendientes antes del deploy** (despachar o cancelar los que corresponda), por dos razones:

1. Un pedido viejo cancelado **después** de encender la integración repone el stock en la **columna local** (`StockService::reponer`), que a partir del paso 7 es un espejo del Central: ese stock repuesto no existe en el Central y se pisa en el próximo evento. Con los pendientes cerrados, esto no puede pasar.
2. Un pedido viejo despachado después del cambio **no descuenta** nada del Central: la mercadería que ya está comprometida tiene que estar ya descontada de lo que se cargue en el Central en el paso 1.

Si quedan pendientes que **no se pueden cerrar**: anotar su detalle (productos y cantidades) y, en el Central, restar esa mercadería del stock disponible web (o cargar esas ventas a mano) antes del paso 7. Decisión de Matias: ver Preguntas abiertas.

### Paso 4 — Deploy de `main` con todo apagado

Objetivo: que la tienda quede **igual que hoy** pero con el código nuevo y las tablas nuevas. Nada de integración.

1. **Modo mantenimiento (opcional pero recomendable):** `php artisan down --retry=60` (en el último paso: `php artisan up`).
2. **Código:**
   ```bash
   cd <PROYECTO>
   git fetch --tags origin
   git checkout main && git pull --ff-only origin main      # o el tag de release que se acuerde
   git describe --tags --always
   ```
3. **`.env`** (editar a mano, `nano .env`) — **todo apagado**:
   ```
   RUKOZ_INTEGRACION=false
   INTEGRACION_CATALOGO=false
   INTEGRACION_STOCK=false
   INTEGRACION_CHECKOUT=false
   INTEGRACION_CONFIRMACION=false
   ```
   Agregar también (no hace nada apagado): `PEDIDOS_CANCELAR_DIAS=3`. **No cambiar `APP_TIMEZONE`** (1.7).
4. **Dependencias** (necesita el token del Anexo A cargado en la cuenta del hosting):
   ```bash
   composer2 install --no-dev --optimize-autoloader --no-interaction
   php artisan about | head -20          # verificar PHP, entorno production y debug off
   ```
   Verificar que el paquete vino de GitHub: `composer2 show rukoz/core-client | grep -E "versions|source|dist"` → `0.1.2`.
5. **Migraciones** (backup del paso 2 hecho):
   ```bash
   php artisan migrate --status | tail -15       # revisar qué va a correr
   php artisan migrate --force
   ```
   Corren **las 4 migraciones de la web** (`2026_10_18_120000_add_marcas_de_uso_de_codigo_descuento_to_pedidos_table`, `2026_10_19_120000_add_rukoz_reserva_to_pedidos_table`, `2026_10_20_120000_add_confirmacion_de_venta_to_pedidos_table`, `2026_10_21_120000_add_punto_y_retencion_to_pedidos_table`; todas aditivas, columnas nuevas y *nullable*) **y** las del paquete: las tablas `rukoz_*` (`rukoz_requests`, `rukoz_inbox`, `rukoz_stock`, `rukoz_pedidos`, `rukoz_compensaciones`, `rukoz_estado`). Con la integración apagada el paquete **igual** carga sus migraciones, y está bien.
6. **Front y cachés:**
   - `npm run build` **en local**, y copiar `public/build` a `<PROYECTO>/public/build` **y** a `public_html/build` (los dos, como en las notas de deploy). El `index.php` de `public_html` no cambia.
   - ```bash
     php artisan config:cache && php artisan route:cache && php artisan view:cache
     php artisan storage:link 2>/dev/null; true     # solo si hoy existe /public/storage
     ```
   - Si hay `public_html`, comprobar que no se rompió el `index.php` (apunta a `vendor` y `bootstrap` del proyecto).
7. `php artisan up` si se había puesto en mantenimiento.

**Verificar que la tienda funciona igual que antes (obligatorio):**

- [ ] `https://chisperio.com.ar/` carga; `/tienda` lista los productos con sus fotos, precios y stock.
- [ ] Un producto con variantes, uno sin variantes y el combo se abren; el carrito suma bien.
- [ ] Hacer **un pedido de prueba completo** hasta la confirmación (con el WhatsApp que se abre) y borrarlo/cancelarlo después. Debe crearse en el flujo **viejo**: descuenta stock local (si el producto tiene stock finito) y **no** llama al Central.
- [ ] El admin carga: pedidos, productos, usuarios; «Marcar como despachado» y «Cancelar» funcionan.
- [ ] `php artisan schedule:list` — sin tareas del paquete, solo `chisperio:*` condicionadas a la integración (no corren).
- [ ] `tail -n 50 storage/logs/laravel.log` — sin errores nuevos.
- [ ] El cron de `schedule:run` está instalado y corriendo (log del cron o `schedule:run` a mano).
- [ ] `php artisan chisperio:integracion-estado` — todo «apagado», sin errores.

Si algo no es igual: **paso 10** (volver atrás), no avanzar.

### Paso 5 — Variables del Central y `rukoz:ping`

Con la tienda ya verificada, **recién ahora** se configura la conexión (todavía sin encender nada de la web). En `.env`:

```
RUKOZ_CENTRAL_URL=https://sistema.rukoz.com.ar
RUKOZ_API_KEY=<clave de la integración «Web Chisperío»>
RUKOZ_SECRET=<secreto de la integración>
RUKOZ_WEBHOOK_RECIBE=true                 # false solo si el chequeo 1.5 dio que no se pueden recibir webhooks (el feed pasa a leerse cada minuto)

INTEGRACION_PUNTO_BUENOS_AIRES=BA
INTEGRACION_PUNTO_CORDOBA=CBA

# Forma de envío y transportista por defecto del modal «Confirmar venta» (ids del Central; ver `php artisan rukoz:referencias`).
INTEGRACION_FORMA_ENVIO_ID=<id>
INTEGRACION_TRANSPORTISTA_ID=<id>
```

Orden: primero `RUKOZ_CENTRAL_URL`, la clave y el secreto; correr `php artisan config:clear` (o `config:cache` de nuevo) y:

```bash
php artisan rukoz:ping            # → «Conexión con el Central OK»
php artisan rukoz:referencias     # lista cuentas, medios de pago, formas de envío, transportistas, vendedores y PUNTOS
```

- `rukoz:ping` **tiene que dar OK** antes de seguir. Si falla: 1.4 (salida), URL, clave/secreto (copiados sin espacios), reloj del servidor (la firma tiene tolerancia de 300 s: `date` contra la hora real).
- En `rukoz:referencias`: confirmar que `BA` y `CBA` están entre los puntos y anotar los ids de forma de envío y transportista para el `.env`.

Para que quede la **ruta del webhook** probada (1.5), encender `RUKOZ_INTEGRACION=true` recién en el paso 6 (junto con el catálogo). Apagada, `/rukoz/webhook` no existe.

### Paso 6 — Catálogo

```
RUKOZ_INTEGRACION=true
INTEGRACION_CATALOGO=true
```

```bash
php artisan config:clear   # (o config:cache)
php artisan rukoz:sync-catalogo       # resumen: enviados, sin vincular
```

Con `RUKOZ_INTEGRACION=true` el paquete empieza a programar sus tareas (cron del paso 4); el catálogo diario corre 03:30.

**En el Central** (*Integraciones → Web Chisperío → Productos web*): **rehacer los vínculos** de cada producto sin variantes y de cada variante con su artículo, y las variantes «a elección del cliente» con el artículo genérico. La tabla aprobada está en [`VINCULOS-APROBADOS-CHISPERIO.md`](VINCULOS-APROBADOS-CHISPERIO.md); **se aplica tal cual**, no se reinterpreta.

> ⚠️ Los ids de productos y variantes de **producción** no tienen por qué coincidir con los de la copia local con la que se aprobó la tabla: identificar por **nombre**, no por id. Y, como indica ese documento, **antes de aplicar se le muestra la tabla final a Matias**.
>
> Referencia del resultado esperado (central de prueba): 43 vinculados, 6 `no_aplica` (los productos padre con variantes), 0 sin vincular, combo `asd` completo. Si en producción los números difieren, revisar el catálogo antes de seguir.

Después:

```bash
php artisan rukoz:sync-catalogo       # repetir
```

Criterio para seguir: **«sin vincular = 0»** y **combos incompletos = 0**. Los combos mixtos (selección) tienen que mostrar todos sus grupos. Si queda algo, se vincula y se repite.

Verificar el webhook ahora que la ruta existe (1.5): `curl -sS -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{}' https://<dominio canónico>/rukoz/webhook` → **`401`**.

### Paso 7 — Stock + checkout + confirmación, juntos

`INTEGRACION_STOCK`, `INTEGRACION_CHECKOUT` e `INTEGRACION_CONFIRMACION` se encienden **juntos y en este orden**. No se deja la web a medias: con el stock espejado pero el checkout viejo, la tienda mostraría el stock del Central y seguiría descontando el local (y a la inversa).

1. **Antes de encender nada**, cargar el espejo: se hace con el interruptor `INTEGRACION_STOCK` encendido, así que el orden es:
   ```bash
   # en .env: INTEGRACION_STOCK=true  (todavía NO checkout ni confirmación)
   php artisan config:clear
   php artisan chisperio:stock-cargar          # GET /stock → rukoz_stock → columnas de stock. Resumen: actualizados, sin cambios, ilimitados, sin vincular
   php artisan chisperio:stock-sin-espejo      # tiene que dar 0 y salir con código 0
   ```
   `chisperio:stock-sin-espejo` en **0** es la condición para seguir (ítems activos sin fila en `rukoz_stock` o con stock distinto). Los ítems `vinculado:false` se informan aparte y no son error. Si hay alguno, se vincula en el Central y se repite.
   > Este paso es el que «pisa» el stock de la tienda: a partir de acá el stock mostrado es el **«Disponible web» del Central**. Un `NULL` (ilimitado) en la web puede pasar a un número, y un número a `NULL` (artículo «a pedido»). Revisar la tienda con ojos de usuario (productos que antes se podían pedir y ahora dicen «sin stock» son los que están en 0 en el Central).
2. Encender el resto:
   ```
   INTEGRACION_CHECKOUT=true
   INTEGRACION_CONFIRMACION=true
   ```
   ```bash
   php artisan config:clear      # o config:cache
   php artisan chisperio:integracion-estado
   ```
   `INTEGRACION_CHECKOUT_SIN_RESERVA` queda en `false` (si el Central no responde, **no se vende sin reserva**; el cliente ve el mensaje con el botón de WhatsApp).
3. **`chisperio:integracion-estado` tiene que dar todo OK**: interruptores coherentes (el checkout exige stock y `RUKOZ_INTEGRACION`), ping, circuito cerrado, ítems sin espejo = 0, puntos de atención válidos (`BA`/`CBA` existen en el Central), reservas abiertas = 0, compensaciones pendientes = 0. Sale con código 1 si algo está mal.
4. `php artisan rukoz:estado` — «URL del Central», «Último sync de catálogo», cursor del feed, «Último webhook recibido» (hasta que el Central mande un evento va a decir `nunca`), inbox sin fallidos.

### Paso 8 — Mapeo de los vendedores reales

Cada usuario que vaya a **confirmar ventas** necesita el vendedor del Central con el que se presenta. Sin mapeo no se confirma (la web ni llama al Central).

```bash
php artisan chisperio:vendedor-mapear --listar                         # usuarios, su mapeo y los vendedores que el Central ya tiene asignados
php artisan chisperio:vendedor-mapear <email|id> <id-vendedor-central> # uno por uno
```

(También en **Admin → Usuarios**, «Vendedor en el Sistema Central».) El `<id-vendedor-central>` es el que el Central tiene en *Integraciones → Vendedores* (y en `rukoz:referencias`). Un id **sin asignar** en el Central da `VENDEDOR_NO_MAPEADO` al primer intento: el Central lo deja pendiente para que administración lo asigne. Verificar con `--listar` que todos los vendedores reales quedaron mapeados **y** asignados.

### Paso 9 — Prueba de punta a punta con un pedido real chico

Un pedido de verdad (de bajo valor, de un producto con stock en el Central), hecho en **producción** por alguien del equipo. Marcar los pasos al hacerlos:

1. [ ] **Anotar** el disponible web del artículo en el Central **antes**.
2. [ ] En la tienda: agregar el producto, hacer checkout, **«Finalizar por WhatsApp»**. Tiene que crearse sin error.
3. [ ] **Reserva:** el pedido aparece en el admin con `rukoz_ref` (`CHP-…`), estado `pendiente` / «reservado». En el Central: el pedido aparece **reservado** y el disponible web bajó en la cantidad pedida. (En la web, `php artisan chisperio:integracion-estado` → «reservas abiertas: 1».)
4. [ ] **Confirmar:** en el admin de la web, abrir el pedido → **«Confirmar venta»** → forma de envío, transportista, costo de envío cobrado, pagos (con o sin pago) y vendedor → confirmar. La venta existe en el Central con número, y el pedido pasa a solo lectura con «número de venta», total, pagado y saldo. Probar la casilla **«Despachar solo con pago completo»** solo si la prueba incluye un saldo.
5. [ ] **Empaquetar y despachar en el Central:** el estado del pedido en la web **cambia solo** (webhook; si no llega, el feed lo trae en ≤ 5 min). Tiene que verse: empaquetado, despachado, el transportista y el número/enlace de seguimiento.
6. [ ] En `php artisan rukoz:estado`: «Último webhook recibido» con la hora de la prueba (si dice `nunca`, el webhook **no entró** y se está viviendo del feed: volver a 1.5), «Inbox: fallidos» = 0.
7. [ ] Probar **un segundo pedido** que se cancele (desde el admin, antes de confirmar): la reserva se libera en el Central y el disponible vuelve a lo que estaba.
8. [ ] El stock mostrado en la tienda se corresponde con el del Central después de cada paso (≤ 1–2 min con webhook).

Si algún paso falla: **no se deja corriendo**. Se apagan los interruptores (paso 10) y se diagnostica con `storage/logs/laravel.log`, `rukoz:estado` y el log de requests de la integración en el Central.

### Paso 10 — Vuelta atrás

**Nivel 1 — Apagar los interruptores (no requiere código ni migraciones).** La web vuelve al flujo local:

```
INTEGRACION_CONFIRMACION=false
INTEGRACION_CHECKOUT=false
INTEGRACION_STOCK=false
INTEGRACION_CATALOGO=false
RUKOZ_INTEGRACION=false
```
```bash
php artisan config:clear && php artisan config:cache
```

Con `INTEGRACION_CHECKOUT=false` los pedidos nuevos vuelven al **stock local de siempre**. Con el espejo apagado el stock de las columnas queda con los **últimos valores que vino del Central**; hay que revisarlo y corregirlo a mano en el admin antes de volver a vender (si el catálogo tenía `NULL`/ilimitado antes, volver a ese valor).

**Qué pasa con los pedidos creados mientras estuvo encendido** (los que tienen `rukoz_ref`):

| Situación del pedido | Qué hacer |
|---|---|
| **Reservado, sin confirmar** | La reserva sigue apartando stock en el Central. Cancelarlo **desde el admin con la integración encendida** (libera la reserva en el Central), o cancelar en el Central. Si ya se apagó: cancelar la reserva a mano en el Central; en la web, el pedido queda como está. `chisperio:cancelar-reservas-viejas` **no** corre con la integración apagada. |
| **Confirmado** (venta en el Central) | Existe en el Central y se sigue gestionando **allá** (empaquetado, despacho, anulación). En la web queda de solo lectura; si el webhook está apagado, el estado no se actualiza más: seguir desde el Central. |
| **Pedidos nuevos hechos durante la vuelta atrás** | Sin `rukoz_ref`: flujo viejo, stock local. El Central no se entera: cargarlos a mano si hace falta. |

Mientras estén apagados los interruptores, los pedidos con `rukoz_ref` **no se sincronizan**: hay que repasarlos a mano (una lista: `Pedido` con `rukoz_ref` y estado `pendiente`/`confirmado`).

**Nivel 2 — Volver al código anterior (último recurso).**

```bash
cd <PROYECTO>
php artisan down
git checkout produccion-pre-integracion
composer2 install --no-dev --optimize-autoloader --no-interaction     # vuelve al vendor de esa versión
# restaurar public/build y public_html/build de la versión anterior (de los archivos del backup del paso 2)
php artisan config:clear && php artisan route:clear && php artisan view:clear
php artisan up
```

- **No se hace `migrate:rollback`.** Las 4 migraciones son aditivas (columnas y tablas nuevas, *nullable*); el código viejo las ignora y la base **no se toca**. Revertir la base solo con el backup del paso 2 y **solo si hay un daño real** en los datos (se pierde todo lo creado desde el backup).
- Los pedidos creados con la integración encendida **quedan en la base** con sus columnas `rukoz_*` y siguen visibles como pedidos normales para el código viejo, que no sabe de reservas ni de confirmación: tratarlos como en el Nivel 1.

### Paso 11 — Monitoreo de los primeros días

Al menos dos veces por día la primera semana, y después de cualquier cambio de configuración.

| Qué mirar | Cómo | Qué es normal / alarma |
|---|---|---|
| Estado general | `php artisan chisperio:integracion-estado` | todo OK; **alarma**: ping fallido, circuito abierto, ítems sin espejo, puntos inválidos |
| Estado del paquete | `php artisan rukoz:estado` | «Último webhook recibido» reciente; inbox fallidos = 0; compensaciones fallidas = 0; circuito cerrado |
| Eventos con problemas | `php artisan rukoz:inbox --estado=fallido` | cualquier evento fallido: ver el motivo, corregir y reprocesar con `php artisan rukoz:inbox --reintentar=<event_id>` |
| Log de la web | `tail -n 200 storage/logs/laravel.log \| grep -iE "critical\|error\|rukoz\|integracion"` | **alarma**: `critical` (confirmó en el Central y falló el guardado local; la venta existe allá, el estado llega por evento o `rukoz:revisar-pedidos --reconciliar`); warnings de «combinación inválida de interruptores» |
| Pedidos reservados sin confirmar | admin → Pedidos (filtro pendientes); `php artisan chisperio:cancelar-reservas-viejas --dry-run` | los que pasan los 3 días los cancela solo (cada hora); no debería haber viejos |
| Stock | `php artisan chisperio:stock-sin-espejo` (debe dar 0) | distinto de 0: un producto nuevo o cambiado sin vincular en el Central |
| Catálogo | `php artisan rukoz:sync-catalogo` o «Último sync de catálogo» en `rukoz:estado` | un producto nuevo con «sin vincular» no vende hasta vincularlo |
| Webhooks con errores **en el Central** | panel del Central → *Integraciones → Web Chisperío → Webhooks / Requests* | entregas con 4xx/5xx o con reintentos: normalmente 1.5 (redirección, WAF, certificado) |
| Cron | `ls -l storage/logs`; `rukoz:estado` («Última lectura del feed») | si «Última lectura del feed» tiene más de 10 min, el cron se cayó |
| Pedidos del día | comparar la cantidad de pedidos del admin contra los del Central | tienen que coincidir (los viejos sin `rukoz_ref` no cuentan) |

Después de una semana sin alarmas: dejar la guía como referencia y, si se quiere, subir el `RUKOZ_LOG_CHANNEL` o el nivel de log al valor habitual.

---

## Anexo A — Token de GitHub para el paquete privado

`rukoz/core-client` es un repositorio **privado**: Composer necesita un token para bajarlo, tanto en la máquina de desarrollo como en el hosting. **Usar un token fine-grained, de solo lectura y solo para ese repo.**

1. GitHub (cuenta `mArchilli`) → *Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token*.
2. **Resource owner:** `mArchilli`. **Expiration:** 90 días (o hasta el plazo que se quiera mantener; hay que renovarlo).
3. **Repository access → Only select repositories** → `rukoz-core-client`.
4. **Permissions → Repository permissions → Contents: Read-only.** (*Metadata: Read-only* se agrega solo.) **Nada más.**
5. Generar y copiar el token (empieza con `github_pat_…`; se ve **una sola vez**).
6. Cargarlo en Composer **globalmente en la cuenta** (queda en `~/.composer/auth.json` o `%APPDATA%\Composer\auth.json`, fuera del repo):
   ```bash
   composer config --global github-oauth.github.com <token>
   ```
   Una cuenta de desarrollo y la cuenta del hosting son dos lugares distintos: se puede usar el mismo token o, mejor, **uno por lugar** (para revocarlos por separado).

Reglas:

- **El token nunca va al repo.** `auth.json` está en `.gitignore` (`/auth.json`); además, no se escribe en `composer.json` ni se pasa por línea de comandos en un script versionado.
- Si se filtra o se cambia de equipo: revocarlo en GitHub y generar otro.
- Verificar el acceso sin instalar nada: `composer2 show -a rukoz/core-client` (o `git ls-remote https://github.com/mArchilli/rukoz-core-client.git`) tiene que listar los tags `v0.1.1` y `v0.1.2`.
- En el hosting, instalar con `composer2 install --no-dev --no-interaction`: `--no-interaction` hace que falle (en vez de quedarse pidiendo credenciales) si falta el token.

## Anexo B — Desarrollar el paquete en local sin tocar el repo

`composer.json` apunta al paquete en GitHub (`vcs`, `^0.1.2`). Para trabajar **temporalmente** sobre la carpeta local `../rukoz-core-client` (symlink: los cambios se ven al instante) **sin tocar `composer.json` ni `composer.lock`**, se usa un `composer.local.json` ignorado y la variable `COMPOSER`:

```bash
# Una sola vez
cp composer.json composer.local.json
cp composer.lock composer.local.lock        # Composer deriva «composer.local.lock» del nombre del json
```

Editar **solo** `composer.local.json`: reemplazar el bloque `repositories` por

```json
"repositories": {
    "rukoz-core-client": { "type": "path", "url": "../rukoz-core-client", "options": { "symlink": true } }
}
```

y poner `"rukoz/core-client": "@dev"` (o dejar `^0.1.2`: la carpeta local declara `"version": "0.1.2"`).

```bash
# Pasar a la carpeta local (en PowerShell: $env:COMPOSER='composer.local.json'; composer update rukoz/core-client; Remove-Item Env:COMPOSER)
COMPOSER=composer.local.json composer update rukoz/core-client
# vendor/rukoz/core-client es ahora un symlink a ../rukoz-core-client
```

```bash
# Volver al paquete de GitHub (necesita el token del Anexo A)
composer install            # SIN la variable COMPOSER: reinstala desde composer.lock (versión de GitHub)
```

Notas:

- `composer.local.json` y `composer.local.lock` están en `.gitignore`. `git status` tiene que quedar limpio en todo el proceso; si aparece `composer.json`/`composer.lock` modificados, algo se corrió **sin** la variable `COMPOSER`: `git checkout composer.json composer.lock` y volver a `composer install`.
- Mientras `vendor/` apunta a la carpeta local, **no** commitear ni desplegar: el `vendor/` no es parte del repo, pero los tests corren contra el código local, no contra el release.
- Para publicar un cambio del paquete: commit + tag nuevo (`v0.1.3`) en `rukoz-core-client`, push del tag, y en esta web `composer update rukoz/core-client` (con el token) para que `composer.lock` pase a esa versión; el `composer.json` sube a `^0.1.3` si hay que subir el piso.
- Alternativa más simple, para un cambio de unos minutos: `composer config repositories.rukoz-core-client path ../rukoz-core-client && composer update rukoz/core-client`, y para volver `git checkout composer.json composer.lock && composer install`. Más riesgosa: toca los archivos versionados.

## Anexo C — Referencia rápida de las variables

| Variable | Valor en producción | Cuándo |
|---|---|---|
| `RUKOZ_INTEGRACION` | `false` → `true` | paso 4 → paso 6 |
| `RUKOZ_CENTRAL_URL` | `https://sistema.rukoz.com.ar` (provisorio) | paso 5 |
| `RUKOZ_API_KEY`, `RUKOZ_SECRET` | los de la integración «Web Chisperío» | paso 5 |
| `RUKOZ_WEBHOOK_RECIBE` | `true` (o `false` si el webhook no entra) | paso 5 |
| `INTEGRACION_CATALOGO` | `false` → `true` | paso 4 → paso 6 |
| `INTEGRACION_STOCK` | `false` → `true` | paso 7 |
| `INTEGRACION_CHECKOUT` | `false` → `true` | paso 7 |
| `INTEGRACION_CONFIRMACION` | `false` → `true` | paso 7 |
| `INTEGRACION_CHECKOUT_SIN_RESERVA` | `false` | siempre |
| `PEDIDOS_CANCELAR_DIAS` | `3` | paso 4 |
| `INTEGRACION_PUNTO_BUENOS_AIRES` / `_CORDOBA` | `BA` / `CBA` | paso 5 |
| `INTEGRACION_FORMA_ENVIO_ID`, `INTEGRACION_TRANSPORTISTA_ID` | ids del Central | paso 5 |
| `INTEGRACION_REFERENCIAS_RESPALDO` | opcional (JSON), si el modal tiene que funcionar con el Central caído | opcional |
| `APP_TIMEZONE` | **no tocar** (hoy `UTC` por defecto) | — |

Los comandos útiles, en una línea: `rukoz:ping`, `rukoz:referencias`, `rukoz:estado`, `rukoz:inbox`, `rukoz:sync-catalogo`, `rukoz:sync-stock`, `rukoz:circuito [--reset]`, `rukoz:compensaciones`, `rukoz:revisar-pedidos [--reconciliar]` (paquete) y `chisperio:integracion-estado`, `chisperio:stock-cargar [--local]`, `chisperio:stock-sin-espejo`, `chisperio:vendedor-mapear`, `chisperio:cancelar-reservas-viejas [--dry-run]` (web).

---

## Preguntas abiertas (las contesta Matias antes del día)

1. **Dominio canónico:** ¿`chisperio.com.ar` o `www.chisperio.com.ar`? El webhook del Central va a la URL que no redirige (1.5). El `.env` local dice `http://www.chisperio.com.ar`.
2. **Cron:** ¿Hostinger deja correr `schedule:run` cada minuto en este plan? Si no, ¿cuál es el mínimo? (1.3).
3. **PHP del hosting:** ¿CLI y web están en 8.2 o superior? ¿Están las extensiones? (1.1).
4. **Pedidos pendientes de la web vieja:** ¿cuántos hay y se cierran antes del deploy? ¿Se resta su mercadería del stock del Central? (Paso 3).
5. **Token de GitHub:** ¿uno solo o uno por lugar (desarrollo y hosting)? (Anexo A).
