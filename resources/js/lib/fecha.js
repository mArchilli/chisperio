/**
 * Único lugar del front que formatea fechas.
 *
 * Lo guardado en la base está en UTC y el servidor lo manda como instante ISO ("...Z").
 * Todo lo que se muestra se pasa a hora argentina, sin depender de la zona de la
 * computadora o el celular de quien mira (un vendedor de viaje, un navegador en UTC).
 * Contraparte en el back: App\Support\ZonaHoraria.
 */
export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

const LOCALE = 'es-AR';

/** Instante (ISO del servidor o Date) → Date. Devuelve null si no es una fecha válida. */
const aDate = (valor) => {
    if (valor === null || valor === undefined || valor === '') return null;
    const date = valor instanceof Date ? valor : new Date(valor);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatear = (valor, opciones, vacio = '') => {
    const date = aDate(valor);
    if (!date) return vacio;
    return new Intl.DateTimeFormat(LOCALE, { timeZone: ZONA_HORARIA, ...opciones }).format(date);
};

/** "18/10/2026 21:30" */
export const formatearFechaHora = (valor, vacio = '') =>
    formatear(
        valor,
        { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false },
        vacio
    );

/** "18/10/2026" */
export const formatearFecha = (valor, vacio = '') =>
    formatear(valor, { day: '2-digit', month: '2-digit', year: 'numeric' }, vacio);

/** "18 oct 2026" */
export const formatearFechaCorta = (valor, vacio = '') =>
    formatear(valor, { day: '2-digit', month: 'short', year: 'numeric' }, vacio);

/** Fecha de hoy en hora argentina como "YYYY-MM-DD" (lo que espera <input type="date">). */
export const hoyISO = (ahora = new Date()) =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: ZONA_HORARIA,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(ahora);

/**
 * Un día calendario ya resuelto ("YYYY-MM-DD", como lo manda el back para series y filtros
 * o como lo guardan las columnas `date`). NO es un instante: se lo trata como una fecha
 * pura, sin corrimientos por zona horaria, y solo se le da formato.
 */
export const formatearDiaCalendario = (diaISO, opciones = { day: '2-digit', month: 'short' }) => {
    const [anio, mes, dia] = String(diaISO ?? '').slice(0, 10).split('-').map(Number);
    if (!anio || !mes || !dia) return '';
    return new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', ...opciones }).format(new Date(Date.UTC(anio, mes - 1, dia)));
};
