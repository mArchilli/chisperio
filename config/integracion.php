<?php

/*
|--------------------------------------------------------------------------
| Integración con el Sistema Central Rukoz — interruptores de la web
|--------------------------------------------------------------------------
|
| El paquete rukoz/core-client se enciende con RUKOZ_INTEGRACION (config/rukoz.php) y
| solo habilita la COMUNICACIÓN con el Central. Cada interruptor de acá habilita una
| parte de la web, por etapa, para poder probar una sin tocar las demás (p. ej. el
| catálogo en local sin tocar el checkout). Todos apagados por defecto: en producción
| quedan en false hasta la puesta en marcha (11.5).
|
|   catalogo      11.1  mandar el catálogo (productos, variantes y combos) al Central
|   stock         11.2  espejar el stock que informa el Central
|   checkout      11.3  reservar el stock en el Central al crear un pedido (exige `stock`)
|   confirmacion  11.4  confirmar la venta y recibir los estados del Central
|
| `checkout` solo vale con `stock` y RUKOZ_INTEGRACION encendidos (App\Rukoz\CheckoutCentral::activo()):
| si no, el checkout NO usa el Central, queda un warning en el log y `chisperio:integracion-estado` lo informa.
|
*/

return [
    'catalogo' => (bool) env('INTEGRACION_CATALOGO', false),
    'stock' => (bool) env('INTEGRACION_STOCK', false),
    'checkout' => (bool) env('INTEGRACION_CHECKOUT', false),
    'confirmacion' => (bool) env('INTEGRACION_CONFIRMACION', false),

    /*
    | 11.3 — qué pasa si el Central no responde al reservar (caído, timeout o circuito abierto).
    | false (por defecto): NO se vende sin reserva. El pedido no se crea y el cliente ve un mensaje amable con el botón de
    | WhatsApp. true: el pedido se crea igual, sin `rukoz_ref`, con el stock local de siempre; el Central nunca se entera
    | de esa venta (hay que cargarla a mano). Ver App\Rukoz\CheckoutCentral::permiteVenderSinReserva().
    */
    'checkout_sin_reserva' => (bool) env('INTEGRACION_CHECKOUT_SIN_RESERVA', false),

    /*
    | 11.3 — días que un pedido con reserva puede quedar sin confirmar antes de cancelarse solo
    | (`chisperio:cancelar-reservas-viejas`). Las reservas del Central NO vencen: si la web no las cancela, el stock queda
    | apartado para siempre.
    */
    'cancelar_dias' => (int) env('PEDIDOS_CANCELAR_DIAS', 3),

    // 11.3 — durante cuántos segundos un pedido ya creado frena a un doble envío idéntico (doble clic, reintento del navegador).
    'ventana_doble_envio' => (int) env('CHECKOUT_VENTANA_DOBLE_ENVIO', 120),
];
