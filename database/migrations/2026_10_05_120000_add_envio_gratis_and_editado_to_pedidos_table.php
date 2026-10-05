<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            // Snapshot de si el subtotal alcanzó el monto de envío gratis AL MOMENTO de
            // la compra (el monto mínimo global puede cambiar después). `null` en ambos
            // = pedido anterior a esta columna: no se sabe, no se muestra nada.
            $table->boolean('envio_gratis')->nullable()->after('total_con_recargo');
            $table->decimal('envio_gratis_monto_minimo', 10, 2)->nullable()->after('envio_gratis');

            // Última vez que un admin/vendedor editó el pedido (null = nunca editado).
            $table->timestamp('editado_at')->nullable()->after('despachado_at');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['envio_gratis', 'envio_gratis_monto_minimo', 'editado_at']);
        });
    }
};
