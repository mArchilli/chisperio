<?php

use App\Enums\RolUsuario;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Default 'vendedor' (mínimo privilegio) como piso de seguridad para cualquier
            // alta que no pase por el formulario de Usuarios (Fase 2) y no especifique rol.
            $table->string('role')->default(RolUsuario::Vendedor->value)->after('password');
        });

        // Backfill: todo usuario que ya existía antes de este rol tenía, de hecho, acceso
        // total (no había distinción). Ninguno debe perder acceso al correr esta migración.
        DB::table('users')->update(['role' => RolUsuario::Admin->value]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
