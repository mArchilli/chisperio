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
        Schema::table('combos', function (Blueprint $table) {
            // Bandera propia del combo: independiente del monto mínimo global de
            // envío gratis (ConfiguracionEnvio) — un combo puntual puede venderse con
            // envío incluido aunque el carrito no llegue a ese monto.
            $table->boolean('envio_gratis')->default(false)->after('descuento_activo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('combos', function (Blueprint $table) {
            $table->dropColumn('envio_gratis');
        });
    }
};
