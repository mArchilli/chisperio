<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfiguracionEnvio extends Model
{
    protected $table = 'configuracion_envio';

    protected $fillable = ['monto_minimo'];

    protected $casts = [
        'monto_minimo' => 'decimal:2',
    ];

    /**
     * Siempre hay una única fila (id=1). Si no existe todavía (primer deploy), se crea con
     * monto_minimo=0 (feature desactivada) en vez de fallar.
     */
    public static function obtener(): self
    {
        return static::firstOrCreate(['id' => 1], ['monto_minimo' => 0]);
    }
}
