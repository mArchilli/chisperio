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
        Schema::create('producto_variantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->string('nombre', 100);
            $table->string('color_hex', 7)->nullable();
            $table->decimal('precio_adicional', 10, 2)->default(0);
            // null = stock ilimitado, mismo criterio que productos.stock
            $table->integer('stock')->nullable();
            $table->string('sku')->nullable();
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['producto_id', 'nombre']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('producto_variantes');
    }
};
