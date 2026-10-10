<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $ids = DB::table('resenas')->select('id', 'texto')->get()
            ->filter(fn (object $resena) => trim((string) $resena->texto) === '')
            ->pluck('id');

        DB::table('resenas')->whereIn('id', $ids)->delete();
    }

    public function down(): void
    {
        // Las opiniones eliminadas por pedido del usuario no se restauran.
    }
};
