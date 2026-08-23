<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            // nullOnDelete: mismo patrón que producto_id en pedido_items/movimientos_stock —
            // si el código se borra, el pedido no debe desaparecer ni fallar, solo pierde el
            // vínculo (el snapshot de abajo es la fuente de verdad histórica, no la FK).
            $table->foreignId('codigo_descuento_id')->nullable()->after('total')
                ->constrained('codigos_descuento')->nullOnDelete();
            // Snapshot del código tal como se usó (texto, tipo, valor): no depende de que el
            // registro de CodigoDescuento siga existiendo o sin cambios para reconstruir el
            // pedido histórico.
            $table->string('codigo_descuento_texto')->nullable()->after('codigo_descuento_id');
            $table->string('codigo_descuento_tipo')->nullable()->after('codigo_descuento_texto');
            $table->decimal('codigo_descuento_valor', 10, 2)->nullable()->after('codigo_descuento_tipo');
            $table->decimal('descuento_monto', 10, 2)->default(0)->after('codigo_descuento_valor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('codigo_descuento_id');
            $table->dropColumn(['codigo_descuento_texto', 'codigo_descuento_tipo', 'codigo_descuento_valor', 'descuento_monto']);
        });
    }
};
