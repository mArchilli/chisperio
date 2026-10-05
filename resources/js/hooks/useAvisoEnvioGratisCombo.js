import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

/**
 * Avisa en el momento en que el carrito pierde el envío gratis del combo porque se sumó
 * otro ítem (ver lib/envioGratis: el beneficio del combo vale solo si se compra solo), y
 * explica el motivo y qué pasa ahora: rige el monto que configura el admin.
 *
 * Solo dispara si había un combo con envío gratis y era lo único del carrito; si el combo
 * no tiene envío gratis no hay nada que perder y no se avisa nada. Tampoco al quitar el
 * combo ni al cargar la página con el carrito ya armado (solo ante la transición).
 *
 * `hayComboConEnvioGratis` debe seguir en true tras el cambio: eso distingue "sumó otro
 * producto" de "sacó el combo".
 */
export function useAvisoEnvioGratisCombo({ envioGratisPorCombo, hayComboConEnvioGratis, subtotal, montoMinimo }) {
    const teniaEnvioPorCombo = useRef(envioGratisPorCombo);

    useEffect(() => {
        const loPerdio = teniaEnvioPorCombo.current && !envioGratisPorCombo && hayComboConEnvioGratis;
        teniaEnvioPorCombo.current = envioGratisPorCombo;

        if (!loPerdio) return;

        const hayMonto = montoMinimo > 0;

        let mensaje;
        if (hayMonto && subtotal >= montoMinimo) {
            // Sumó lo suficiente como para alcanzar el monto: sigue con envío gratis, pero por otro motivo.
            mensaje = `El envío gratis del combo aplica solo si lo comprás solo. Igual seguís con envío gratis porque tu pedido superó los ${formatPrice(montoMinimo)}. 🎉`;
        } else if (hayMonto) {
            mensaje = `Al sumar otros productos, el envío gratis del combo deja de aplicar (solo vale comprando el combo solo). Ahora rige el envío gratis desde ${formatPrice(montoMinimo)} de compra: te faltan ${formatPrice(montoMinimo - subtotal)}.`;
        } else {
            mensaje = 'Al sumar otros productos, el envío gratis del combo deja de aplicar: solo vale comprando el combo solo.';
        }

        toast(mensaje, { icon: '🚚', duration: 9000 });
    }, [envioGratisPorCombo, hayComboConEnvioGratis, subtotal, montoMinimo]);
}
