<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Completa envio_gratis en los pedidos anteriores a la columna (null = "no se sabe").
     *
     * Solo hay una fila de configuración, así que el monto mínimo que regía para un
     * pedido es el actual SI la configuración no se modificó después de crearse ese
     * pedido (updated_at de la config <= created_at del pedido). Los pedidos hechos
     * antes de la última modificación quedan en null: el monto que regía no se puede
     * reconstruir y es preferible no afirmar nada.
     */
    public function up(): void
    {
        $configuracion = DB::table('configuracion_envio')->first();

        if ($configuracion === null) {
            return;
        }

        $montoMinimo = (float) $configuracion->monto_minimo;

        DB::table('pedidos')
            ->whereNull('envio_gratis')
            ->whereNull('envio_gratis_monto_minimo')
            ->where('created_at', '>=', $configuracion->updated_at)
            ->update([
                'envio_gratis_monto_minimo' => $montoMinimo,
                'envio_gratis' => DB::raw($montoMinimo > 0 ? "CASE WHEN subtotal >= {$montoMinimo} THEN 1 ELSE 0 END" : '0'),
            ]);
    }

    public function down(): void
    {
        // Irreversible a propósito: no se distingue un null original de uno rellenado.
    }
};
