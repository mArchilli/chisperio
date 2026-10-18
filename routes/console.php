<?php

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
| Schedule::call(...). Hoy NO hay ninguna registrada: esto solo deja el scheduler
| listo (php artisan schedule:list lo confirma).
|
| Para que se ejecuten, el hosting tiene que correr el scheduler de Laravel cada
| minuto con este cron (ajustar la ruta del proyecto y el binario de PHP):
|
|     * * * * * php /ruta/al/proyecto/artisan schedule:run >> /dev/null 2>&1
|
| Ejemplo (no activo):
|
|     Schedule::command('mi:comando')->everyFiveMinutes()->withoutOverlapping();
|
*/
