<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'configuracionEnvio' => [
                'montoMinimo' => fn () => (float) \App\Models\ConfiguracionEnvio::obtener()->monto_minimo,
            ],
            // Compartido globalmente (mismo criterio que configuracionEnvio) porque el
            // simulador de recargo se usa en la ficha de producto y, en el paso
            // siguiente, también en Carrito/Checkout sobre el total completo del pedido.
            'planesPagoTarjeta' => fn () => \App\Models\PlanPagoTarjeta::activos()
                ->get(['id', 'nombre', 'cuotas', 'recargo_porcentaje'])
                ->map(fn ($plan) => [
                    'id' => $plan->id,
                    'nombre' => $plan->nombre,
                    'cuotas' => $plan->cuotas,
                    'recargo_porcentaje' => (float) $plan->recargo_porcentaje,
                ]),
        ];
    }
}
