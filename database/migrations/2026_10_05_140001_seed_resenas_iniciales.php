<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Carga las 10 reseñas de Google que estaban escritas a mano en la landing
     * (ReviewsSection.jsx), para que desde ahora se gestionen desde el panel.
     *
     * Eran textos relativos ("Hace un mes"), así que las fechas son aproximadas, y
     * respetan el orden original: 1-6 "hace un mes", 7-9 "hace 2 meses", 10 "hace 3 meses".
     * Va en una migración (y no en un seeder) para que llegue a todos los entornos con
     * `php artisan migrate`. No hace nada si la tabla ya tiene reseñas.
     */
    public function up(): void
    {
        if (DB::table('resenas')->exists()) {
            return;
        }

        $ahora = now();

        $resenas = [
            ['daniel Morales', '2 opiniones · 6 fotos', '2026-09-05', '#1a73e8', 'Excelente atención pedido llego a tiempo y forma ,pactado..recomendables siempre!!.gracias'],
            ['Sonitus Sonido', '1 opinión', '2026-09-04', '#d93025', "Excelente atención, te brindan asesoramiento para hacer la compra correcta, y en 5 día ya tenía el producto.\nRecomiendo al 100%."],
            ['ale Gutiérrez', 'Local Guide · 28 opiniones · 12 fotos', '2026-09-03', '#188038', "Muy lindo muy recomendable no dejen que su fiesta le falte chisperio,\nhablar con Julián que te aconseja de la mejor manera"],
            ['omar grecco', '4 opiniones', '2026-09-02', '#f29900', 'compre una consola de 6 bases .... todo perfecto atencion y tiempo de entrega , todo impecable. omar de deep blue pirotecnia'],
            ['Hernan Kohan', '2 opiniones', '2026-09-01', '#9334e6', 'Excelente todo,buena atencion telefonica y personalmente tambien.'],
            ['Alejandra Ramacciotti', '3 opiniones · 1 foto', '2026-08-31', '#007b83', 'Excelente las chispas . Resalta la entrada de la quinceañera . Cumplen con todo .Excelente los recomiendo 100%'],
            ['Marcelo Alonso', 'Local Guide · 135 opiniones · 340 fotos', '2026-08-05', '#185abc', '10 puntos llego todo bien y rapido . Muchas Gracias 🫂'],
            ['Daiana Rocha', '1 opinión', '2026-08-04', '#c2185b', 'Llego a tiempo mi pedido ! Y la atencion excelente! Gracias! Voy a volver a comprar'],
            ['EDUARDO MARTIN PAIGES', '1 foto', '2026-08-03', '#e37400', 'Excelente atención y muy buen asesoramiento. El pedido llegó rápido, en perfectas condiciones y todo funcionó impecable. Muy recomendables.'],
            ['Marcos Buet', '10 opiniones · 6 fotos', '2026-07-05', '#3f51b5', "Exelente atención, muy conformes con todo, desde las consultas hasta la entrega del producto!\nSuper recomendable!!!"],
        ];

        DB::table('resenas')->insert(array_map(fn (array $r) => [
            'nombre' => $r[0],
            'meta' => $r[1],
            'fecha' => $r[2],
            'color_avatar' => $r[3],
            'texto' => $r[4],
            'puntuacion' => 5,
            'is_active' => true,
            'created_at' => $ahora,
            'updated_at' => $ahora,
        ], $resenas));
    }

    public function down(): void
    {
        // Las reseñas viven en la tabla, que borra create_resenas_table al hacer rollback.
    }
};
