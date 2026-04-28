<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Producto;
use App\Models\Subcategoria;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProductoSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $productos = [
            // ── 10 DESTACADOS ───────────────────────────────────────────────
            [
                'titulo'       => 'Chispero Pro V2 Elite',
                'descripcion'  => '<p>Máquina de chispas frías para uso profesional. Sin olor y segura para interiores. Ideal para bodas, fiestas y espectáculos.</p><ul><li>Altura de chispa: hasta 4 metros</li><li>Control DMX incluido</li><li>Apta para uso indoor</li></ul>',
                'precio'       => 450000,
                'is_active'    => true,
                'is_featured'  => true,
                'categorias'   => ['Chispas frias'],
                'subcategorias'=> ['4x30'],
            ],
            [
                'titulo'       => 'Canyon Jet CO2 Pro',
                'descripcion'  => '<p>Pistola portátil de alto alcance para festivales y eventos masivos. Disparo de cryo fog de hasta 6 metros.</p><ul><li>Gatillo ergonómico</li><li>Compatible con cilindros de CO2 estándar</li></ul>',
                'precio'       => 280000,
                'is_active'    => true,
                'is_featured'  => true,
                'categorias'   => ['Maquinaria'],
                'subcategorias'=> ['Pistola'],
            ],
            [
                'titulo'       => 'Máquina de Humo DMX 1500W',
                'descripcion'  => '<p>Potente máquina de humo vertical con control DMX. Perfecta para escenarios, teatro y producciones audiovisuales.</p><ul><li>Potencia: 1500W</li><li>Depósito de 2 litros</li><li>Calentamiento en 5 minutos</li></ul>',
                'precio'       => 350000,
                'is_active'    => true,
                'is_featured'  => true,
                'categorias'   => ['Maquinaria', 'Humo'],
                'subcategorias'=> ['Humo vertical'],
            ],
            [
                'titulo'       => 'Batería 32 Tiros Premium',
                'descripcion'  => '<p>Batería de fuegos artificiales de 32 tiros de calibre profesional. Efectos variados: palmeras, serpentinas y estrellas de colores.</p><ul><li>32 disparos</li><li>Duración: 45 segundos</li><li>Calibre 30mm</li></ul>',
                'precio'       => 250000,
                'is_active'    => true,
                'is_featured'  => true,
                'categorias'   => ['Fuegos Artificiales'],
                'subcategorias'=> ['32 Tiros'],
            ],
            [
                'titulo'       => 'Detonador Inalámbrico Pro 8 Canales',
                'descripcion'  => '<p>Sistema de disparo inalámbrico de 8 canales con alcance de hasta 200 metros. Incluye receptor y transmisor.</p><ul><li>8 canales independientes</li><li>Alcance: 200m</li><li>Batería de 12V recargable</li></ul>',
                'precio'       => 180000,
                'is_active'    => true,
                'is_featured'  => true,
                'categorias'   => ['Maquinaria'],
                'subcategorias'=> ['Detonador Inalambrico'],
            ],
            [
                'titulo'       => 'Kit Chispas Frías 5x1 Pack Evento',
                'descripcion'  => '<p>Pack de 5 unidades de chispas frías de formato 5x1. Ideal para entradas de novios y momentos cúlmine del evento.</p><ul><li>5 unidades incluidas</li><li>Duración: 60 segundos c/u</li><li>Sin humo residual</li></ul>',
                'precio'       => 95000,
                'is_active'    => true,
                'is_featured'  => true,
                'categorias'   => ['Chispas frias'],
                'subcategorias'=> ['5x1'],
            ],
            [
                'titulo'       => 'Lanzallama Escénico Profesional',
                'descripcion'  => '<p>Lanzallama de efecto escénico controlado. Llama de hasta 3 metros de altura. Para uso exclusivo por técnicos certificados.</p><ul><li>Llama controlada de 1 a 3 metros</li><li>Válvula de seguridad incluida</li><li>Uso profesional únicamente</li></ul>',
                'precio'       => 520000,
                'is_active'    => true,
                'is_featured'  => true,
                'categorias'   => ['Maquinaria'],
                'subcategorias'=> ['Lanzallama'],
            ],
            [
                'titulo'       => 'Set Pirotecnia Espectáculo Completo',
                'descripcion'  => '<p>Set completo para espectáculos de pirotecnia. Incluye variedad de efectos coordinados para una presentación de 5 minutos.</p><ul><li>Efectos variados incluidos</li><li>Manual de configuración</li><li>Soporte técnico incluido</li></ul>',
                'precio'       => 380000,
                'is_active'    => true,
                'is_featured'  => true,
                'categorias'   => ['Pirotecnia'],
                'subcategorias'=> ['Pirotecnia'],
            ],
            [
                'titulo'       => 'Bastón de Mano Chispas Frías',
                'descripcion'  => '<p>Bastón portátil de chispas frías para animadores y artistas. Fácil de usar, seguro y de gran impacto visual.</p><ul><li>Duración: 90 segundos</li><li>No requiere instalación</li><li>Apto para uso en mano</li></ul>',
                'precio'       => 75000,
                'is_active'    => true,
                'is_featured'  => true,
                'categorias'   => ['Chispas frias', 'Maquinaria'],
                'subcategorias'=> ['Baston de Mano'],
            ],
            [
                'titulo'       => 'Sparkie Premium Pack x10',
                'descripcion'  => '<p>Pack de 10 sparkies premium para celebraciones y brindis. Alta luminosidad y sin humo excesivo.</p><ul><li>10 unidades</li><li>Duración: 3 minutos c/u</li><li>Temperatura baja al tacto</li></ul>',
                'precio'       => 35000,
                'is_active'    => true,
                'is_featured'  => true,
                'categorias'   => ['Velas'],
                'subcategorias'=> ['Sparkie'],
            ],

            // ── 10 NO DESTACADOS ────────────────────────────────────────────
            [
                'titulo'       => 'Chispas Frías 2x20 Unidad',
                'descripcion'  => '<p>Chispas frías de formato 2x20 para uso individual en ceremonias íntimas. Fácil encendido con mecha.</p>',
                'precio'       => 55000,
                'is_active'    => true,
                'is_featured'  => false,
                'categorias'   => ['Chispas frias'],
                'subcategorias'=> ['2x20'],
            ],
            [
                'titulo'       => 'Chispas Frías 3x30 Unidad',
                'descripcion'  => '<p>Formato 3x30 con mayor altura y duración que el modelo estándar. Ideal para eventos medianos.</p>',
                'precio'       => 70000,
                'is_active'    => true,
                'is_featured'  => false,
                'categorias'   => ['Chispas frias'],
                'subcategorias'=> ['3x30'],
            ],
            [
                'titulo'       => 'Chispas Frías con Mecha',
                'descripcion'  => '<p>Versión con mecha de seguridad para encendido manual a distancia. Sin necesidad de detonador eléctrico.</p>',
                'precio'       => 40000,
                'is_active'    => true,
                'is_featured'  => false,
                'categorias'   => ['Chispas frias'],
                'subcategorias'=> ['con mecha'],
            ],
            [
                'titulo'       => 'Batería 9 Tiros Colores',
                'descripcion'  => '<p>Batería de fuegos artificiales de 9 tiros con efectos de colores variados. Excelente para jardines y eventos al aire libre.</p>',
                'precio'       => 120000,
                'is_active'    => true,
                'is_featured'  => false,
                'categorias'   => ['Fuegos Artificiales'],
                'subcategorias'=> ['9 Tiros'],
            ],
            [
                'titulo'       => 'Batería 16 Tiros Estrellas',
                'descripcion'  => '<p>16 disparos con efecto estrella y cascada. Perfecta relación calidad-precio para eventos privados.</p>',
                'precio'       => 150000,
                'is_active'    => true,
                'is_featured'  => false,
                'categorias'   => ['Fuegos Artificiales'],
                'subcategorias'=> ['16 Tiros'],
            ],
            [
                'titulo'       => 'Bengala de Humo Coloreada',
                'descripcion'  => '<p>Bengala de humo de colores para sesiones fotográficas, eventos y producciones. Disponible en rojo, azul, verde y amarillo.</p>',
                'precio'       => 15000,
                'is_active'    => true,
                'is_featured'  => false,
                'categorias'   => ['Humo'],
                'subcategorias'=> ['Bengala'],
            ],
            [
                'titulo'       => 'Pote de Humo Denso 60s',
                'descripcion'  => '<p>Pote de humo denso con 60 segundos de emisión continua. Ideal para fondos fotográficos y escenas dramáticas.</p>',
                'precio'       => 22000,
                'is_active'    => true,
                'is_featured'  => false,
                'categorias'   => ['Humo'],
                'subcategorias'=> ['Pote'],
            ],
            [
                'titulo'       => 'Torta de Humo Profesional',
                'descripcion'  => '<p>Gran torta de humo para efectos de escena de larga duración. Cobertura de área amplia en poco tiempo.</p>',
                'precio'       => 45000,
                'is_active'    => true,
                'is_featured'  => false,
                'categorias'   => ['Humo'],
                'subcategorias'=> ['Torta'],
            ],
            [
                'titulo'       => 'Bengalas de Celebración x5',
                'descripcion'  => '<p>Pack de 5 bengalas de celebración de alta luminosidad. Perfectas para festejos, cumpleaños y brindis especiales.</p>',
                'precio'       => 18000,
                'is_active'    => true,
                'is_featured'  => false,
                'categorias'   => ['Velas'],
                'subcategorias'=> ['Bengalas'],
            ],
            [
                'titulo'       => 'Líquido de Humo High-Density 5L',
                'descripcion'  => '<p>Líquido de humo de alta densidad compatible con la mayoría de máquinas del mercado. Efecto persistente y limpio.</p><ul><li>Volumen: 5 litros</li><li>Sin olor residual</li><li>Alta persistencia del efecto</li></ul>',
                'precio'       => 45000,
                'is_active'    => true,
                'is_featured'  => false,
                'categorias'   => ['Maquinaria', 'Humo'],
                'subcategorias'=> [],
            ],
        ];

        foreach ($productos as $data) {
            $producto = Producto::create([
                'titulo'      => $data['titulo'],
                'descripcion' => $data['descripcion'],
                'precio'      => $data['precio'],
                'is_active'   => $data['is_active'],
                'is_featured' => $data['is_featured'],
            ]);

            // Asignar categorías
            $categoriaIds = Categoria::whereIn('nombre', $data['categorias'])->pluck('id');
            $producto->categorias()->sync($categoriaIds);

            // Asignar subcategorías
            if (!empty($data['subcategorias'])) {
                $subcategoriaIds = Subcategoria::whereIn('nombre', $data['subcategorias'])->pluck('id');
                $producto->subcategorias()->sync($subcategoriaIds);
            }
        }
    }
}
