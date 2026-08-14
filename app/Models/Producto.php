<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{
    use HasFactory;

    protected $fillable = [
        'titulo',
        'descripcion',
        'precio',
        'is_active',
        'is_featured',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
    ];

    /**
     * Relación muchos a muchos con Categoria
     */
    public function categorias(): BelongsToMany
    {
        return $this->belongsToMany(Categoria::class, 'categoria_producto');
    }

    /**
     * Relación muchos a muchos con Subcategoria
     */
    public function subcategorias(): BelongsToMany
    {
        return $this->belongsToMany(Subcategoria::class, 'producto_subcategoria');
    }

    /**
     * Relación uno a muchos con ProductoMedia (imágenes y videos)
     */
    public function media(): HasMany
    {
        return $this->hasMany(ProductoMedia::class)->orderBy('orden');
    }

    /**
     * Obtener solo las imágenes del producto
     */
    public function imagenes(): HasMany
    {
        return $this->hasMany(ProductoMedia::class)->where('tipo', 'imagen')->orderBy('orden');
    }

    /**
     * Obtener solo los videos del producto
     */
    public function videos(): HasMany
    {
        return $this->hasMany(ProductoMedia::class)->where('tipo', 'video')->orderBy('orden');
    }

    /**
     * Obtener la imagen principal del producto
     */
    public function imagenPrincipal()
    {
        return $this->hasOne(ProductoMedia::class)
            ->where('tipo', 'imagen')
            ->where('is_principal', true);
    }

    /**
     * Relación uno a muchos con Oferta
     */
    public function ofertas(): HasMany
    {
        return $this->hasMany(Oferta::class);
    }

    /**
     * Relación uno a muchos con EscalaPrecio, ordenada por cantidad_minima ascendente
     */
    public function escalasPrecio(): HasMany
    {
        return $this->hasMany(EscalaPrecio::class)->orderBy('cantidad_minima');
    }

    /**
     * Resuelve la escala de precio aplicable a una cantidad dada: la de mayor
     * cantidad_minima que sea <= $cantidad. Devuelve null si ninguna aplica
     * (en cuyo caso el llamador debe usar `precio` como fallback).
     *
     * Nota: base para la Fase 2 (servicio de cálculo de precio); no se usa todavía.
     */
    public function escalaAplicable(int $cantidad): ?EscalaPrecio
    {
        return $this->escalasPrecio
            ->filter(fn (EscalaPrecio $escala) => $escala->cantidad_minima <= $cantidad)
            ->last();
    }

    /**
     * Obtener la oferta vigente del producto
     */
    public function ofertaVigente()
    {
        return $this->hasOne(Oferta::class)
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('fecha_inicio')
                    ->orWhere('fecha_inicio', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('fecha_fin')
                    ->orWhere('fecha_fin', '>=', now());
            });
    }
}
