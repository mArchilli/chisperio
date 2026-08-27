<?php

namespace Database\Seeders;

use App\Models\PlanPagoTarjeta;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PlanPagoTarjetaSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $planes = [
            ['nombre' => '1 cuota', 'cuotas' => 1, 'recargo_porcentaje' => 10.00, 'orden' => 1],
            ['nombre' => '3 cuotas', 'cuotas' => 3, 'recargo_porcentaje' => 20.00, 'orden' => 2],
            ['nombre' => '6 cuotas', 'cuotas' => 6, 'recargo_porcentaje' => 35.00, 'orden' => 3],
        ];

        foreach ($planes as $plan) {
            PlanPagoTarjeta::create($plan);
        }
    }
}
