<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Ruta de almacenamiento de los PDFs de documentación
    |--------------------------------------------------------------------------
    |
    | Carpeta dentro de public/ donde se guardan los PDFs subidos para la
    | documentación de vendedores. Mismo criterio que config/productos.php.
    |
    */

    'pdf_path' => trim(env('DOCUMENTOS_PDF_PATH', '/docs/pdfs/'), '/'),

];
