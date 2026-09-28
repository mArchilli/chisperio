<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComboMedia extends Model
{
    use HasFactory;

    protected $table = 'combo_media';

    protected $fillable = [
        'combo_id',
        'tipo',
        'ruta',
        'orden',
        'is_principal',
    ];

    protected $casts = [
        'orden' => 'integer',
        'is_principal' => 'boolean',
    ];

    public function combo(): BelongsTo
    {
        return $this->belongsTo(Combo::class);
    }

    public function esImagen(): bool
    {
        return $this->tipo === 'imagen';
    }

    public function esVideo(): bool
    {
        return $this->tipo === 'video';
    }
}
