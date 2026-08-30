<?php

use App\Enums\Sucursal;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            // Sucursal de WhatsApp con la que el cliente coordina el pedido. Antes
            // vivía solo en el frontend (sessionStorage). El `default` cubre el
            // backfill de los pedidos ya existentes: todos se atendían desde el
            // único número histórico, que es el de Buenos Aires (5491127930349).
            $table->string('sucursal')
                ->default(Sucursal::BuenosAires->value)
                ->after('estado')
                ->index();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn('sucursal');
        });
    }
};
