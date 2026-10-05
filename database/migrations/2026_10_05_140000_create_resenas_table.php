<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resenas', function (Blueprint $table) {
            $table->id();
            // Nombre tal cual se muestra (las iniciales del avatar se derivan de acá).
            $table->string('nombre', 120);
            // Línea chica bajo el nombre, ej. "Local Guide · 28 opiniones · 12 fotos".
            $table->string('meta', 150)->nullable();
            // Una reseña puede ser solo de estrellas, sin texto.
            $table->text('texto')->nullable();
            $table->unsignedTinyInteger('puntuacion')->default(5);
            // Fecha real de la reseña: la landing muestra "Hace 2 meses" calculado desde acá,
            // y el listado se ordena de la más nueva a la más vieja.
            $table->date('fecha');
            $table->string('color_avatar', 7)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resenas');
    }
};
