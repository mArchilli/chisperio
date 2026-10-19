<?php

/*
|--------------------------------------------------------------------------
| Límites de requests (throttle) de los endpoints públicos
|--------------------------------------------------------------------------
|
| Cuántas peticiones por minuto, por IP, acepta cada endpoint público antes de
| responder 429. Se definen como limitadores con nombre en AppServiceProvider y se
| aplican con `throttle:checkout` / `throttle:validar-cupon` en las rutas.
|
| Valores razonables: un cliente real hace un puñado de intentos por minuto (confirmar
| el pedido, aplicar un código). Subilos si varias personas comparten una misma IP
| (una oficina, un local) y empiezan a toparse con el límite.
|
*/

return [
    // POST /checkout — crea un pedido (y descuenta stock).
    'checkout_por_minuto' => (int) env('THROTTLE_CHECKOUT_POR_MINUTO', 10),

    // POST /api/codigos-descuento/validar — evita enumerar códigos de descuento.
    'validar_cupon_por_minuto' => (int) env('THROTTLE_VALIDAR_CUPON_POR_MINUTO', 30),

    // Mensaje que ve el cliente al superar el límite.
    'mensaje' => 'Esperá un momento y probá de nuevo.',
];
