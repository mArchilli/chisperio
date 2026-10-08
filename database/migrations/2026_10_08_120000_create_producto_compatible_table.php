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
        // Pares de productos compatibles entre sí (p. ej. una pistola PULY® y la chispa
        // fría PULY® que usa). La relación es simétrica: cada par se guarda UNA sola vez
        // y se consulta en los dos sentidos (ver Producto::idsCompatibles). Con ella el
        // carrito sugiere lo que funciona con lo que el cliente ya lleva.
        Schema::create('producto_compatible', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->foreignId('compatible_id')->constrained('productos')->cascadeOnDelete();
            $table->unsignedInteger('orden')->default(0);

            $table->unique(['producto_id', 'compatible_id']);
        });

        // "Sugerir siempre": el producto se ofrece en el carrito aunque ningún producto
        // del carrito sea compatible con él (p. ej. las chispas frías).
        Schema::table('productos', function (Blueprint $table) {
            $table->boolean('sugerir_en_carrito')->default(false)->after('is_featured');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('sugerir_en_carrito');
        });

        Schema::dropIfExists('producto_compatible');
    }
};
