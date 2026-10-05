import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import Chip from '@/Components/FilterChip';
import InputError from '@/Components/InputError';
import InputPesos from '@/Components/InputPesos';
import { precioConAumento } from '@/lib/aumentoPrecios';

const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(precio);

const formatearValor = (valor) =>
    new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(valor));

// Mismos "tipos" que la vidriera (Todos / Destacados / Ofertas), ver Tienda.jsx.
const TIPOS = [
    { key: 'todos', label: 'Todos' },
    { key: 'destacados', label: 'Destacados' },
    { key: 'ofertas', label: 'Ofertas' },
];

const FILTROS_VACIOS = { busqueda: '', tipo: 'todos', categoria: null, subcategoria: null };

const sinHtml = (html) => (html ? html.replace(/<[^>]*>/g, ' ') : '');

/** Mismo criterio que TiendaController::index (búsqueda en título y descripción, tipo, categoría, subcategoría). */
function coincideConFiltros(producto, { busqueda, tipo, categoria, subcategoria }) {
    const termino = busqueda.trim().toLowerCase();

    if (
        termino &&
        !producto.titulo.toLowerCase().includes(termino) &&
        !sinHtml(producto.descripcion).toLowerCase().includes(termino)
    ) {
        return false;
    }

    if (tipo === 'destacados' && !producto.is_featured) return false;
    if (tipo === 'ofertas' && !producto.oferta_vigente) return false;
    if (categoria && !producto.categorias?.some((c) => c.id === categoria)) return false;
    if (subcategoria && !producto.subcategorias?.some((s) => s.id === subcategoria)) return false;

    return true;
}

export default function AumentoPreciosModal({ show, onClose, productos, categorias }) {
    const [filtros, setFiltros] = useState(FILTROS_VACIOS);
    const [seleccionados, setSeleccionados] = useState(() => new Set());
    const [tipoAumento, setTipoAumento] = useState('porcentaje');
    const [valor, setValor] = useState('');
    const [confirmando, setConfirmando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [errores, setErrores] = useState({});

    // Cada vez que se abre arranca limpio: un aumento masivo no debe heredar la
    // selección ni el valor de la vez anterior.
    useEffect(() => {
        if (!show) return;
        setFiltros(FILTROS_VACIOS);
        setSeleccionados(new Set());
        setTipoAumento('porcentaje');
        setValor('');
        setConfirmando(false);
        setErrores({});
    }, [show]);

    const hayFiltros =
        filtros.busqueda.trim() !== '' || filtros.tipo !== 'todos' || filtros.categoria !== null || filtros.subcategoria !== null;

    const categoriaActiva = categorias.find((c) => c.id === filtros.categoria) ?? null;

    // Orden A→Z fijo (sin importar mayúsculas ni tildes).
    const visibles = useMemo(
        () =>
            productos
                .filter((producto) => coincideConFiltros(producto, filtros))
                .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' })),
        [productos, filtros]
    );

    const todosLosVisiblesSeleccionados = visibles.length > 0 && visibles.every((p) => seleccionados.has(p.id));
    const seleccionadosFueraDeLista = [...seleccionados].filter((id) => !visibles.some((p) => p.id === id)).length;

    // "Seleccionar todo" opera sobre la lista visible: sin filtros es el catálogo
    // completo; con filtros, solo lo filtrado (lo ya elegido fuera de la lista no se toca).
    const alternarTodos = () => {
        setSeleccionados((previo) => {
            const siguiente = new Set(previo);
            visibles.forEach((p) => (todosLosVisiblesSeleccionados ? siguiente.delete(p.id) : siguiente.add(p.id)));
            return siguiente;
        });
    };

    const alternarUno = (id) =>
        setSeleccionados((previo) => {
            const siguiente = new Set(previo);
            siguiente.has(id) ? siguiente.delete(id) : siguiente.add(id);
            return siguiente;
        });

    const cambiarFiltro = (cambios) => setFiltros((previo) => ({ ...previo, ...cambios }));

    const valorValido = precioConAumento(1, tipoAumento, valor) !== null;
    const textoAumento = valorValido
        ? tipoAumento === 'porcentaje'
            ? `${formatearValor(valor)}%`
            : formatearPrecio(valor)
        : '';
    const puedeAplicar = seleccionados.size > 0 && valorValido && !procesando;

    const aplicar = () => {
        router.post(
            route('productos.aumento-precios'),
            { producto_ids: [...seleccionados], tipo: tipoAumento, valor },
            {
                preserveScroll: true,
                onStart: () => setProcesando(true),
                onFinish: () => setProcesando(false),
                onSuccess: () => onClose(),
                onError: (e) => {
                    setErrores(e);
                    setConfirmando(false);
                },
            }
        );
    };

    return (
        <Modal show={show} onClose={procesando ? () => {} : onClose} maxWidth="4xl">
            <div className="flex max-h-[90vh] flex-col">
                {/* Encabezado */}
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Aumentar precios</h3>
                        <p className="mt-0.5 text-sm text-gray-500">
                            Elegí los productos y el aumento. Se actualizan el precio base y los precios por cantidad de cada producto.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={procesando}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Cerrar"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Búsqueda y filtros */}
                <div className="space-y-3 border-b border-gray-100 p-5 sm:px-6">
                    <div className="relative">
                        <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={filtros.busqueda}
                            onChange={(e) => cambiarFiltro({ busqueda: e.target.value })}
                            placeholder="Buscar producto por nombre o descripción..."
                            className="block w-full rounded-xl border-gray-300 pl-10 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {TIPOS.map(({ key, label }) => (
                            <Chip key={key} active={filtros.tipo === key} onClick={() => cambiarFiltro({ tipo: key })}>
                                {label}
                            </Chip>
                        ))}
                        {categorias.length > 0 && <span className="mx-1 h-6 w-px bg-black/10" aria-hidden="true" />}
                        {categorias.map((categoria) => (
                            <Chip
                                key={categoria.id}
                                active={filtros.categoria === categoria.id}
                                onClick={() =>
                                    cambiarFiltro({
                                        categoria: filtros.categoria === categoria.id ? null : categoria.id,
                                        subcategoria: null,
                                    })
                                }
                            >
                                {categoria.nombre}
                            </Chip>
                        ))}
                    </div>

                    {categoriaActiva?.subcategorias?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#fcf9f8] px-3 py-2.5">
                            <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#4b4356]">
                                {categoriaActiva.nombre}
                            </span>
                            {categoriaActiva.subcategorias.map((subcategoria) => (
                                <Chip
                                    key={subcategoria.id}
                                    sub
                                    active={filtros.subcategoria === subcategoria.id}
                                    onClick={() =>
                                        cambiarFiltro({
                                            subcategoria: filtros.subcategoria === subcategoria.id ? null : subcategoria.id,
                                        })
                                    }
                                >
                                    {subcategoria.nombre}
                                </Chip>
                            ))}
                        </div>
                    )}
                </div>

                {/* Barra de selección */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-5 py-3 sm:px-6">
                    <button
                        type="button"
                        onClick={alternarTodos}
                        disabled={visibles.length === 0}
                        className="inline-flex items-center rounded-lg border-2 border-[#40B0C2] bg-white px-4 py-2 text-sm font-semibold text-[#40B0C2] transition-colors hover:bg-[#40B0C2] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {todosLosVisiblesSeleccionados
                            ? hayFiltros
                                ? `Quitar los ${visibles.length} filtrados`
                                : 'Quitar selección'
                            : hayFiltros
                              ? `Seleccionar los ${visibles.length} filtrados`
                              : `Seleccionar todo (${visibles.length})`}
                    </button>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>
                            <strong className="text-gray-900">{seleccionados.size}</strong>{' '}
                            {seleccionados.size === 1 ? 'seleccionado' : 'seleccionados'}
                            {seleccionadosFueraDeLista > 0 && (
                                <span className="text-amber-700"> ({seleccionadosFueraDeLista} fuera de los filtros actuales)</span>
                            )}
                        </span>
                        {hayFiltros && (
                            <button
                                type="button"
                                onClick={() => setFiltros(FILTROS_VACIOS)}
                                className="font-semibold text-[#A72DAB] underline underline-offset-2"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>

                {/* Lista A → Z */}
                <div className="min-h-[12rem] flex-1 overflow-y-auto border-y border-gray-100">
                    {visibles.length === 0 ? (
                        <p className="py-12 text-center text-sm text-gray-500">Ningún producto coincide con los filtros.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {visibles.map((producto) => {
                                const marcado = seleccionados.has(producto.id);
                                const ruta = producto.imagen_principal?.ruta;
                                const nuevoPrecio = marcado ? precioConAumento(producto.precio, tipoAumento, valor) : null;
                                const cantidadEscalas = producto.escalas_precio?.length ?? 0;

                                return (
                                    <li key={producto.id}>
                                        <label
                                            className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors sm:px-6 ${
                                                marcado ? 'bg-[#40B0C2]/[0.07]' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={marcado}
                                                onChange={() => alternarUno(producto.id)}
                                                className="h-5 w-5 flex-shrink-0 rounded border-gray-300 text-[#40B0C2] focus:ring-[#40B0C2]"
                                            />
                                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                                {ruta ? (
                                                    <img src={`/${ruta}`} alt="" className="h-full w-full object-cover" loading="lazy" />
                                                ) : (
                                                    <span className="text-sm font-black text-gray-300">{producto.titulo.charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-gray-900">{producto.titulo}</p>
                                                <p className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                                                    <span className="truncate">
                                                        {producto.categorias?.map((c) => c.nombre).join(', ') || 'Sin categoría'}
                                                    </span>
                                                    {!producto.is_active && (
                                                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">Inactivo</span>
                                                    )}
                                                    {cantidadEscalas > 0 && (
                                                        <span className="rounded-full bg-[#40B0C2]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#2f8a99]">
                                                            {cantidadEscalas} {cantidadEscalas === 1 ? 'escala' : 'escalas'}
                                                        </span>
                                                    )}
                                                </p>
                                                {/* Precios por cantidad: se aumentan igual que el base, así que se previsualizan también. */}
                                                {cantidadEscalas > 0 && (
                                                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                                                        {producto.escalas_precio.map((escala) => {
                                                            const nuevaEscala = marcado
                                                                ? precioConAumento(escala.precio_unitario, tipoAumento, valor)
                                                                : null;

                                                            return (
                                                                <li
                                                                    key={escala.id}
                                                                    className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600"
                                                                >
                                                                    <span className="font-semibold text-gray-700">{escala.cantidad_minima}+</span>{' '}
                                                                    {nuevaEscala !== null ? (
                                                                        <>
                                                                            <span className="text-gray-400 line-through">{formatearPrecio(escala.precio_unitario)}</span>{' '}
                                                                            <span className="font-bold text-green-700">{formatearPrecio(nuevaEscala)}</span>
                                                                        </>
                                                                    ) : (
                                                                        formatearPrecio(escala.precio_unitario)
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0 text-right text-sm">
                                                {nuevoPrecio !== null ? (
                                                    <>
                                                        <p className="text-xs text-gray-400 line-through">{formatearPrecio(producto.precio)}</p>
                                                        <p className="font-bold text-green-700">{formatearPrecio(nuevoPrecio)}</p>
                                                    </>
                                                ) : (
                                                    <p className="font-semibold text-gray-900">{formatearPrecio(producto.precio)}</p>
                                                )}
                                            </div>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Aumento y confirmación */}
                <div className="space-y-3 p-5 sm:p-6">
                    {!confirmando ? (
                        <>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div>
                                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo de aumento</span>
                                    <div className="inline-flex rounded-xl bg-gray-100 p-1">
                                        {[
                                            { key: 'porcentaje', label: 'Porcentaje' },
                                            { key: 'fijo', label: 'Monto fijo' },
                                        ].map(({ key, label }) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => {
                                                    setTipoAumento(key);
                                                    setValor('');
                                                }}
                                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                                    tipoAumento === key ? 'bg-white text-[#A72DAB] shadow' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 sm:max-w-[16rem]">
                                    <label htmlFor="valor-aumento" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        {tipoAumento === 'porcentaje' ? 'Porcentaje de aumento' : 'Monto a sumar a cada precio'}
                                    </label>
                                    <InputPesos
                                        id="valor-aumento"
                                        value={valor}
                                        onChange={setValor}
                                        simbolo={tipoAumento === 'porcentaje' ? '%' : '$'}
                                        simboloAlFinal={tipoAumento === 'porcentaje'}
                                        placeholder={tipoAumento === 'porcentaje' ? '10' : '1.000'}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setConfirmando(true)}
                                    disabled={!puedeAplicar}
                                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Aplicar aumento
                                </button>
                            </div>
                            <InputError message={errores.valor || errores.producto_ids || errores.tipo} />
                        </>
                    ) : (
                        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                            <p className="text-sm font-bold text-amber-900">
                                Vas a aumentar {textoAumento} el precio de {seleccionados.size}{' '}
                                {seleccionados.size === 1 ? 'producto' : 'productos'}.
                            </p>
                            <p className="mt-1 text-xs text-amber-800">
                                Cambia el precio base y los precios por cantidad de cada uno. No se puede deshacer automáticamente.
                                {seleccionadosFueraDeLista > 0 &&
                                    ` Incluye ${seleccionadosFueraDeLista} que no se ven con los filtros actuales.`}
                            </p>
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmando(false)}
                                    disabled={procesando}
                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Volver
                                </button>
                                <button
                                    type="button"
                                    onClick={aplicar}
                                    disabled={procesando}
                                    className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                                >
                                    {procesando ? 'Aplicando…' : 'Confirmar aumento'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
