<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 11.4b — Punto de atención por pedido y retención del despacho. Solo columnas nuevas y nullable (aditiva): los pedidos
 * existentes quedan en NULL y el Central les aplica el punto predeterminado.
 *
 * pedidos
 *  - rukoz_punto               código del punto de atención que el Central informa para el pedido (`punto`: BA, CBA…). NULL = el
 *                              Central todavía no lo informó (pedidos anteriores a la 11.4b: rige su punto predeterminado).
 *  - rukoz_retenido_por_pago   `retenido_por_pago` del Central: la venta se confirmó con «despachar solo con pago completo» y todavía
 *                              queda saldo, así que no se despacha hasta completarlo. NULL = el Central no lo informó.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('rukoz_punto', 20)->nullable()->after('rukoz_saldo');
            $table->boolean('rukoz_retenido_por_pago')->nullable()->after('rukoz_punto');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['rukoz_punto', 'rukoz_retenido_por_pago']);
        });
    }
};
