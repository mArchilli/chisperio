<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Rutas de almacenamiento de media de productos
    |--------------------------------------------------------------------------
    |
    | Carpetas dentro de public/ donde se guardan las imágenes y videos
    | subidos para los productos. Se definen desde el .env para poder
    | cambiarlas por entorno sin tocar código.
    |
    */

    'img_path' => trim(env('PRODUCTOS_IMG_PATH', '/productos/img/'), '/'),

    'video_path' => trim(env('PRODUCTOS_VIDEO_PATH', '/productos/videos/'), '/'),

];
