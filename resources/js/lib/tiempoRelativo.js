const unidad = (cantidad, singular, plural) => (cantidad === 1 ? `Hace un ${singular}` : `Hace ${cantidad} ${plural}`);

/**
 * "Hace 2 meses" a partir de una fecha "YYYY-MM-DD", con el mismo estilo que usa Google
 * en sus reseñas (días → semanas → meses → años). Se calcula al mostrar, así una reseña
 * cargada hoy como "Hoy" envejece sola sin que nadie tenga que editarla.
 *
 * `ahora` se puede inyectar para probarla.
 */
export function tiempoRelativo(fecha, ahora = new Date()) {
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-').map(Number);
    if (!anio || !mes || !dia) return '';

    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const dias = Math.round((hoy - new Date(anio, mes - 1, dia)) / 86400000);

    if (dias < 1) return 'Hoy';
    if (dias < 7) return dias === 1 ? 'Hace un día' : `Hace ${dias} días`;
    if (dias < 30) {
        const semanas = Math.floor(dias / 7);
        return semanas === 1 ? 'Hace una semana' : `Hace ${semanas} semanas`;
    }
    if (dias < 365) return unidad(Math.floor(dias / 30), 'mes', 'meses');

    return unidad(Math.floor(dias / 365), 'año', 'años');
}
