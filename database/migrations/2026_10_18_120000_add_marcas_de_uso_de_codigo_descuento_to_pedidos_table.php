<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            // Marcas de idempotencia del uso del cupón. El "uso" de un cupón es el propio
            // pedido que lo aplicó (pedidos.codigo_descuento_id), así que las marcas viven
            // acá: consumirUso() / liberarUso() las miran para que repetir la operación
            // (reintentos, eventos duplicados) no sume ni reste dos veces.
            //
            // Aditiva y sin backfill: los pedidos existentes quedan en NULL. Un pedido ya
            // cancelado antes de esta migración liberó su uso con la lógica vieja y por ser
            // un estado terminal no lo vuelve a liberar nadie.
            $table->timestamp('codigo_descuento_consumido_at')->nullable()->after('descuento_monto');
            $table->timestamp('codigo_descuento_liberado_at')->nullable()->after('codigo_descuento_consumido_at');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['codigo_descuento_consumido_at', 'codigo_descuento_liberado_at']);
        });
    }
};
