import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'envioGratisNotificado';

/**
 * Dispara `notificar()` una sola vez por sesión de navegador al cruzar el umbral de abajo
 * hacia arriba. Si el carrito vuelve a bajar del monto (sacaron productos) y luego lo
 * re-alcanza en la misma sesión, vuelve a notificar.
 */
export function useNotificacionEnvioGratis(subtotal, montoMinimo, notificar, porCombo = false) {
    const yaNotificado = useRef(
        typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === 'true'
    );

    useEffect(() => {
        // Envío gratis por monto o por llevar únicamente un combo con envío gratis.
        const alcanzado = porCombo || (montoMinimo > 0 && subtotal >= montoMinimo);

        if (alcanzado && !yaNotificado.current) {
            notificar();
            yaNotificado.current = true;
            sessionStorage.setItem(STORAGE_KEY, 'true');
        }

        if (!alcanzado && yaNotificado.current) {
            yaNotificado.current = false;
            sessionStorage.removeItem(STORAGE_KEY);
        }
    }, [subtotal, montoMinimo, notificar, porCombo]);
}
