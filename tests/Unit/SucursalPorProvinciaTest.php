<?php

namespace Tests\Unit;

use App\Enums\Sucursal;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * 11.4b — La regla provincia → sucursal que el checkout ya usaba (`PROVINCIAS_POR_SUCURSAL` de `whatsapp.js`) ahora vive en
 * `resources/data/provincias-por-sucursal.json` y el servidor la lee con `Sucursal::paraProvincia`. Los casos son LA REGLA
 * ORIGINAL (las diez provincias de Córdoba y todas las demás de la lista del checkout a Buenos Aires): si alguien cambia el
 * JSON, el reparto cambia y estos tests lo dicen.
 */
class SucursalPorProvinciaTest extends TestCase
{
    /** Las provincias tal cual las lista `Checkout.jsx`. */
    private const PROVINCIAS_DEL_CHECKOUT = [
        'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos',
        'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis',
        'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
    ];

    /** La regla original: centro + norte + Cuyo → Córdoba. */
    private const DE_CORDOBA = ['Córdoba', 'Santiago del Estero', 'Tucumán', 'Salta', 'Jujuy', 'Catamarca', 'La Rioja', 'San Juan', 'San Luis', 'Mendoza'];

    public function test_buenos_aires_va_a_buenos_aires(): void
    {
        $this->assertSame(Sucursal::BuenosAires, Sucursal::paraProvincia('Buenos Aires'));
        $this->assertSame(Sucursal::BuenosAires, Sucursal::paraProvincia('Ciudad Autónoma de Buenos Aires'));
    }

    public function test_cordoba_va_a_cordoba(): void
    {
        $this->assertSame(Sucursal::Cordoba, Sucursal::paraProvincia('Córdoba'));
    }

    #[DataProvider('todasLasProvincias')]
    public function test_cada_provincia_del_checkout_cae_donde_siempre_cayo(string $provincia): void
    {
        $this->assertSame(
            in_array($provincia, self::DE_CORDOBA, true) ? Sucursal::Cordoba : Sucursal::BuenosAires,
            Sucursal::paraProvincia($provincia)
        );
    }

    /** @return array<string, array{0: string}> */
    public static function todasLasProvincias(): array
    {
        return array_combine(self::PROVINCIAS_DEL_CHECKOUT, array_map(fn ($p) => [$p], self::PROVINCIAS_DEL_CHECKOUT));
    }

    public function test_las_otras_provincias_y_lo_que_no_se_reconoce_caen_en_buenos_aires(): void
    {
        foreach (['Santa Fe', 'Entre Ríos', 'Neuquén', 'Tierra del Fuego', 'Uruguay', 'xyz', '', '   ', null] as $provincia) {
            $this->assertSame(Sucursal::BuenosAires, Sucursal::paraProvincia($provincia), var_export($provincia, true));
        }
    }

    public function test_el_texto_libre_del_admin_se_reconoce_sin_importar_mayusculas_acentos_ni_espacios(): void
    {
        foreach (['CORDOBA', 'cordoba', ' Córdoba ', 'córdoba', 'Santiago  del Estero', 'tucuman'] as $provincia) {
            $this->assertSame(Sucursal::Cordoba, Sucursal::paraProvincia($provincia), $provincia);
        }
    }

    public function test_el_json_compartido_es_la_unica_fuente_de_la_regla(): void
    {
        $regla = json_decode((string) file_get_contents(resource_path('data/provincias-por-sucursal.json')), true);

        $this->assertSame('buenos-aires', $regla['defecto']);
        $this->assertSame(self::DE_CORDOBA, $regla['provincias']['cordoba']);
        // El frontend lo importa, no lo copia.
        $this->assertStringContainsString('provincias-por-sucursal.json', (string) file_get_contents(resource_path('js/lib/whatsapp.js')));
        $this->assertStringNotContainsString("'Santiago del Estero'", (string) file_get_contents(resource_path('js/lib/whatsapp.js')));
    }
}
