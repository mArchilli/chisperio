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
        Schema::create('combo_productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('combo_id')->constrained('combos')->cascadeOnDelete();
            // Sin onDelete explícito = RESTRICT (default de MySQL/sqlite): no se puede
            // borrar un producto usado en un combo sin sacarlo antes del combo. El guard
            // en ProductoController::destroy da un mensaje legible antes de llegar acá.
            $table->foreignId('producto_id')->constrained('productos');
            // null = sin variante fija: si el producto tiene variantes activas, el
            // comprador elige una al agregar el combo al carrito (mismo criterio que un
            // producto suelto). Si se borra la variante fijada, el item queda "sin fijar"
            // en vez de romper el combo.
            $table->foreignId('producto_variante_id')->nullable()->constrained('producto_variantes')->nullOnDelete();
            $table->unsignedInteger('cantidad')->default(1);
            $table->unsignedInteger('orden')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('combo_productos');
    }
};
