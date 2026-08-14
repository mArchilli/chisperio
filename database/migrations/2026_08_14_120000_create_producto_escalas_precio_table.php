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
        Schema::create('producto_escalas_precio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->unsignedInteger('cantidad_minima'); // debe ser > 1; validado en la capa de servicio/admin (Fase 2+)
            $table->decimal('precio_unitario', 10, 2);
            $table->timestamps();

            $table->unique(['producto_id', 'cantidad_minima']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('producto_escalas_precio');
    }
};
