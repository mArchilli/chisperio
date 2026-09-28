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
        Schema::create('combos', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            // Precio fijo del combo, independiente de la suma de precios de sus productos.
            $table->decimal('precio', 10, 2);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);

            // Descuento propio del combo: a diferencia de `ofertas` (que permite varias
            // ofertas programadas con historial por producto), un combo tiene un único
            // descuento configurable directo en su propio formulario.
            $table->enum('tipo_descuento', ['porcentaje', 'fijo'])->nullable();
            $table->decimal('valor_descuento', 10, 2)->nullable();
            $table->dateTime('descuento_fecha_inicio')->nullable();
            $table->dateTime('descuento_fecha_fin')->nullable();
            $table->boolean('descuento_activo')->default(false);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('combos');
    }
};
