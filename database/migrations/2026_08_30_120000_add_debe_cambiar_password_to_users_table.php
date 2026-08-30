<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Un vendedor creado desde el panel de Usuarios arranca en `true`: la
            // contraseña que le puso el admin es temporal y, en su primer ingreso,
            // se lo obliga a definir su propia clave antes de poder navegar a
            // ningún otro lado. Ver App\Http\Middleware\RequerirCambioDePassword y
            // App\Http\Controllers\Auth\ConfigurarPasswordController.
            $table->boolean('debe_cambiar_password')->default(false)->after('sucursal');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('debe_cambiar_password');
        });
    }
};
