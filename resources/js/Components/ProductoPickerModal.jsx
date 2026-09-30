import { useMemo, useState } from 'react';
import Modal from '@/Components/Modal';

const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(precio);

/**
 * Selector de producto en formato de cards con preview (imagen + título + precio),
 * para elegir qué producto va en cada línea de ComboProductosRepeater. Reemplaza al
 * <select> de texto plano por una grilla filtrable, igual de espíritu que el buscador
 * de Admin/Ofertas/Create.jsx pero con la imagen del producto como referencia visual.
 */
export default function ProductoPickerModal({ show, productos, onSelect, onClose }) {
    const [busqueda, setBusqueda] = useState('');

    const filtrados = useMemo(() => {
        const termino = busqueda.trim().toLowerCase();
        if (!termino) return productos;
        return productos.filter((p) => p.titulo.toLowerCase().includes(termino));
    }, [productos, busqueda]);

    const cerrar = () => {
        setBusqueda('');
        onClose();
    };

    const elegir = (producto) => {
        onSelect(producto);
        setBusqueda('');
    };

    return (
        <Modal show={show} onClose={cerrar} maxWidth="3xl">
            <div className="p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Elegir producto</h3>
                    <button type="button" onClick={cerrar} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" aria-label="Cerrar">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="relative mb-4">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        autoFocus
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar producto por título..."
                        className="block w-full rounded-xl border-gray-300 pl-10 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                    />
                </div>

                <div className="max-h-[26rem] overflow-y-auto -mx-1 px-1">
                    {filtrados.length === 0 ? (
                        <p className="py-10 text-center text-sm text-gray-500">
                            {productos.length === 0 ? 'No hay productos activos en el catálogo.' : 'Ningún producto coincide con la búsqueda.'}
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filtrados.map((producto) => {
                                const ruta = producto.imagen_principal?.ruta;
                                return (
                                    <button
                                        key={producto.id}
                                        type="button"
                                        onClick={() => elegir(producto)}
                                        className="group flex flex-col overflow-hidden rounded-xl border-2 border-gray-200 bg-white text-left transition-all hover:border-[#40B0C2] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#40B0C2]"
                                    >
                                        <div className="aspect-square w-full bg-gray-50 overflow-hidden">
                                            {ruta ? (
                                                <img
                                                    src={`/${ruta}`}
                                                    alt={producto.titulo}
                                                    className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-xl font-black text-gray-300">
                                                        {producto.titulo.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2.5">
                                            <p className="line-clamp-2 text-xs font-bold leading-snug text-gray-800">{producto.titulo}</p>
                                            <p className="mt-1 text-xs font-extrabold text-[#A72DAB]">{formatearPrecio(producto.precio)}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
