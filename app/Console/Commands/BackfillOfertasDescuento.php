<?php

namespace App\Console\Commands;

use App\Enums\TipoDescuento;
use App\Models\Oferta;
use Illuminate\Console\Command;

class BackfillOfertasDescuento extends Command
{
    protected $signature = 'ofertas:backfill-descuento';

    protected $description = 'Completa tipo_descuento y valor_descuento en ofertas existentes a partir de precio_oferta/porcentaje_descuento';

    public function handle(): int
    {
        $ofertas = Oferta::with('producto')->whereNull('tipo_descuento')->get();

        if ($ofertas->isEmpty()) {
            $this->info('No hay ofertas pendientes de backfill.');

            return self::SUCCESS;
        }

        $this->info("Procesando {$ofertas->count()} ofertas...");

        $actualizadas = 0;
        $sinResolver = [];

        foreach ($ofertas as $oferta) {
            if ($oferta->precio_oferta !== null && $oferta->producto) {
                $valor = round(max(0, $oferta->producto->precio - $oferta->precio_oferta), 2);

                $oferta->update([
                    'tipo_descuento' => TipoDescuento::Fijo,
                    'valor_descuento' => $valor,
                ]);

                $actualizadas++;

                continue;
            }

            if ($oferta->porcentaje_descuento !== null) {
                $oferta->update([
                    'tipo_descuento' => TipoDescuento::Porcentaje,
                    'valor_descuento' => $oferta->porcentaje_descuento,
                ]);

                $actualizadas++;

                continue;
            }

            $sinResolver[] = $oferta->id;
        }

        $this->newLine();
        $this->info("Ofertas actualizadas: {$actualizadas}");
        $this->warn('Ofertas sin poder resolverse: '.count($sinResolver));

        if (! empty($sinResolver)) {
            $this->table(['ID de oferta'], collect($sinResolver)->map(fn ($id) => [$id])->all());
        }

        return self::SUCCESS;
    }
}
