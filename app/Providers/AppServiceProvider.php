<?php

namespace App\Providers;

use App\Models\Pedido;
use App\Rukoz\CatalogoDeChisperio;
use App\Rukoz\CheckoutCentral;
use App\Rukoz\ConfirmacionDeVenta;
use App\Rukoz\EspejoStock;
use App\Rukoz\EstadoDesdeCentral;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Rukoz\CoreClient\Compensaciones\Compensacion;
use Rukoz\CoreClient\Contratos\ProveedorCatalogo;
use Rukoz\CoreClient\Eventos\CompensacionResuelta;
use Rukoz\CoreClient\Eventos\PedidoActualizado;
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

        // 11.4 — Los estados que informa el Central (confirmado, empaquetado, despachado, retirado, anulado, reserva liberada) se
        // reflejan en el pedido de la web solo con INTEGRACION_CONFIRMACION. El listener del genérico `PedidoActualizado` recibe el
        // estado completo con la regla de versión del paquete ya aplicada, y es idempotente. Registrado a mano (no en
        // app/Listeners) para que Laravel no lo descubra solo con el interruptor apagado.
        if (ConfirmacionDeVenta::activa()) {
            Event::listen(PedidoActualizado::class, [EstadoDesdeCentral::class, 'alActualizarse']);
        }

        // 11.3 — Combinación inválida (checkout sin stock o sin integración): el checkout no usa el Central y queda el aviso.
        CheckoutCentral::advertir();

        // 11.3 — Cuando el paquete logra cancelar en el Central una reserva que había quedado en compensaciones, el pedido
        // local (ya cancelado) pasa de `cancelacion_pendiente` a `cancelado`. Corre dentro de la transacción del paquete: solo
        // una escritura local.
        // Se registra siempre: el evento solo existe con la integración encendida y la escritura solo toca pedidos esperando.
        Event::listen(CompensacionResuelta::class, function (CompensacionResuelta $evento) {
            if ($evento->tipo !== Compensacion::CANCELAR) {
                return;
            }

            Pedido::query()
                ->where('rukoz_ref', $evento->ref)
                ->where('rukoz_estado', Pedido::RESERVA_CANCELACION_PENDIENTE)
                ->update(['rukoz_estado' => Pedido::RESERVA_CANCELADA]);
        });
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
