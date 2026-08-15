<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
        'stock',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'stock' => 'integer',
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
     * Relación uno a muchos con MovimientoStock (historial de auditoría de stock)
     */
    public function movimientosStock(): HasMany
    {
        return $this->hasMany(MovimientoStock::class);
    }

    /**
     * `stock === null` significa stock ilimitado (comportamiento por defecto de todo
     * el catálogo hasta que se cargue un número real).
     */
    public function tieneStockIlimitado(): bool
    {
        return $this->stock === null;
    }

    /**
     * true si el producto tiene stock ilimitado o si el stock alcanza la cantidad pedida.
     * Solo lectura: el descuento/reposición real lo hace el StockService (Fase 2).
     */
    public function tieneStockDisponible(int $cantidad): bool
    {
        return $this->tieneStockIlimitado() || $this->stock >= $cantidad;
    }

    /**
     * Filtra productos con stock agotado (`stock = 0`) para los listados públicos.
     * `stock IS NULL` (ilimitado) y `stock > 0` pasan el filtro; ojo que un simple
     * `where('stock', '!=', 0)` NO alcanza para esto — en SQL, `NULL <> 0` no es
     * verdadero, así que esa forma excluiría también los productos con stock
     * ilimitado. La ficha individual (TiendaController::show) NO usa este scope
     * a propósito: sigue siendo accesible por URL directa con stock=0.
     */
    public function scopeConStock(Builder $query): Builder
    {
        return $query->where(fn (Builder $q) => $q->whereNull('stock')->orWhere('stock', '>', 0));
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
