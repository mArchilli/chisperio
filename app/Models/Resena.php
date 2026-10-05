<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Resena extends Model
{
    use HasFactory;

    protected $table = 'resenas';

    /** Colores de avatar disponibles (los mismos que usaban las reseñas de la landing). */
    public const COLORES = [
        '#1a73e8', '#d93025', '#188038', '#f29900', '#9334e6',
        '#007b83', '#185abc', '#c2185b', '#e37400', '#3f51b5',
    ];

    protected $fillable = [
        'nombre',
        'meta',
        'texto',
        'puntuacion',
        'fecha',
        'color_avatar',
        'is_active',
    ];

    protected $casts = [
        'puntuacion' => 'integer',
        // `date:Y-m-d` para que llegue al front como "2026-09-05" y no como timestamp ISO.
        'fecha' => 'date:Y-m-d',
        'is_active' => 'boolean',
    ];

    protected $appends = ['iniciales'];

    /**
     * Iniciales del avatar: primera letra de la primera y de la última palabra del
     * nombre ("Alejandra Ramacciotti" → AR, "EDUARDO MARTIN PAIGES" → EP); con una sola
     * palabra, solo esa letra.
     */
    public function getInicialesAttribute(): string
    {
        $palabras = preg_split('/\s+/u', trim((string) $this->nombre), -1, PREG_SPLIT_NO_EMPTY);

        if ($palabras === false || $palabras === []) {
            return '?';
        }

        $primera = Str::substr($palabras[0], 0, 1);
        $ultima = count($palabras) > 1 ? Str::substr($palabras[count($palabras) - 1], 0, 1) : '';

        return Str::upper($primera.$ultima);
    }

    /** Color estable para una reseña nueva sin color elegido (según el nombre). */
    public static function colorPorDefecto(string $nombre): string
    {
        return self::COLORES[crc32(Str::lower($nombre)) % count(self::COLORES)];
    }

    public function scopeActivas(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /** De la más nueva a la más vieja, como Google. */
    public function scopeRecientesPrimero(Builder $query): Builder
    {
        return $query->orderByDesc('fecha')->orderByDesc('id');
    }
}
