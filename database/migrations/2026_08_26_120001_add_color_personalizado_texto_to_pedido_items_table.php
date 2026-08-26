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
            // Color pedido por el cliente (texto libre y/o hex) cuando la variante
            // elegida en este item tiene es_color_personalizado = true.
            $table->string('color_personalizado_texto')->nullable()->after('variante_color_hex');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pedido_items', function (Blueprint $table) {
            $table->dropColumn('color_personalizado_texto');
        });
    }
};
