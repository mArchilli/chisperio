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
        Schema::create('movimientos_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->foreignId('pedido_id')->nullable()->constrained('pedidos')->nullOnDelete();
            $table->integer('cantidad'); // con signo: positivo = reposición, negativo = descuento
            $table->enum('motivo', ['pedido_creado', 'pedido_cancelado', 'ajuste_manual']);
            $table->integer('stock_resultante')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos_stock');
    }
};
