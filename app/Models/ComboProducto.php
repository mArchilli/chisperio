<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComboProducto extends Model
{
    use HasFactory;

    protected $table = 'combo_productos';

    protected $fillable = [
        'combo_id',
        'producto_id',
        'producto_variante_id',
        'cantidad',
        'orden',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'orden' => 'integer',
    ];

    public function combo(): BelongsTo
    {
        return $this->belongsTo(Combo::class);
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function productoVariante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class);
    }

    /**
     * true si esta línea no tiene una variante fijada por el admin y el producto sí
     * tiene variantes activas: el comprador tiene que elegir una al agregar el combo
     * al carrito, mismo criterio que un producto suelto (PedidoController::store).
     */
    public function requiereSeleccionVariante(): bool
    {
        return $this->producto_variante_id === null && $this->producto->variantesActivas->isNotEmpty();
    }

    /**
     * Stock disponible de UNA unidad de esta línea (antes de dividir por `cantidad`
     * de receta), según el caso:
     *  - producto inactivo: 0 (no se puede vender un combo con un componente dado de baja).
     *  - variante fijada por el admin: stock de esa variante puntual.
     *  - producto sin variantes: stock del producto.
     *  - producto con variantes, sin selección del comprador todavía (vidriera):
     *    criterio conservador = suma de stock de variantes activas, mismo que
     *    cantidadMaximaTotalVariantes() en el frontend.
     *  - producto con variantes y selección del comprador: stock de esa variante.
     *
     * `null` = ilimitado.
     */
    public function stockDisponibleUnidad(?int $varianteIdSeleccionada = null): ?int
    {
        if (! $this->producto->is_active) {
            return 0;
        }

        if ($this->producto_variante_id !== null) {
            $variante = $this->productoVariante;

            return $variante->tieneStockIlimitado() ? null : max(0, $variante->stock);
        }

        if (! $this->producto->tieneVariantes()) {
            return $this->producto->tieneStockIlimitado() ? null : max(0, $this->producto->stock);
        }

        if ($varianteIdSeleccionada !== null) {
            $variante = $this->producto->variantesActivas->firstWhere('id', $varianteIdSeleccionada);

            if ($variante !== null) {
                return $variante->tieneStockIlimitado() ? null : max(0, $variante->stock);
            }
        }

        $variantesActivas = $this->producto->variantesActivas;

        if ($variantesActivas->isEmpty()) {
            return 0;
        }

        if ($variantesActivas->contains(fn (ProductoVariante $v) => $v->tieneStockIlimitado())) {
            return null;
        }

        return $variantesActivas->sum('stock');
    }
}
