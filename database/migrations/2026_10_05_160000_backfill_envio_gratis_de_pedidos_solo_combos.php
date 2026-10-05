<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Regla nueva: el envío gratis de un combo solo vale si el pedido lleva ÚNICAMENTE
     * combos con envío gratis (ver PedidoController::store). `pedidos.envio_gratis` pasa a
     * ser el resultado final (por monto o por combo), así que los pedidos anteriores que
     * cumplen la regla se marcan acá. No se desmarca ninguno: los marcados por monto siguen
     * siéndolo.
     */
    public function up(): void
    {
        DB::table('pedidos')
            ->whereIn('id', function ($query) {
                $query->select('pedido_id')
                    ->from('pedido_items')
                    ->groupBy('pedido_id')
                    ->havingRaw('COUNT(*) = SUM(CASE WHEN combo_id IS NOT NULL AND envio_gratis = 1 THEN 1 ELSE 0 END)');
            })
            ->update(['envio_gratis' => true]);
    }

    public function down(): void
    {
        // Irreversible a propósito: no se distingue un marcado original de uno rellenado.
    }
};
