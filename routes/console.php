<?php

use App\Rukoz\EspejoStock;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Tareas programadas
|--------------------------------------------------------------------------
|
| Acá se registran las tareas periódicas con Schedule::command(...) /
| Schedule::call(...). Con la integración apagada no se programa ninguna de las de abajo
| (`php artisan schedule:list` lo confirma); las del paquete (rukoz:*) las registra el propio
| paquete con RUKOZ_INTEGRACION=true.
|
| Para que se ejecuten, el hosting tiene que correr el scheduler de Laravel cada
| minuto con este cron (ajustar la ruta del proyecto y el binario de PHP):
|
|     * * * * * php /ruta/al/proyecto/artisan schedule:run >> /dev/null 2>&1
|
*/

// 11.3 — Las reservas del Central no vencen: un pedido que nadie confirma deja el stock apartado para siempre. Cada hora se
// cancelan (en el Central y en la web) las que llevan más de PEDIDOS_CANCELAR_DIAS días sin confirmar. Solo toca pedidos con
// `rukoz_ref`; si no hay ninguno, es una sola consulta.
Schedule::command('chisperio:cancelar-reservas-viejas')
    ->hourly()
    ->withoutOverlapping()
    ->when(fn () => (bool) config('rukoz.habilitada'));

// 11.3 — Red de seguridad del espejo: una vez por día se vuelcan a las columnas de stock TODO lo que hay en `rukoz_stock`
// (sin llamar al Central; `rukoz:sync-stock` ya reconcilia el caché cada hora). Corrige una columna que hubiera quedado atrás.
Schedule::command('chisperio:stock-cargar', ['--local'])
    ->dailyAt('03:45')
    ->withoutOverlapping()
    ->when(fn () => EspejoStock::activo());
