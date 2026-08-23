import { useState } from 'react';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

/**
 * Input para cargar un código de descuento + estado "aplicado". Compartido entre
 * Carrito.jsx y Checkout.jsx (quien entra directo al checkout sin pasar por el
 * carrito también tiene que poder cargar un código acá).
 */
export default function CodigoDescuentoBlock({ codigoAplicado, descuentoInfo, montoDescuento, validando, onAplicar, onQuitar }) {
    const [inputValue, setInputValue] = useState('');
    const mostrarError = !codigoAplicado && descuentoInfo && !descuentoInfo.valido;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!inputValue.trim() || validando) return;
        onAplicar(inputValue);
    };

    if (codigoAplicado) {
        return (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-[1.5rem] border border-[#1c8a4c]/20 bg-[#1c8a4c]/5 p-4">
                <div className="min-w-0">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#1c8a4c]">
                        Código aplicado
                    </p>
                    <p className="truncate text-sm font-black text-[#1c1b1b]">
                        {codigoAplicado} <span className="font-medium text-[#1c8a4c]">(-{formatPrice(montoDescuento)})</span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onQuitar}
                    className="flex-shrink-0 text-xs font-extrabold uppercase tracking-wide text-[#6000ca] hover:underline"
                >
                    Quitar
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="mb-5">
            <label htmlFor="codigo-descuento" className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#81788a]">
                ¿Tenés un código de descuento?
            </label>
            <div className="flex gap-2">
                <input
                    id="codigo-descuento"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                    placeholder="Ej: VERANO10"
                    className="min-w-0 flex-1 rounded-full border border-black/[0.08] bg-[#f7f6f9] px-4 py-2.5 text-sm font-semibold text-[#1c1b1b] focus:border-[#6000ca] focus:outline-none focus:ring-2 focus:ring-[#6000ca]/20"
                />
                <button
                    type="submit"
                    disabled={validando || !inputValue.trim()}
                    className="flex-shrink-0 rounded-full bg-[#6000ca] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white transition-all hover:bg-[#4f00a8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {validando ? 'Validando…' : 'Aplicar'}
                </button>
            </div>
            {mostrarError && (
                <p className="mt-2 text-xs font-semibold text-[#ba1a1a]">{descuentoInfo.motivo}</p>
            )}
        </form>
    );
}
