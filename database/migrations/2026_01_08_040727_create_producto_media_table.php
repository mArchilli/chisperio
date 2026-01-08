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
        Schema::create('producto_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained()->onDelete('cascade');
            $table->string('tipo'); // 'imagen' o 'video'
            $table->string('ruta'); // ruta del archivo
            $table->integer('orden')->default(0); // para ordenar las imágenes/videos
            $table->boolean('is_principal')->default(false); // imagen/video principal
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('producto_media');
    }
};
