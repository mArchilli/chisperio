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
|   checkout      11.3  reservar el stock en el Central al crear un pedido
|   confirmacion  11.4  confirmar la venta y recibir los estados del Central
|
*/

return [
    'catalogo' => (bool) env('INTEGRACION_CATALOGO', false),
    'stock' => (bool) env('INTEGRACION_STOCK', false),
    'checkout' => (bool) env('INTEGRACION_CHECKOUT', false),
    'confirmacion' => (bool) env('INTEGRACION_CONFIRMACION', false),
];
