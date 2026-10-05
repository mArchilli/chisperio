/**
 * Precio resultante de un aumento masivo. Espeja AumentoPreciosService::nuevoPrecio
 * (PHP), que es el que manda al guardar: esto solo alimenta la vista previa del modal.
 *
 * tipo: 'porcentaje' | 'fijo'. `valor` en el formato del InputPesos ("1250.5").
 * Devuelve null si el valor todavía no es un aumento válido (vacío o <= 0).
 */
export function precioConAumento(precio, tipo, valor) {
    const numero = Number(valor);
    if (!valor || !Number.isFinite(numero) || numero <= 0) return null;

    const base = Number(precio);
    const nuevo = tipo === 'porcentaje' ? base * (1 + numero / 100) : base + numero;

    return Math.round((nuevo + Number.EPSILON) * 100) / 100;
}
