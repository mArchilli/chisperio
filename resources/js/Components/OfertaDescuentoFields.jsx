import { useMemo } from 'react';
import TablaPreciosPreview from '@/Components/TablaPreciosPreview';
import { aplicarDescuento } from '@/lib/pricing';

export { aplicarDescuento };

/**
 * Replica en cliente las reglas del backend (OfertaController::ofertaReglas):
 * tipo_descuento y alcance requeridos, valor_descuento > 0 (y <= 100 si es porcentaje),
 * y un precio específico elegido cuando alcance=especifico. `data.producto_escala_precio_id`
 * es el valor "crudo" del select: '' (nada elegido), 'base', o el id de una escala.
 */
export function validarOfertaDescuento(data) {
    const errores = {};

    if (!data.tipo_descuento) {
        errores.tipo_descuento = 'Elegí un tipo de descuento.';
    }

    const valor = parseFloat(data.valor_descuento);
    if (data.valor_descuento === '' || data.valor_descuento === null || data.valor_descuento === undefined || Number.isNaN(valor)) {
        errores.valor_descuento = 'El valor del descuento es obligatorio.';
    } else if (valor <= 0) {
        errores.valor_descuento = 'Debe ser mayor a 0.';
    } else if (data.tipo_descuento === 'porcentaje' && valor > 100) {
        errores.valor_descuento = 'Un descuento porcentual no puede superar el 100%.';
    }

    if (!data.alcance) {
        errores.alcance = 'Elegí a qué precios aplica la oferta.';
    }

    if (data.alcance === 'especifico' && (data.producto_escala_precio_id === '' || data.producto_escala_precio_id === undefined)) {
        errores.producto_escala_precio_id = 'Elegí a qué precio específico aplica la oferta.';
    }

    return { esValido: Object.keys(errores).length === 0, errores };
}

const inputClass = 'block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]';

function ToggleOption({ activo, onClick, children }) {
    return (
        <button
            type="button"
            aria-pressed={activo}
            onClick={onClick}
            className={`flex-1 px-4 py-3 rounded-xl border-2 text-left text-sm font-semibold transition-all duration-300 ${
                activo
                    ? 'border-[#40B0C2] bg-gradient-to-br from-[#40B0C2]/10 to-[#A72DAB]/10 text-[#A72DAB] shadow-md'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
        >
            {children}
        </button>
    );
}

/**
 * Sub-sección "Descuento" del form de Oferta (Create/Edit): tipo_descuento,
 * valor_descuento, alcance, el selector de precio específico (cuando corresponde)
 * y el preview en vivo de cómo queda cada nivel de precio del producto.
 *
 * `data.producto_escala_precio_id` viaja como string en el form: '' (sin elegir),
 * 'base' (precio base del producto) o el id de una escala — se normaliza a
 * null/integer recién al armar el payload de submit (ver Create.jsx/Edit.jsx).
 */
export default function OfertaDescuentoFields({ producto, data, setData, errors = {} }) {
    const { errores: erroresCliente } = useMemo(() => validarOfertaDescuento(data), [data]);
    const error = (campo) => errors[campo] || erroresCliente[campo];

    const setAlcance = (valor) => {
        setData('alcance', valor);
        if (valor === 'todos') {
            setData('producto_escala_precio_id', '');
        }
    };

    const escalas = [...(producto?.escalas_precio || [])].sort((a, b) => a.cantidad_minima - b.cantidad_minima);

    const filasPreview = (() => {
        if (!producto) return [];

        const precioBase = parseFloat(producto.precio);
        const filas = [
            { cantidad: 1, esBase: true, escalaId: null, precioOriginal: precioBase },
            ...escalas.map((escala) => ({
                cantidad: escala.cantidad_minima,
                esBase: false,
                escalaId: escala.id,
                precioOriginal: parseFloat(escala.precio_unitario),
            })),
        ].sort((a, b) => a.cantidad - b.cantidad);

        return filas.map((fila) => {
            const afecta = data.alcance === 'todos'
                ? true
                : data.producto_escala_precio_id === 'base'
                    ? fila.esBase
                    : data.producto_escala_precio_id !== '' && String(fila.escalaId) === String(data.producto_escala_precio_id);

            const precioFinal = afecta
                ? aplicarDescuento(fila.precioOriginal, data.tipo_descuento, data.valor_descuento)
                : fila.precioOriginal;

            return { cantidad: fila.cantidad, esBase: fila.esBase, precioOriginal: fila.precioOriginal, precioFinal };
        });
    })();

    return (
        <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Descuento</h3>

            {/* Tipo de descuento */}
            <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                    Tipo de descuento
                </label>
                <div className="flex gap-3">
                    <ToggleOption activo={data.tipo_descuento === 'porcentaje'} onClick={() => setData('tipo_descuento', 'porcentaje')}>
                        Porcentaje
                    </ToggleOption>
                    <ToggleOption activo={data.tipo_descuento === 'fijo'} onClick={() => setData('tipo_descuento', 'fijo')}>
                        Valor fijo
                    </ToggleOption>
                </div>
                {error('tipo_descuento') && <p className="mt-2 text-sm text-red-600">{error('tipo_descuento')}</p>}
            </div>

            {/* Valor del descuento */}
            <div className="mb-4">
                <label htmlFor="valor_descuento" className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                    Valor del descuento
                </label>
                <div className="relative max-w-xs">
                    {data.tipo_descuento !== 'porcentaje' && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold pointer-events-none">$</span>
                    )}
                    <input
                        type="number"
                        id="valor_descuento"
                        value={data.valor_descuento}
                        onChange={(e) => setData('valor_descuento', e.target.value)}
                        step="0.01"
                        min="0"
                        max={data.tipo_descuento === 'porcentaje' ? 100 : undefined}
                        placeholder="0.00"
                        className={`${inputClass} ${data.tipo_descuento !== 'porcentaje' ? 'pl-8' : ''} ${data.tipo_descuento === 'porcentaje' ? 'pr-10' : ''}`}
                    />
                    {data.tipo_descuento === 'porcentaje' && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold pointer-events-none">%</span>
                    )}
                </div>
                {error('valor_descuento') && <p className="mt-2 text-sm text-red-600">{error('valor_descuento')}</p>}
            </div>

            {/* Alcance */}
            <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                    Alcance
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <ToggleOption activo={data.alcance === 'todos'} onClick={() => setAlcance('todos')}>
                        Todos los precios de este producto
                    </ToggleOption>
                    <ToggleOption activo={data.alcance === 'especifico'} onClick={() => setAlcance('especifico')}>
                        Un precio específico
                    </ToggleOption>
                </div>
                {error('alcance') && <p className="mt-2 text-sm text-red-600">{error('alcance')}</p>}
            </div>

            {/* Precio específico (solo si alcance=especifico) */}
            {data.alcance === 'especifico' && (
                <div className="mb-4 animate-fadeIn">
                    <label htmlFor="producto_escala_precio_id" className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        Precio específico
                    </label>
                    <select
                        id="producto_escala_precio_id"
                        value={data.producto_escala_precio_id}
                        onChange={(e) => setData('producto_escala_precio_id', e.target.value)}
                        disabled={!producto}
                        className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
                    >
                        <option value="" disabled>
                            {producto ? 'Elegí un precio...' : 'Elegí primero un producto'}
                        </option>
                        {producto && (
                            <option value="base">
                                Precio base (${parseFloat(producto.precio).toFixed(2)})
                            </option>
                        )}
                        {escalas.map((escala) => (
                            <option key={escala.id} value={escala.id}>
                                {escala.cantidad_minima}+ unidades — ${parseFloat(escala.precio_unitario).toFixed(2)}
                            </option>
                        ))}
                    </select>
                    {error('producto_escala_precio_id') && (
                        <p className="mt-2 text-sm text-red-600">{error('producto_escala_precio_id')}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                        Mientras esta oferta esté activa (o pendiente de empezar), no se va a poder borrar
                        el precio específico elegido desde el producto.
                    </p>
                </div>
            )}

            <TablaPreciosPreview filas={filasPreview} titulo="Vista previa de esta oferta" />
        </div>
    );
}
