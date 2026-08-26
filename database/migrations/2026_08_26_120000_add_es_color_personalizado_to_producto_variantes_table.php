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
        Schema::table('producto_variantes', function (Blueprint $table) {
            // true = esta fila representa "Otro / a elección del cliente": color_hex queda
            // como referencia visual del ícono/swatch (no el color real pedido), y
            // precio_adicional se usa igual que en cualquier variante (costo de personalizar).
            $table->boolean('es_color_personalizado')->default(false)->after('color_hex');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('producto_variantes', function (Blueprint $table) {
            $table->dropColumn('es_color_personalizado');
        });
    }
};
