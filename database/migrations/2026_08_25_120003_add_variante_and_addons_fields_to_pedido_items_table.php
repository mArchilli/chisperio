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
        Schema::table('pedido_items', function (Blueprint $table) {
            $table->foreignId('producto_variante_id')
                ->nullable()
                ->after('producto_id')
                ->constrained('producto_variantes')
                ->nullOnDelete();

            // Snapshot de la variante al momento de la compra (no depende de que la fila siga existiendo)
            $table->string('variante_nombre')->nullable()->after('producto_variante_id');
            $table->string('variante_color_hex')->nullable()->after('variante_nombre');
            $table->decimal('recargo_variante_unitario', 10, 2)->default(0)->after('variante_color_hex');

            // Array de objetos {addon_id, nombre, precio, texto_personalizado}
            $table->json('addons_seleccionados')->nullable()->after('recargo_variante_unitario');
            $table->decimal('addons_total_unitario', 10, 2)->default(0)->after('addons_seleccionados');

            // precio_unitario sigue siendo el precio unitario final (con recargos incluidos);
            // este campo es solo el precio base, para desglosar en reportes.
            $table->decimal('precio_base_unitario', 10, 2)->nullable()->after('addons_total_unitario');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pedido_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('producto_variante_id');
            $table->dropColumn([
                'variante_nombre',
                'variante_color_hex',
                'recargo_variante_unitario',
                'addons_seleccionados',
                'addons_total_unitario',
                'precio_base_unitario',
            ]);
        });
    }
};
