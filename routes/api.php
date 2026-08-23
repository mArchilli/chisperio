<?php

use App\Http\Controllers\CodigoDescuentoValidacionController;
use App\Http\Controllers\TiendaController;
use Illuminate\Support\Facades\Route;

Route::get('/productos/{producto}/precio', [TiendaController::class, 'precio'])->name('api.productos.precio');

Route::post('/codigos-descuento/validar', [CodigoDescuentoValidacionController::class, 'validar'])->name('api.codigos-descuento.validar');
