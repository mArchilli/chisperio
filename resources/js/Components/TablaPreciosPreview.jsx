/**
 * Tabla "Cantidad → Precio" compartida entre el repeater de escalas de precio
 * (Admin/Productos) y el preview de ofertas (Admin/Ofertas). Cada fila es
 * { cantidad, esBase, precioOriginal, precioFinal }: cuando precioFinal < precioOriginal
 * se pinta el precio tachado + el final (hay descuento en esa fila); si son iguales,
 * se muestra un único precio.
 */
export default function TablaPreciosPreview({ filas, titulo = 'Vista previa' }) {
    if (filas.length === 0) return null;

    return (
        <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{titulo}</p>
            <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Cantidad</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Precio unitario</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filas.map((fila, i) => {
                            const hayDescuento = fila.precioFinal < fila.precioOriginal;
                            return (
                                <tr key={i}>
                                    <td className="px-4 py-2 text-gray-700">
                                        {fila.cantidad}+ {fila.esBase && <span className="text-gray-400">(base)</span>}
                                    </td>
                                    <td className="px-4 py-2 text-gray-700">
                                        {hayDescuento ? (
                                            <>
                                                <span className="line-through text-gray-400 mr-2">
                                                    ${fila.precioOriginal.toFixed(2)}
                                                </span>
                                                <span className="font-bold text-[#A72DAB]">
                                                    ${fila.precioFinal.toFixed(2)}
                                                </span>
                                            </>
                                        ) : (
                                            <span>${fila.precioOriginal.toFixed(2)}</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
