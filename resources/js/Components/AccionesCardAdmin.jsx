import { Link } from '@inertiajs/react';

const base =
    'inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all disabled:cursor-not-allowed';

/**
 * Botones de acción solo con ícono para las cards de mobile del admin (reemplazan a las
 * filas de las tablas, que desde lg siguen igual). Entran tres en media pantalla.
 *
 * - `onToggle` + `activo`: activar/desactivar (check verde cuando está activo).
 * - `editHref`: link a la edición.
 * - `onDelete`: elimina (se oculta si no viene); `deleteDisabled`/`deleteTitle` para los casos
 *   en que el backend no permite borrar (ya usado en pedidos, único admin, etc.).
 */
export default function AccionesCardAdmin({ activo, onToggle, editHref, onDelete, deleteDisabled = false, deleteTitle }) {
    return (
        <div className="flex items-center gap-2">
            {onToggle && (
                <button
                    type="button"
                    onClick={onToggle}
                    className={`${base} ${
                        activo ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title={activo ? 'Desactivar' : 'Activar'}
                    aria-label={activo ? 'Desactivar' : 'Activar'}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={activo ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
                    </svg>
                </button>
            )}
            {editHref && (
                <Link
                    href={editHref}
                    className={`${base} border-2 border-[#6000ca] bg-white text-[#6000ca] hover:bg-[#6000ca] hover:text-white`}
                    title="Editar"
                    aria-label="Editar"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </Link>
            )}
            {onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleteDisabled}
                    title={deleteTitle ?? 'Eliminar'}
                    aria-label="Eliminar"
                    className={`admin-delete ${base} border-2 border-red-500 bg-white text-red-500 hover:bg-red-500 hover:text-white disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-white disabled:hover:text-gray-300`}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
        </div>
    );
}
