import { useEffect, useState } from 'react';

/**
 * true una vez que el usuario scrolleó más de `threshold` px hacia abajo. Se usa para
 * no tapar el hero con los botones flotantes (WhatsApp/carrito) apenas se entra al
 * sitio — aparecen recién cuando el usuario empieza a bajar la página.
 */
export function useScrolledPast(threshold = 240) {
    const [scrolled, setScrolled] = useState(
        () => typeof window !== 'undefined' && window.scrollY > threshold
    );

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > threshold);
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [threshold]);

    return scrolled;
}
