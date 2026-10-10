import { Link } from '@inertiajs/react';

function parseNumero(valor) {
    if (valor === '' || valor === null || valor === undefined) return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
}

/**
 * Replica en cliente la regla del backend (ProductoController::addonsReglas):
 * precio_override numérico >= 0, o vacío (= se usa el precio por defecto del addon).
 * Devuelve { esValido, errores } donde errores es un array paralelo a `seleccionados`.
 */
export function validarAddonsProducto(seleccionados) {
    let esValido = true;

    const errores = seleccionados.map((seleccionado) => {
        const fila = {};
        const precio = parseNumero(seleccionado.precio_override);

        if (
            seleccionado.precio_override !== '' &&
            seleccionado.precio_override !== null &&
            seleccionado.precio_override !== undefined
        ) {
            if (precio === null || precio < 0) {
                fila.precio_override = 'Debe ser un número mayor o igual a 0.';
            }
        }

        if (fila.precio_override) {
            esValido = false;
        }

        return fila;
    });

    return { esValido, errores };
}

/**
 * Checklist de "Add-ons disponibles" para Admin/Productos/Create y Edit.
 * `addonsDisponibles` llega como prop del controller (solo addons activos del
 * catálogo global). `seleccionados` es controlado por el padre (data.addons de
 * useForm): un array de { addon_id, precio_override, orden } — uno por cada
 * addon tildado. Al destildar, la entrada se saca del array (se sincroniza vía
 * sync() en el backend, así que no hace falta un flag _eliminar como en los
 * otros repeaters).
 */
export default function AddonsProductoSelector({ addonsDisponibles, seleccionados, onChange, errors = {} }) {
    const seleccionadoPara = (addonId) => seleccionados.find((s) => s.addon_id === addonId);

    const toggleAddon = (addon) => {
        if (seleccionadoPara(addon.id)) {
            onChange(seleccionados.filter((s) => s.addon_id !== addon.id));
            return;
        }
        onChange([...seleccionados, { addon_id: addon.id, precio_override: '', orden: seleccionados.length }]);
    };

    const actualizar = (addonId, campo, valor) => {
        onChange(seleccionados.map((s) => (s.addon_id === addonId ? { ...s, [campo]: valor } : s)));
    };

    return (
        <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                <svg className="h-5 w-5 mr-2 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3a1 1 0 112 0v1.05a7.002 7.002 0 015.95 5.95H20a1 1 0 110 2h-1.05a7.002 7.002 0 01-5.95 5.95V19a1 1 0 11-2 0v-1.05A7.002 7.002 0 015.05 12H4a1 1 0 110-2h1.05A7.002 7.002 0 0111 4.05V3z" />
                </svg>
                Add-ons disponibles
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Opcional. Elegí qué add-ons del catálogo global puede agregar el cliente a este producto. Si dejás el precio vacío, se usa el precio por defecto del add-on.
            </p>

            {addonsDisponibles.length === 0 ? (
                <div className="p-4 bg-amber-50 border-2 border-dashed border-amber-200 rounded-xl text-sm text-amber-700">
                    Todavía no hay add-ons activos en el catálogo.{' '}
                    <Link href={route('addons.create')} className="font-bold underline hover:text-amber-900">
                        Creá uno acá
                    </Link>
                    {' '}para poder asociarlo a este producto.
                </div>
            ) : (
                <div className="space-y-3">
                    {addonsDisponibles.map((addon) => {
                        const seleccionado = seleccionadoPara(addon.id);
                        const index = seleccionado ? seleccionados.indexOf(seleccionado) : -1;
                        const errorPrecio = index >= 0 ? errors[`addons.${index}.precio_override`] : null;
                        const precioDefecto = Number(addon.precio).toFixed(2);

                        return (
                            <div
                                key={addon.id}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                    seleccionado ? 'border-[#6000ca] bg-[#6000ca]/5' : 'border-gray-200 bg-white'
                                }`}
                            >
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!!seleccionado}
                                        onChange={() => toggleAddon(addon)}
                                        className="mt-1 h-5 w-5 rounded border-gray-300 text-[#6000ca] focus:ring-[#6000ca]"
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm text-gray-800">{addon.nombre}</p>
                                        <p className="text-xs text-gray-500">Precio por defecto: ${precioDefecto}</p>
                                    </div>
                                </label>

                                {seleccionado && (
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                Precio override{' '}
                                                <span className="text-gray-400 font-normal normal-case">(vacío = ${precioDefecto})</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={seleccionado.precio_override}
                                                    onChange={(e) => actualizar(addon.id, 'precio_override', e.target.value)}
                                                    placeholder={precioDefecto}
                                                    className="block w-full pl-8 rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                                />
                                            </div>
                                            {errorPrecio && <p className="mt-1 text-xs text-red-600">{errorPrecio}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                Orden
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={seleccionado.orden}
                                                onChange={(e) => actualizar(addon.id, 'orden', e.target.value)}
                                                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
