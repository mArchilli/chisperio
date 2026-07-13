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
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('cliente_email')->nullable()->after('cliente_telefono');
            $table->string('cliente_codigo_postal')->nullable()->after('cliente_direccion');
            $table->text('observaciones')->nullable()->after('cliente_codigo_postal');
            $table->dropColumn('mensaje_whatsapp');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['cliente_email', 'cliente_codigo_postal', 'observaciones']);
            $table->text('mensaje_whatsapp')->nullable();
        });
    }
};
