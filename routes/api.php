<?php

use App\Http\Controllers\TiendaController;
use Illuminate\Support\Facades\Route;

Route::get('/productos/{producto}/precio', [TiendaController::class, 'precio'])->name('api.productos.precio');
