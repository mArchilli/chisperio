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
            // producto_id/producto_variante_id quedan null en una línea de combo (ya son
            // nullable). combo_id identifica el combo vendido, y combo_items_seleccionados
            // es el snapshot de qué se descontó realmente por cada producto/variante
            // componente (independiente de que el combo cambie de receta después).
            $table->foreignId('combo_id')->nullable()->after('producto_variante_id')->constrained('combos')->nullOnDelete();
            $table->json('combo_items_seleccionados')->nullable()->after('combo_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pedido_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('combo_id');
            $table->dropColumn(['combo_items_seleccionados']);
        });
    }
};
