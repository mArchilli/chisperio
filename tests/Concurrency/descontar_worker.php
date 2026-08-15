<?php

/**
 * Worker standalone usado solo por Tests\Feature\StockServiceConcurrencyTest.
 *
 * Corre StockService::descontar() sin modificar (mismo código de producción, sin mocks)
 * en un proceso de PHP real e independiente, contra la misma base de datos MySQL de test
 * que usa el proceso principal de PHPUnit — para poder probar el lock pesimista bajo
 * concurrencia genuina. Un solo hilo de PHP no puede simular esto: una llamada bloqueante
 * a la base de datos bloquea todo el proceso, así que no hay forma de que una "segunda
 * transacción" avance mientras la primera espera dentro del mismo hilo.
 *
 * Uso: php descontar_worker.php <pedido_id> <database>
 * Exit codes: 0 = descontó con éxito, 2 = StockInsuficienteException, 1 = error inesperado.
 */

require __DIR__.'/../../vendor/autoload.php';

$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$pedidoId = (int) ($argv[1] ?? 0);
$database = $argv[2] ?? null;

if ($pedidoId === 0 || ! $database) {
    fwrite(STDERR, "Uso: descontar_worker.php <pedido_id> <database>\n");
    exit(1);
}

// Forzamos 'mysql' explícitamente: el proceso hijo hereda las env vars del proceso padre
// (PHPUnit), que via phpunit.xml pisan DB_CONNECTION=sqlite/DB_DATABASE=:memory: para el
// resto de la suite. No podemos confiar en el .env real acá.
config(['database.default' => 'mysql', 'database.connections.mysql.database' => $database]);
Illuminate\Support\Facades\DB::purge('mysql');

try {
    $pedido = App\Models\Pedido::findOrFail($pedidoId);
    app(App\Services\StockService::class)->descontar($pedido);
    exit(0);
} catch (App\Exceptions\StockInsuficienteException $e) {
    fwrite(STDOUT, $e->getMessage());
    exit(2);
} catch (\Throwable $e) {
    fwrite(STDERR, get_class($e).': '.$e->getMessage());
    exit(1);
}
