# Tests

```bash
php artisan test
```

La suite corre **siempre** contra SQLite en memoria (`phpunit.xml` fija `DB_CONNECTION=sqlite`,
`DB_DATABASE=:memory:`, `APP_TIMEZONE=UTC`). `tests/TestCase.php` frena con una excepción si por
cualquier motivo la conexión no es SQLite en memoria, para que ningún test pueda migrar o borrar
la base de trabajo.

## Test de concurrencia con MySQL real (opt-in)

`tests/Feature/StockServiceConcurrencyTest.php` prueba el lock pesimista de `StockService::descontar()`
con dos procesos de PHP compitiendo por la misma fila. SQLite no puede hacerlo, así que usa MySQL
de verdad: **crea** la base `chisperio_stock_lock_test` en el MySQL local y le corre `migrate:fresh`.
Nunca toca la base de trabajo (`chisperio`).

Por eso **se saltea por defecto** (aparece como "skipped" en `php artisan test`). Para correrlo hay
que pedirlo explícitamente con el grupo `mysql` **y** la variable de entorno:

```bash
# bash
RUN_MYSQL_LOCK_TEST=1 php artisan test --group=mysql

# PowerShell
$env:RUN_MYSQL_LOCK_TEST = '1'; php artisan test --group=mysql; Remove-Item Env:RUN_MYSQL_LOCK_TEST
```

Requiere MySQL encendido con las credenciales `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD` del `.env`.
Si está pedido pero MySQL no responde, el test se saltea en vez de fallar.

## Tests de caracterización del checkout

`tests/Feature/CheckoutCaracterizacionTest.php` fija, con valores calculados a mano, lo que escribe
`POST /checkout` para varios carritos. Se escribió antes de extraer el cálculo a `CalculadoraPedido`
y tiene que seguir en verde sin cambios: si falla después de tocar el checkout, se movió el
comportamiento, no el test.
