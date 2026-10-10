import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import ProductoPickerModal from '@/Components/ProductoPickerModal';

/**
 * "Productos compatibles" para Admin/Productos/Create y Edit. `seleccionados` es un array
 * de ids de producto (data.compatibles de useForm), en el orden en que se ofrecen;
 * `productos` son los productos activos elegibles (sin el propio, ver
 * ProductoController::productosCompatibles). La compatibilidad es simétrica: lo que se
 * marca acá también aparece del otro lado (si la pistola es compatible con la chispa, la
 * chispa lo es con la pistola) y el carrito lo usa para sugerir lo que sirve con lo que
 * el cliente ya lleva. Además lleva el check "Sugerir siempre".
 */
export default function ProductosCompatiblesSelector({
    productos,
    seleccionados,
    onChange,
    sugerirSiempre,
    onSugerirSiempreChange,
    errors = {},
}) {
    const [pickerAbierto, setPickerAbierto] = useState(false);

    const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
    // Un compatible que ya no es elegible (se desactivó) no se muestra ni se reenvía.
    const elegidos = seleccionados.map((id) => porId.get(id)).filter(Boolean);
    const disponibles = productos.filter((p) => !seleccionados.includes(p.id));

    const agregar = (producto) => {
        onChange([...elegidos.map((p) => p.id), producto.id]);
        setPickerAbierto(false);
    };

    const quitar = (id) => onChange(elegidos.map((p) => p.id).filter((x) => x !== id));

    const mover = (indice, delta) => {
        const ids = elegidos.map((p) => p.id);
        const destino = indice + delta;
        if (destino < 0 || destino >= ids.length) return;
        [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
        onChange(ids);
    };

    const errorCompatibles =
        errors.compatibles || Object.entries(errors).find(([clave]) => clave.startsWith('compatibles.'))?.[1];

    return (
        <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                <svg className="h-5 w-5 mr-2 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                </svg>
                Productos compatibles
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Opcional. Marcá los productos que funcionan con este (por ejemplo, las chispas frías PULY® que usa una
                pistola PULY®). Cuando un cliente lleve este producto en el carrito se le van a sugerir estos, y al
                revés: <strong>la compatibilidad es en los dos sentidos</strong>, no hace falta cargarla también en
                el otro producto.
            </p>

            {elegidos.length > 0 && (
                <ul className="mb-3 space-y-2">
                    {elegidos.map((producto, indice) => (
                        <li
                            key={producto.id}
                            className="flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-2.5"
                        >
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                                {producto.imagen_principal?.ruta ? (
                                    <img
                                        src={`/${producto.imagen_principal.ruta}`}
                                        alt=""
                                        className="h-full w-full object-contain p-1"
                                    />
                                ) : null}
                            </div>
                            <p className="min-w-0 flex-1 truncate text-sm font-bold text-gray-800">{producto.titulo}</p>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => mover(indice, -1)}
                                    disabled={indice === 0}
                                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                                    aria-label={`Subir ${producto.titulo}`}
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    onClick={() => mover(indice, 1)}
                                    disabled={indice === elegidos.length - 1}
                                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                                    aria-label={`Bajar ${producto.titulo}`}
                                >
                                    ↓
                                </button>
                                <button
                                    type="button"
                                    onClick={() => quitar(producto.id)}
                                    className="admin-delete rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                                    aria-label={`Quitar ${producto.titulo}`}
                                >
                                    <X aria-hidden="true" className="h-4 w-4" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <button
                type="button"
                onClick={() => setPickerAbierto(true)}
                disabled={disponibles.length === 0}
                className="inline-flex items-center rounded-xl border-2 border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-[#6000ca] hover:text-[#6000ca] disabled:cursor-not-allowed disabled:opacity-50"
            >
                + Agregar producto compatible
            </button>

            {errorCompatibles && <p className="mt-2 text-sm text-red-600">{errorCompatibles}</p>}

            <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                    type="checkbox"
                    checked={sugerirSiempre}
                    onChange={(e) => onSugerirSiempreChange(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#6000ca] focus:ring-[#6000ca]"
                />
                <span className="text-sm font-bold text-gray-700">
                    Sugerir siempre en el carrito
                    <span className="block text-xs font-normal text-gray-500">
                        Se ofrece en cualquier carrito (útil para las chispas frías genéricas), pero solo cuando el
                        cliente no lleva ningún producto con compatibilidades cargadas: así a quien compra una pistola
                        PULY® no se le ofrece una chispa que quizás no le sirva.
                    </span>
                </span>
            </label>

            <ProductoPickerModal
                show={pickerAbierto}
                productos={disponibles}
                onSelect={agregar}
                onClose={() => setPickerAbierto(false)}
            />
        </div>
    );
}
