<?php

namespace App\Console\Commands;

use App\Models\Combo;
use App\Models\Producto;
use App\Models\ProductoVariante;
use App\Rukoz\EspejoStock;
use Illuminate\Console\Command;
use Rukoz\CoreClient\Stock\StockItem;

class StockSinEspejo extends Command
{
    protected $signature = 'chisperio:stock-sin-espejo';

    protected $description = 'Lista productos y variantes activos sin fila en rukoz_stock o con un stock local distinto del espejo (sale con código 1 si hay alguno)';

    public function handle(): int
    {
        if (! EspejoStock::activo()) {
            $this->components->warn('El espejo de stock está apagado (INTEGRACION_STOCK / RUKOZ_INTEGRACION): el chequeo igual compara contra lo que haya en rukoz_stock.');
        }

        $filas = StockItem::query()
            ->whereIn('tipo', ['producto', 'variante'])
            ->get()
            ->keyBy(fn (StockItem $fila) => $fila->tipo.':'.$fila->external_id);

        $problemas = [];
        $sinVincular = 0;
        $revisados = 0;

        // Un producto con variantes no tiene número propio (lo informan sus variantes): se revisan sus variantes activas.
        $items = Producto::query()->where('is_active', true)->whereDoesntHave('variantes')->orderBy('id')->get()
            ->map(fn (Producto $p) => ['producto', $p->id, $p->titulo, $p->stock])
            ->concat(
                ProductoVariante::query()->with('producto')->where('is_active', true)
                    ->whereHas('producto', fn ($q) => $q->where('is_active', true))
                    ->orderBy('producto_id')->orderBy('id')->get()
                    ->map(fn (ProductoVariante $v) => ['variante', $v->id, $v->producto->titulo.' — '.$v->nombre, $v->stock])
            );

        foreach ($items as [$tipo, $id, $nombre, $local]) {
            $revisados++;
            $fila = $filas->get($tipo.':'.$id);

            if ($fila === null) {
                $problemas[] = [$tipo, $id, $nombre, $this->mostrar($local), '—', 'sin fila en rukoz_stock'];

                continue;
            }

            $esperado = EspejoStock::valorDe($fila->paraLaWeb());

            if ($esperado === null) {
                $sinVincular++; // el Central no lo tiene vinculado: sigue con su stock local, no es un error de espejo

                continue;
            }

            if ($esperado['stock'] !== ($local === null ? null : (int) $local)) {
                $problemas[] = [$tipo, $id, $nombre, $this->mostrar($local), $this->mostrar($esperado['stock']), 'el stock local difiere del espejo'];
            }
        }

        $this->components->twoColumnDetail('Productos y variantes activos revisados', (string) $revisados);
        $this->components->twoColumnDetail('Sin vincular en el Central (informativo, no se tocan)', (string) $sinVincular);
        $this->components->twoColumnDetail('Combos activos (sin columna: se calculan con sus componentes)', (string) Combo::query()->where('is_active', true)->count());

        if ($problemas === []) {
            $this->components->info('Todo coincide con el espejo.');

            return self::SUCCESS;
        }

        $this->table(['Tipo', 'ID', 'Ítem', 'Local', 'Espejo', 'Motivo'], $problemas);
        $this->components->error(count($problemas).' ítem(s) sin espejo. Corré `php artisan chisperio:stock-cargar` para ponerlos al día.');

        return self::FAILURE;
    }

    private function mostrar(?int $stock): string
    {
        return $stock === null ? 'NULL (ilimitado)' : (string) $stock;
    }
}
