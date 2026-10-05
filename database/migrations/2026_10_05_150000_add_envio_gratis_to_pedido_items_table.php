<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedido_items', function (Blueprint $table) {
            // Snapshot de si el combo traía envío gratis (Combo.envio_gratis) AL MOMENTO de la
            // compra. Antes el detalle del pedido lo leía del combo vivo: si después se
            // editaba o se borraba el combo, el pedido cambiaba de aspecto. false para los
            // productos sueltos.
            $table->boolean('envio_gratis')->default(false)->after('combo_items_seleccionados');
        });

        // Pedidos anteriores: se toma el valor actual del combo (es lo único que se sabe).
        // Si el combo ya se borró (combo_id quedó en null), queda en false.
        DB::table('pedido_items')
            ->whereNotNull('combo_id')
            ->update([
                'envio_gratis' => DB::raw('COALESCE((SELECT combos.envio_gratis FROM combos WHERE combos.id = pedido_items.combo_id), 0)'),
            ]);
    }

    public function down(): void
    {
        Schema::table('pedido_items', function (Blueprint $table) {
            $table->dropColumn('envio_gratis');
        });
    }
};
