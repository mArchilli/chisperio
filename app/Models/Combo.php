<?php

namespace App\Models;

use App\Enums\TipoDescuento;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Combo extends Model
{
    use HasFactory;

    protected $fillable = [
        'titulo',
        'descripcion',
        'precio',
        'is_active',
        'is_featured',
        'tipo_descuento',
        'valor_descuento',
        'descuento_fecha_inicio',
        'descuento_fecha_fin',
        'descuento_activo',
        'envio_gratis',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'tipo_descuento' => TipoDescuento::class,
        'valor_descuento' => 'decimal:2',
        'descuento_fecha_inicio' => 'datetime',
        'descuento_fecha_fin' => 'datetime',
        'descuento_activo' => 'boolean',
        'envio_gratis' => 'boolean',
    ];

    /**
     * Relación uno a muchos con ComboProducto (la "receta" del combo), ordenada por orden.
     */
    public function items(): HasMany
    {
        return $this->hasMany(ComboProducto::class)->orderBy('orden');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ComboMedia::class)->orderBy('orden');
    }

    public function imagenes(): HasMany
    {
        return $this->hasMany(ComboMedia::class)->where('tipo', 'imagen')->orderBy('orden');
    }

    public function videos(): HasMany
    {
        return $this->hasMany(ComboMedia::class)->where('tipo', 'video')->orderBy('orden');
    }

    public function imagenPrincipal()
    {
        return $this->hasOne(ComboMedia::class)
            ->where('tipo', 'imagen')
            ->where('is_principal', true);
    }

    /**
     * A diferencia de Oferta (múltiples ofertas programadas con historial por producto),
     * un combo tiene un único descuento propio configurado directo en sus columnas.
     */
    public function descuentoVigente(): bool
    {
        if (! $this->descuento_activo || $this->tipo_descuento === null || $this->valor_descuento === null) {
            return false;
        }

        $ahora = now();

        if ($this->descuento_fecha_inicio && $ahora->lt($this->descuento_fecha_inicio)) {
            return false;
        }

        if ($this->descuento_fecha_fin && $ahora->gt($this->descuento_fecha_fin)) {
            return false;
        }

        return true;
    }

    /**
     * Cuántos combos completos se pueden armar hoy con el stock disponible de sus
     * componentes: para cada item, cuántas "unidades de receta" alcanza su stock
     * disponible (ComboProducto::stockDisponibleUnidad), y el mínimo entre todos los
     * items manda (un combo no se puede vender más veces que lo que permite su
     * componente más escaso). `null` = ilimitado, solo si TODOS los items lo son.
     *
     * $seleccionPorItem: [combo_producto_id => variante_id elegida por el comprador]
     * — sin selección (p. ej. la vidriera, antes de que el comprador elija color) se usa
     * el criterio conservador de ComboProducto::stockDisponibleUnidad (suma de variantes
     * activas) para los items que todavía requieren una elección.
     */
    public function stockDisponible(array $seleccionPorItem = []): ?int
    {
        $maxCombos = null;

        foreach ($this->items as $item) {
            $stockItem = $item->stockDisponibleUnidad($seleccionPorItem[$item->id] ?? null);

            if ($stockItem === null) {
                continue;
            }

            $maxParaEsteItem = intdiv($stockItem, max(1, $item->cantidad));
            $maxCombos = $maxCombos === null ? $maxParaEsteItem : min($maxCombos, $maxParaEsteItem);
        }

        return $maxCombos;
    }

    public function tieneStockDisponible(int $cantidad, array $seleccionPorItem = []): bool
    {
        $stock = $this->stockDisponible($seleccionPorItem);

        return $stock === null || $stock >= $cantidad;
    }
}
