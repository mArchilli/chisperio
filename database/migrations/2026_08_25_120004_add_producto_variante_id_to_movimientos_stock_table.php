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
        Schema::table('movimientos_stock', function (Blueprint $table) {
            // Si está seteado, el movimiento corresponde al stock de la variante y no al del producto
            $table->foreignId('producto_variante_id')
                ->nullable()
                ->after('producto_id')
                ->constrained('producto_variantes')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos_stock', function (Blueprint $table) {
            $table->dropConstrainedForeignId('producto_variante_id');
        });
    }
};
