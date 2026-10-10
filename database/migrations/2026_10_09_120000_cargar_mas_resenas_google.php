<?php

use App\Models\Resena;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Opiniones de Google compartidas el 09/10/2026, sin fotos ni respuestas del propietario.
     * Las fechas son aproximadas a partir de "Hace N meses/años" en esa fecha fija.
     * Solo se incluyen opiniones con texto y se conserva el contenido original.
     */
    public function up(): void
    {
        $resenas = [
            ['heber abrego', '1 opinión', '2026-04-09', 'La atención es espectacular y a es la 9 compra que realizó tanto en mercado libre como en el face los productos llegan a tiempo y en perfectas condiciones'],
            ['matias melo', '7 opiniones', '2026-03-09', 'Compré unas chispas frías y quiero destacar la excelente atención que me brindaron desde el primer momento. Respondieron todas mis dudas rápido, el envío llegó en tiempo y forma, y el producto en perfectas condiciones. Muy recomendable, seguro vuelvo a comprar. ✨'],
            ['Abraham Panelo', '4 opiniones', '2026-03-09', 'Exelente producto! Confiable! Y en tiempo y forma! Supero mis expectativas! Desde el envoltorio hasta ver el producto! La verdad he quedado fascinado! Soy de Mendoza! Muchas gracias chisperio❤️'],
            ['Marìa Belèn', '4 opiniones', '2026-03-09', "Excelente atención... Las chispas x 6 llegaron a Tandil en tiempo y forma.\nAl momento de usarlas funcionaron perfecto!!\nGracias por todo, que tengan un excelente año?"],
            ['J&J SONIDOS NEUQUEN', '3 opiniones', '2026-03-09', 'Excelente calidad y muy atento el vendedor . Genio'],
            ['Anto Valenzuela', 'Local Guide · 34 opiniones', '2026-03-09', 'Muy buena y ágil la atención, el envío muy rápido y llegó todo en condiciones 🤗 hasta Cinco Saltos, Río Negro. Muy recomendable!!'],
            ['Sonia Peñalva', '4 opiniones', '2026-02-09', 'Excelente atención y entrega super rápida gracias'],
            ['DJ Vasko Ormart', '2 opiniones', '2026-02-09', 'Excelente atención, producto y envío.. Todo más que bien, son súper recomendables !!'],
            ['Estre Ali', '2 opiniones', '2026-02-09', 'Hola buenas tarde ayer retire mi pedido muchas gracias. Y x la atención ☆☆☆☆☆'],
            ['Santiago hernan Vicente', '4 opiniones', '2026-02-09', 'Excelente atención de Agustín...llegó todo tal cual lo pedí con envío hasta Resistencia Chaco. Recomendable al 100 %'],
            ['lucas aráoz', '2 opiniones', '2026-02-09', 'Excelente atención y rapidez en el envío, buen precio! Volveré a comprar!'],
            ['Gabriela Caramia', '1 opinión', '2026-02-09', 'Buenas tardes,hoy retiré el pedido,todo impecable llegó,excelente la atención y explicación,entrega súper rápida.Son muy recomendables'],
            ['Ludmila Montenegro', '3 opiniones', '2026-02-09', 'Excelente, todo muy lindo, muy recomendado'],
            ['jesica colombo', '4 opiniones', '2025-12-09', 'Execelente atención! Los productos llegaron bien en tiempo y forma! Que sigan los éxitos!'],
            ['Celeste Marcos', 'Local Guide · 15 opiniones', '2025-12-09', 'Excelente atención en el sector de ventas por parte del Sr. Agustín. La mercadería es de muy buena calidad y los operadores que nos atendieron fueron súper atentos. Muy conforme con todo'],
            ['Sonia Mabel Benitez Ruiz', '2 opiniones', '2025-11-09', 'Excelente atención y servicio super recomendables.'],
            ['Roquinho Dj', '4 opiniones', '2025-11-09', 'Buen servicio,buena atención y sobretodo tal cual lo que compré!!!! Súper recomendables!!!!'],
            ['Emily Ugarte', '1 opinión', '2025-11-09', 'Un éxito la atención y la rapidez que llega el pedido 👌'],
            ['Elizabeth Molina', '2 opiniones', '2025-11-09', 'Realmente unos genios los chicos, responden enseguida y mucha responsabilidad al momento del envío !!! Gracias chisperio!!'],
            ['Diego Iatrino', '4 opiniones', '2025-11-09', 'Excelente servicio de atencion, estuvieron atentos a cada necesidad que tuve y siguieron el envio de los productos junto conmigo. Super recomendables.'],
            ['Agostina Melisa Leal', '1 opinión', '2025-10-09', 'Súper recomendable, excelente vendedor, rapidísimo con la entrega. Estamos muy satisfechos con la compra'],
            ['Jose miguel Orozco', '5 opiniones', '2025-10-09', '100 % recomendables .soy de las personas que todavía desconfía de comprar por Internet. Esta gente se preocupo en cada momento de que llegará el producto la verdad q muy recomendables'],
            ['jesus gordillo', 'Local Guide · 33 opiniones', '2025-10-09', "Unos genios atención rápida , compre chispas frías me llegaron en tiempo y forma super recomendable ✨\na estrenar estas chispas 🧨! 🥳\n@Jparty360"],
            ['Joaquin', '4 opiniones', '2025-10-09', 'El producto llego en tiempo y forma, funciono bien en mi boliche'],
            ['Lucila Flores', '7 opiniones', '2025-10-09', '¡Gracias Chisperio por hacer que mi fiesta sea ÚNICA! Gracias Agustín por tanta amabilidad y buena atención a la hora de ofrecerme los diferentes servicios. Lo súper recomiendo. Entrega en tiempo y forma, todo en excelente condiciones.'],
            ['Eugenia Soriasbernj', '2 opiniones', '2025-10-09', "Excelente servicio.\nTodo entregado en tiempo y forma.\nSoy de Santiago del estero y los contacte por redes. Super confiables"],
            ['Maria Lourdes Moyano', '8 opiniones', '2025-10-09', 'Excelente servicio de los chicos. !!! Impecable .'],
            ['yesica castel', '2 opiniones', '2025-10-09', "La atención que tienen es exelente y muy responsables\nMis productos llegaron re bien ☺️"],
            ['Gise Figueroa', '4 opiniones', '2025-10-09', 'Excelente servicio , un detalle unico'],
            ['Paola', '3 opiniones', '2025-10-09', 'Te asesoran en qué momento poner las chispas para que tu evento y vos brillen✨✨súper responsables los recomiendo al 1.000🥳🥳'],
            ['Gorru2', '1 opinión', '2025-10-09', 'Todos los productos y servicios de excelencia. Nosotros en particular utilizamos pistolas de chispas frías y chispas de 2 metros x 20" y todo mas que bien. Gracias por la excelente atención de siempre. saludos'],
            ['Gustavo Ezequiel Zalasar', 'Local Guide · 12 opiniones', '2025-10-09', 'Simplemente excelente'],
            ['Oscar Bazan', '1 opinión', '2025-10-09', 'Excelente atención. Muy amables todos!'],
            ['Luciano Bobrowski', 'Local Guide · 19 opiniones', '2025-10-09', 'Un lujo la atencion, el detalle en el seguimiento del envio al interior y la facilidad para comprar. Queda probar el producto en el que seguramente tendremos la misma calidad que en la atencion'],
            ['sil 2907 González', 'Local Guide · 10 opiniones', '2025-10-09', 'Excelente atención y un maravilloso servicio muy pero muy recomendable !'],
            ['ERNESTO SALTO', '1 opinión', '2025-10-09', 'Muchas gracias 👌 Excelente todo, llego lo más rápido posible.'],
            ['Gladys Barriinuevo', '1 opinión', '2025-10-09', 'Gracias!!! Es la primera vez q compro por este medio ..reconfiables gracias!!'],
            ['alejandro daniel borda', '3 opiniones', '2024-10-09', '100% recomendables excelente atencion'],
            ['Pedro Piromalli', '8 opiniones', '2024-10-09', 'Los productos nunca fallaron la entrega se cumplió en tiempo y forma. Y el trato muy cordial. Recomendable.'],
            ['Alejandro Córdoba', '1 opinión', '2024-10-09', 'Excelente siempre'],
            ['Alternativa Dolores', 'Local Guide · 55 opiniones', '2024-10-09', 'Compré por Whatsapp, pague por transferencia. Me dieron envío gratis porque superé cierto monto. Cumplieron con todo, llego rapidísimo y bien. Productos de buena calidad. Excelente atención.'],
            ['Federico Londero', '2 opiniones', '2024-10-09', 'Excelente atención y asesoramiento. Super conforme'],
            ['Maicol Riquelme', '3 opiniones', '2024-10-09', 'Exelente atención, promos, y exelente calidad'],
            ['renzo libardi', '2 opiniones', '2024-10-09', 'Excelentes productos y buena atención 100% recomendable'],
            ['dda23', '2 opiniones', '2024-10-09', 'Muy buenos productos, buena atención y servicio. Recomiendo.'],
            ['Fabian Castro', '2 opiniones', '2024-10-09', 'Muy buenos productos, ya e comprado varias veces y muy bueno todo'],
            ['Hugo Sanchez', '1 opinión', '2024-10-09', 'atención espectacular, muy atento, amable y sobre todo responsable, exelente productos jamas un problema !'],
            ['Carla Catini', '5 opiniones', '2024-10-09', 'Excelente atención realmente increíbles !!! Muy buenos productos!'],
            ['Leandro Manteca Martinez', 'Local Guide · 23 opiniones', '2024-10-09', "Desde el momento que me contacte por primera vez me atendieron de 10\nLos productos un lujo en conjunto con su costo\nSolo palabras de agradecimiento por el cumplimiento en tiempo y forma con los despachos\nUnos fenómenos"],
            ['Luis cardales matos', '7 opiniones', '2024-10-09', 'Soy full cliente y los productos son muy buenos la atención es de 10 se los recomiendo'],
            ['ariel bercsenyi', 'Local Guide · 16 opiniones', '2024-10-09', 'Excelente servicio, muy recomendable!!'],
            ['Maximiliano producciones Disc jockey', 'Local Guide · 5 opiniones', '2024-10-09', 'Excelente servicio, atención y precios! Los mejores lejos, sin dudas...'],
            ['Emilio Solis', '4 opiniones', '2024-10-09', 'Excelente atencion, muy comprometidos y responsables a la hora de atender las consultas y de hacer la compra. 100% recomendable y muy de confianza. A comprar tranquilos gente!!'],
            ['Nicolas Ruiz', '3 opiniones', '2024-10-09', 'todo ok, compré varias y funcionaron perfecto! llegaron en tiempo y forma'],
            ['Leonardo Lepore', '3 opiniones', '2024-10-09', 'Excelente servicio, calidad de productos y por sobre todas las cosas responsabilidad, muy accesibles y nunca he tenido problemas, impecables.'],
            ['Diego Armoa', '6 opiniones', '2024-10-09', 'Buenísimos los productos, no fallo ninguno, son súper baratos y llegaron rápido. Recomendable 100x100'],
            ['Jema Borget', '1 opinión', '2024-10-09', 'La verdad un éxito desde la atencion hasta los productos una masa gracias'],
            ['diego leonardo Franco', '7 opiniones', '2024-10-09', 'Muy buenos sus productos, todos funcionaron de mil maravillas super económicos y la entrega mucho más rápida. Recomiendo y espero puedan comprobar que los productos y la atención muy pero muy buena!!!'],
            ['Camilo Quiroz', 'Local Guide · 16 opiniones', '2024-10-09', 'Muy agradecido con ustedes, por su puntualidad y su profesionalismo, recomendados 100%'],
            ['Emiliano Roldán “Emi.liano__”', '2 opiniones', '2024-10-09', 'Increíble sus productos, ninguno falló, barato y llegaron rápido. Lo recomiendo a todo el mundo!'],
            ['Daniel Giovinazzo', 'Local Guide · 41 opiniones', '2024-10-09', 'Excelente atención y muy buenos los productos. Altamente recomendable por todo concepto. Muchas Gracias'],
            ['JIP Ojeda (DJ PILY)', '1 opinión', '2024-10-09', "Exelentes !!!\nCompré varias veces y todas funcionaron perfecto."],
            ['Mario Pascua', '2 opiniones', '2024-10-09', 'Excelente productos excelente atención envíos rápidos remill recomendado'],
            ['Martin R', '5 opiniones', '2024-10-09', 'Excelente servicio ..las chispas de diez !!!!!'],
            ['Pablo Rubio', 'Local Guide · 62 opiniones', '2024-10-09', 'Excelente la atención. Y Muy buena variedad de productos. En lo personal, las chispas estuvieron excelentessss. Recomendablee'],
            ['Nelson Rubio', 'Local Guide · 10 opiniones', '2024-10-09', 'Excelentes productos todo lo que ofrecen. Rápido envío, un servicio recomendable.'],
        ];

        $ahora = now();

        DB::transaction(function () use ($resenas, $ahora): void {
            // La landing ordena por fecha e id descendentes: insertar al revés conserva
            // el orden del texto pegado entre opiniones con la misma fecha aproximada.
            foreach (array_reverse($resenas) as [$nombre, $meta, $fecha, $texto]) {
                // Conserva las existentes, incluyendo las que ya fueron editadas u ocultadas.
                if (DB::table('resenas')->where('nombre', $nombre)->exists()) {
                    continue;
                }

                DB::table('resenas')->insert([
                    'nombre' => $nombre,
                    'meta' => $meta,
                    'fecha' => $fecha,
                    'texto' => $texto,
                    'puntuacion' => 5,
                    'color_avatar' => Resena::colorPorDefecto($nombre),
                    'is_active' => true,
                    'created_at' => $ahora,
                    'updated_at' => $ahora,
                ]);
            }
        });
    }

    public function down(): void
    {
        // Como en la carga inicial, se conservan los datos gestionables desde el panel.
    }
};
