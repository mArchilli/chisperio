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
     * Relación uno a muchos con ProductoVariante, ordenada por orden ascendente
     */
    public function variantes(): HasMany
    {
        return $this->hasMany(ProductoVariante::class)->orderBy('orden');
    }

    public function variantesActivas(): HasMany
    {
        return $this->variantes()->where('is_active', true);
    }

    public function tieneVariantes(): bool
    {
        return $this->variantes()->exists();
    }

    /**
     * Relación muchos a muchos con Addon a través de producto_addon
     */
    public function addons(): BelongsToMany
    {
        return $this->belongsToMany(Addon::class, 'producto_addon')
            ->withPivot('precio_override', 'orden')
            ->withTimestamps();
    }

    public function addonsActivos(): BelongsToMany
    {
        return $this->addons()->where('addons.is_active', true);
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
     *
     * Si el producto tiene variantes, productos.stock queda obsoleto (el stock real vive
     * en cada ProductoVariante): la disponibilidad pasa a ser "alguna variante activa
     * alcanza la cantidad pedida", sin mirar la columna propia. Esto es una disponibilidad
     * agregada (para catálogo/validación cuando no se sabe todavía qué variante eligió el
     * cliente) — el descuento real de stock por variante lo hace StockService, que sí sabe
     * cuál variante puntual está en juego.
     */
    public function tieneStockDisponible(int $cantidad): bool
    {
        if ($this->tieneVariantes()) {
            return $this->variantesActivas()
                ->get()
                ->contains(fn (ProductoVariante $variante) => $variante->tieneStockDisponible($cantidad));
        }

        return $this->tieneStockIlimitado() || $this->stock >= $cantidad;
    }

    /**
     * Filtra productos con stock agotado para los listados públicos. `stock IS NULL`
     * (ilimitado) y `stock > 0` pasan el filtro; ojo que un simple `where('stock', '!=', 0)`
     * NO alcanza para esto — en SQL, `NULL <> 0` no es verdadero, así que esa forma
     * excluiría también los productos con stock ilimitado. La ficha individual
     * (TiendaController::show) NO usa este scope a propósito: sigue siendo accesible por
     * URL directa con stock=0.
     *
     * Productos con variantes: mismo criterio que tieneStockDisponible() — se ignora
     * productos.stock y se exige al menos una variante activa con stock (propio o
     * ilimitado). Un producto con variantes pero con TODAS agotadas/inactivas queda
     * fuera del listado aunque productos.stock diga otra cosa.
     */
    public function scopeConStock(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->where(function (Builder $sinVariantes) {
                $sinVariantes->whereDoesntHave('variantes')
                    ->where(fn (Builder $q2) => $q2->whereNull('stock')->orWhere('stock', '>', 0));
            })->orWhereHas('variantes', function (Builder $variantes) {
                $variantes->where('is_active', true)
                    ->where(fn (Builder $q2) => $q2->whereNull('stock')->orWhere('stock', '>', 0));
            });
        });
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
