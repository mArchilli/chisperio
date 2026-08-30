<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Solo aplica a vendedores: define qué pedidos ve/gestiona. El admin
            // no tiene sucursal (ve todas). Nullable y sin backfill: los usuarios
            // que ya existen son todos admin (ver migración add_role_to_users_table).
            $table->string('sucursal')->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('sucursal');
        });
    }
};
