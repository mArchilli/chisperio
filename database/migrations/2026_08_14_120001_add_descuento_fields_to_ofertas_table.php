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
        Schema::table('ofertas', function (Blueprint $table) {
            $table->enum('tipo_descuento', ['porcentaje', 'fijo'])->nullable()->after('producto_id');
            $table->decimal('valor_descuento', 10, 2)->nullable()->after('tipo_descuento');
            $table->enum('alcance', ['todos', 'especifico'])->default('todos')->after('valor_descuento');
            $table->foreignId('producto_escala_precio_id')
                ->nullable()
                ->after('alcance')
                ->constrained('producto_escalas_precio')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ofertas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('producto_escala_precio_id');
            $table->dropColumn(['tipo_descuento', 'valor_descuento', 'alcance']);
        });
    }
};
