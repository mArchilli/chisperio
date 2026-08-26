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
        Schema::table('producto_media', function (Blueprint $table) {
            // null = medio general (se muestra sin importar el color elegido).
            // Seteado = medio específico de esa variante de color (aplica a imagen y video).
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
        Schema::table('producto_media', function (Blueprint $table) {
            $table->dropConstrainedForeignId('producto_variante_id');
        });
    }
};
