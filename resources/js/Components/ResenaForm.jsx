import { Link } from '@inertiajs/react';
import { ReviewCard } from '@/Components/Landing/ReviewsSection';

/** Misma regla que Resena::getInicialesAttribute: primera letra de la primera y la última palabra. */
export function inicialesDe(nombre) {
    const palabras = String(nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return '?';

    const primera = Array.from(palabras[0])[0];
    const ultima = palabras.length > 1 ? Array.from(palabras[palabras.length - 1])[0] : '';

    return (primera + ultima).toUpperCase();
}

/** Fecha de hoy como "YYYY-MM-DD" en hora local (lo que espera <input type="date">). */
export function hoyISO() {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');

    return `${ahora.getFullYear()}-${mes}-${dia}`;
}

const inputClase =
    'block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300';

function Campo({ id, label, error, ayuda, children }) {
    return (
        <div className="mb-6">
            <label htmlFor={id} className="block text-sm font-bold text-gray-900 mb-2">
                {label}
            </label>
            {children}
            {ayuda && !error && <p className="mt-2 text-xs text-gray-500">{ayuda}</p>}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
    );
}

/**
 * Formulario de alta/edición de una reseña, compartido por Create y Edit. A la derecha
 * (debajo en mobile) muestra la reseña tal como se va a ver en la landing.
 */
export default function ResenaForm({ data, setData, errors, processing, onSubmit, submitLabel, colores }) {
    const vistaPrevia = {
        nombre: data.nombre || 'Nombre del cliente',
        iniciales: inicialesDe(data.nombre),
        meta: data.meta,
        texto: data.texto,
        puntuacion: data.puntuacion,
        fecha: data.fecha,
        color_avatar: data.color_avatar,
    };

    return (
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                <Campo id="nombre" label="Nombre *" error={errors.nombre}>
                    <input
                        id="nombre"
                        type="text"
                        value={data.nombre}
                        onChange={(e) => setData('nombre', e.target.value)}
                        placeholder="Ej: María Gómez"
                        maxLength={120}
                        className={inputClase}
                    />
                </Campo>

                <Campo
                    id="meta"
                    label="Datos del autor"
                    error={errors.meta}
                    ayuda='Opcional. Aparece bajo el nombre, ej. "Local Guide · 28 opiniones · 12 fotos".'
                >
                    <input
                        id="meta"
                        type="text"
                        value={data.meta}
                        onChange={(e) => setData('meta', e.target.value)}
                        maxLength={150}
                        className={inputClase}
                    />
                </Campo>

                <Campo id="texto" label="Reseña" error={errors.texto} ayuda="Opcional: una reseña puede ser solo de estrellas.">
                    <textarea
                        id="texto"
                        rows={5}
                        value={data.texto}
                        onChange={(e) => setData('texto', e.target.value)}
                        maxLength={2000}
                        className={inputClase}
                    />
                </Campo>

                <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                    <div className="mb-6">
                        <span className="block text-sm font-bold text-gray-900 mb-2">Puntuación *</span>
                        <div className="flex items-center gap-1" role="radiogroup" aria-label="Puntuación">
                            {[1, 2, 3, 4, 5].map((valor) => (
                                <button
                                    key={valor}
                                    type="button"
                                    role="radio"
                                    aria-checked={data.puntuacion === valor}
                                    aria-label={`${valor} ${valor === 1 ? 'estrella' : 'estrellas'}`}
                                    onClick={() => setData('puntuacion', valor)}
                                    className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A72DAB]"
                                >
                                    <svg
                                        className={`h-8 w-8 fill-current ${valor <= data.puntuacion ? 'text-[#fbbc04]' : 'text-gray-300'}`}
                                        viewBox="0 0 20 20"
                                        aria-hidden="true"
                                    >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                        {errors.puntuacion && <p className="mt-2 text-sm text-red-600">{errors.puntuacion}</p>}
                    </div>

                    <Campo id="fecha" label="Fecha *" error={errors.fecha} ayuda='Se muestra como "Hace 2 meses" y ordena las reseñas.'>
                        <input
                            id="fecha"
                            type="date"
                            value={data.fecha}
                            max={hoyISO()}
                            onChange={(e) => setData('fecha', e.target.value)}
                            className={inputClase}
                        />
                    </Campo>
                </div>

                <div className="mb-6">
                    <span className="block text-sm font-bold text-gray-900 mb-2">Color del avatar</span>
                    <div className="flex flex-wrap gap-2">
                        {colores.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setData('color_avatar', color)}
                                aria-label={`Color ${color}`}
                                aria-pressed={data.color_avatar === color}
                                className={`h-9 w-9 rounded-full border-2 border-white shadow ring-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A72DAB] ${
                                    data.color_avatar === color ? 'scale-110 ring-2 ring-[#A72DAB]' : 'ring-black/15 hover:ring-[#A72DAB]/50'
                                }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                    {errors.color_avatar && <p className="mt-2 text-sm text-red-600">{errors.color_avatar}</p>}
                </div>

                <label className="mb-8 flex cursor-pointer items-center gap-3">
                    <input
                        type="checkbox"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="h-5 w-5 rounded border-gray-300 text-[#A72DAB] focus:ring-[#A72DAB]"
                    />
                    <span className="text-sm font-semibold text-gray-900">Mostrar en la landing</span>
                </label>

                <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
                    <Link
                        href={route('resenas.index')}
                        className="inline-flex items-center px-5 py-3 bg-white border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                    >
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                    >
                        {processing ? 'Guardando…' : submitLabel}
                    </button>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-6">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Así se ve en la landing</p>
                    <div className="rounded-2xl bg-[#f8f9fa] p-5">
                        <ReviewCard review={vistaPrevia} />
                    </div>
                </div>
            </div>
        </form>
    );
}
