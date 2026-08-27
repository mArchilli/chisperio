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
            // nullOnDelete: mismo patrón que codigo_descuento_id — si el plan se
            // borra, el pedido no debe desaparecer ni fallar, solo pierde el vínculo
            // (el snapshot de abajo es la fuente de verdad histórica, no la FK).
            $table->foreignId('plan_pago_tarjeta_id')->nullable()->after('total')
                ->constrained('planes_pago_tarjeta')->nullOnDelete();
            // Snapshot del plan tal como se usó: no depende de que el registro de
            // PlanPagoTarjeta siga existiendo o sin cambios para reconstruir el
            // pedido histórico.
            $table->string('plan_pago_nombre')->nullable()->after('plan_pago_tarjeta_id');
            $table->unsignedInteger('plan_pago_cuotas')->nullable()->after('plan_pago_nombre');
            $table->decimal('recargo_porcentaje', 5, 2)->nullable()->after('plan_pago_cuotas');
            // Recargo en pesos sobre el total del pedido.
            $table->decimal('recargo_monto', 10, 2)->nullable()->after('recargo_porcentaje');
            // Total real a pagar con tarjeta (total + recargo_monto). Cuando el
            // cliente no elige tarjeta, estos campos quedan null y el pedido sigue
            // usando la columna total existente exactamente como hoy.
            $table->decimal('total_con_recargo', 10, 2)->nullable()->after('recargo_monto');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plan_pago_tarjeta_id');
            $table->dropColumn(['plan_pago_nombre', 'plan_pago_cuotas', 'recargo_porcentaje', 'recargo_monto', 'total_con_recargo']);
        });
    }
};
