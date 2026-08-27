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
        Schema::create('planes_pago_tarjeta', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 60);
            $table->unsignedInteger('cuotas');
            $table->decimal('recargo_porcentaje', 5, 2);
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('planes_pago_tarjeta');
    }
};
