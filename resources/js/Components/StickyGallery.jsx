import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Envuelve la galería de una ficha para que, en desktop (lg+), acompañe el scroll mientras
 * se lee la columna de información, que suele ser bastante más alta que la imagen. En
 * mobile/tablet no hace nada (queda en el flujo normal, apilada arriba).
 *
 * `offset` es la distancia al borde superior donde se "pega" (hay que dejar lugar al
 * header sticky del sitio). Si la galería es más alta que la ventana, un sticky fijo
 * dejaría cortada la parte de abajo (miniaturas) sin forma de verla hasta el final de la
 * fila; por eso el `top` se achica para que el borde INFERIOR de la galería quede
 * alineado con el de la ventana — se ve completa, y sigue pegada.
 *
 * Importante: ningún ancestro puede tener overflow hidden/auto (rompe el sticky); las
 * fichas usan overflow-x-clip en su contenedor raíz por eso.
 */
export default function StickyGallery({ children, offset = 112, margenInferior = 16 }) {
    const ref = useRef(null);
    const [top, setTop] = useState(offset);

    useLayoutEffect(() => {
        const elemento = ref.current;
        if (!elemento) return undefined;

        const calcular = () => {
            setTop(Math.min(offset, window.innerHeight - elemento.offsetHeight - margenInferior));
        };

        calcular();

        // La galería cambia de alto al cambiar de color/foto, y la ventana al redimensionarse.
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(calcular) : null;
        observer?.observe(elemento);
        window.addEventListener('resize', calcular);

        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', calcular);
        };
    }, [offset, margenInferior]);

    return (
        <div ref={ref} className="lg:sticky lg:self-start" style={{ top }}>
            {children}
        </div>
    );
}
