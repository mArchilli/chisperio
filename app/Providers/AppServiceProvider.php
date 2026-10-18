<?php

namespace App\Providers;

use App\Rukoz\CatalogoDeChisperio;
use App\Rukoz\EspejoStock;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Rukoz\CoreClient\Contratos\ProveedorCatalogo;
use Rukoz\CoreClient\Eventos\StockActualizado;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Sin el interruptor del catálogo no se registra el proveedor: el paquete tampoco programa el sync diario.
        if (config('integracion.catalogo')) {
            $this->app->bind(ProveedorCatalogo::class, CatalogoDeChisperio::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $this->definirLimitadores();

        // El stock del Central se espeja en las columnas de la web solo con INTEGRACION_STOCK (11.2). Se registra a mano
        // y no en app/Listeners para que Laravel no lo descubra solo y escuche con el interruptor apagado.
        if (config('integracion.stock')) {
            Event::listen(StockActualizado::class, [EspejoStock::class, 'alActualizarse']);
        }
    }

    /**
     * Limitadores de los endpoints públicos (por IP). Los topes salen de config/limites.php
     * y se leen en cada request, no al arrancar, así se pueden cambiar sin tocar código.
     * Al superarlos responden 429 con un mensaje legible (la UI lo muestra tal cual).
     */
    private function definirLimitadores(): void
    {
        RateLimiter::for('checkout', fn (Request $request) => $this->limite(
            (int) config('limites.checkout_por_minuto'),
            $request
        ));

        RateLimiter::for('validar-cupon', fn (Request $request) => $this->limite(
            (int) config('limites.validar_cupon_por_minuto'),
            $request
        ));
    }

    private function limite(int $porMinuto, Request $request): Limit
    {
        return Limit::perMinute($porMinuto)
            ->by($request->ip())
            ->response(fn (Request $request, array $headers) => response()->json([
                'message' => config('limites.mensaje'),
            ], 429, $headers));
    }
}
