<?php

namespace Tests\Feature;

use App\Enums\EstadoPedido;
use App\Enums\MotivoMovimientoStock;
use App\Exceptions\StockInsuficienteException;
use App\Models\MovimientoStock;
use App\Models\Pedido;
use App\Models\Producto;
use App\Services\StockService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PDO;
use PDOException;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * Prueba de concurrencia real (no mockeada) para StockService::descontar().
 *
 * El resto de la suite corre contra sqlite :memory:, que no sirve para esto: la gramática
 * sqlite de Eloquent ni siquiera emite la cláusula FOR UPDATE, y cada conexión :memory: es
 * una base de datos separada e inaccesible desde otra conexión. Probar un lock pesimista
 * real requiere un motor que lo implemente de verdad (MySQL/InnoDB) y dos conexiones reales
 * viendo la misma fila.
 *
 * Tampoco alcanza con abrir dos conexiones MySQL dentro de un solo hilo de PHP: una llamada
 * bloqueante a la base de datos bloquea todo el proceso, así que no hay forma de que "la
 * otra transacción" avance mientras la primera espera con el lock tomado. Por eso el lado A
 * corre en un proceso de PHP real e independiente (mismo StockService sin mocks, ver
 * tests/Concurrency/descontar_worker.php) mientras el lado B corre en este proceso — dos
 * ejecuciones concurrentes de verdad compitiendo por el lock de la misma fila.
 *
 * Requiere MySQL real disponible localmente (mismo motor que usa producción); si no hay
 * conexión, el test se skipea en vez de romper el resto de la suite.
 */
class StockServiceConcurrencyTest extends TestCase
{
    private const CONNECTION = 'stock_lock_test';

    private const DATABASE = 'chisperio_stock_lock_test';

    private ?string $originalDefaultConnection = null;

    protected function setUp(): void
    {
        parent::setUp();

        try {
            $this->prepararBaseDeDatosDeTest();
        } catch (PDOException $e) {
            $this->markTestSkipped(
                'MySQL no disponible localmente para el test de concurrencia real: '.$e->getMessage()
            );
        }
    }

    protected function tearDown(): void
    {
        if ($this->originalDefaultConnection !== null) {
            config(['database.default' => $this->originalDefaultConnection]);
        }

        parent::tearDown();
    }

    public function test_dos_descuentos_concurrentes_sobre_stock_1_solo_uno_tiene_exito(): void
    {
        $producto = Producto::on(self::CONNECTION)->create([
            'titulo' => 'Producto lock test',
            'precio' => 100,
            'is_active' => true,
            'is_featured' => false,
            'stock' => 1,
        ]);

        $pedidoA = $this->crearPedido($producto, 1);
        $pedidoB = $this->crearPedido($producto, 1);

        $process = new Process([
            PHP_BINARY,
            __DIR__.'/../Concurrency/descontar_worker.php',
            (string) $pedidoA->id,
            self::DATABASE,
        ]);
        $process->setTimeout(10);
        $process->start();

        // Le damos ventaja al proceso hijo (lado A) para que termine de arrancar Laravel y
        // tome el lock de fila ANTES de que el lado B (este proceso, ya arrancado, mucho más
        // rápido) intente lockForUpdate() sobre la misma fila. Así maximizamos la chance de que
        // B choque de verdad contra el lock de A en lugar de simplemente encontrar el stock ya
        // en 0. No es necesario para que el test sea correcto (el resultado se verifica por
        // invariante, no por quién gana), pero sí para que efectivamente ejercite la espera real
        // del lock en la mayoría de las corridas.
        usleep(200_000);

        $this->originalDefaultConnection = config('database.default');
        config(['database.default' => self::CONNECTION]);

        $bResultado = null;

        try {
            app(StockService::class)->descontar($pedidoB);
            $bResultado = 'exito';
        } catch (StockInsuficienteException) {
            $bResultado = 'stock_insuficiente';
        }

        config(['database.default' => $this->originalDefaultConnection]);

        $process->wait();

        $aResultado = match ($process->getExitCode()) {
            0 => 'exito',
            2 => 'stock_insuficiente',
            default => 'error:'.$process->getExitCode().':'.$process->getErrorOutput(),
        };

        // Nunca los dos tienen éxito, y nunca los dos fallan: exactamente uno de cada uno.
        $resultados = [$aResultado, $bResultado];
        sort($resultados);
        $this->assertSame(
            ['exito', 'stock_insuficiente'],
            $resultados,
            "Resultado inesperado. A={$aResultado} B={$bResultado} (stderr proceso A: {$process->getErrorOutput()})"
        );

        $producto->refresh();
        // Nunca negativo, nunca se queda en 1: exactamente un pedido lo descontó.
        $this->assertSame(0, $producto->stock);

        $movimientos = MovimientoStock::on(self::CONNECTION)->where('producto_id', $producto->id)->get();
        $this->assertCount(1, $movimientos, 'Debe haber exactamente un movimiento de stock (el del pedido ganador).');
        $this->assertSame(-1, $movimientos->first()->cantidad);
        $this->assertSame(MotivoMovimientoStock::PedidoCreado, $movimientos->first()->motivo);
        $this->assertSame(0, $movimientos->first()->stock_resultante);

        $pedidoGanadorId = $bResultado === 'exito' ? $pedidoB->id : $pedidoA->id;
        $this->assertSame($pedidoGanadorId, $movimientos->first()->pedido_id);
    }

    private function crearPedido(Producto $producto, int $cantidad): Pedido
    {
        $pedido = Pedido::on(self::CONNECTION)->create([
            'cliente_nombre' => 'Cliente lock test',
            'subtotal' => $producto->precio * $cantidad,
            'total' => $producto->precio * $cantidad,
            'estado' => EstadoPedido::Pendiente,
        ]);

        $pedido->items()->create([
            'producto_id' => $producto->id,
            'titulo' => $producto->titulo,
            'precio_unitario' => $producto->precio,
            'cantidad' => $cantidad,
            'subtotal' => $producto->precio * $cantidad,
        ]);

        return $pedido;
    }

    private function prepararBaseDeDatosDeTest(): void
    {
        $host = env('DB_HOST', '127.0.0.1');
        $port = env('DB_PORT', '3306');
        $username = env('DB_USERNAME', 'root');
        $password = env('DB_PASSWORD', '');

        $pdo = new PDO("mysql:host={$host};port={$port}", $username, $password);
        $pdo->exec(
            'CREATE DATABASE IF NOT EXISTS `'.self::DATABASE.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
        );

        config(['database.connections.'.self::CONNECTION => [
            'driver' => 'mysql',
            'host' => $host,
            'port' => $port,
            'database' => self::DATABASE,
            'username' => $username,
            'password' => $password,
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'strict' => true,
            'engine' => null,
        ]]);

        if (! Schema::connection(self::CONNECTION)->hasTable('productos')) {
            Artisan::call('migrate', [
                '--database' => self::CONNECTION,
                '--path' => 'database/migrations',
                '--force' => true,
            ]);
        }

        DB::connection(self::CONNECTION)->statement('SET FOREIGN_KEY_CHECKS=0');
        foreach (['movimientos_stock', 'pedido_items', 'pedidos', 'productos'] as $tabla) {
            DB::connection(self::CONNECTION)->table($tabla)->truncate();
        }
        DB::connection(self::CONNECTION)->statement('SET FOREIGN_KEY_CHECKS=1');
    }
}
