import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/counter.css';

// Tema claro: las fotos de producto son sobre fondo blanco, así no queda una "caja" flotando.
const THEME = {
    '--yarl__color_backdrop': '#ffffff',
    '--yarl__color_button': '#1c1b1b',
    '--yarl__color_button_active': '#6000ca',
    '--yarl__color_button_disabled': 'rgba(28, 27, 27, 0.25)',
    '--yarl__button_filter': 'none',
    '--yarl__counter_color': '#4b4356',
    '--yarl__counter_filter': 'none',
    '--yarl__thumbnails_container_background_color': '#ffffff',
    '--yarl__thumbnails_thumbnail_background': '#ffffff',
    '--yarl__thumbnails_thumbnail_border_color': 'rgba(28, 27, 27, 0.12)',
    '--yarl__thumbnails_thumbnail_active_border_color': '#6000ca',
    '--yarl__thumbnails_thumbnail_border_radius': '12px',
};

/**
 * Visor de imágenes a pantalla completa, basado en yet-another-react-lightbox (se renderiza
 * en un portal, con gestos táctiles, zoom, miniaturas y teclado ya resueltos):
 *  - Desktop: rueda / botones +/− / doble click para zoom, arrastrar para mover, flechas.
 *  - Mobile: pellizcar y doble toque para zoom, deslizar para cambiar de imagen.
 * `images` es un array de { ruta, alt }; `index`/`onIndexChange` mantienen sincronizada la
 * imagen activa con la galería de la página.
 */
export default function ProductImageLightbox({ images, index, onIndexChange, onClose }) {
    if (!images?.length) return null;

    const slides = images.map((image) => ({ src: `/${image.ruta}`, alt: image.alt || '' }));

    return (
        <Lightbox
            open
            close={onClose}
            index={index}
            slides={slides}
            plugins={[Zoom, Thumbnails, Counter]}
            on={{ view: ({ index: nextIndex }) => onIndexChange(nextIndex) }}
            zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true, doubleTapDelay: 300, doubleClickDelay: 300 }}
            thumbnails={{ border: 1, borderRadius: 12, padding: 2, gap: 8, vignette: false, showToggle: false }}
            counter={{ container: { style: { top: 0, bottom: 'unset' } } }}
            carousel={{ finite: images.length < 2, padding: 0, spacing: '5%' }}
            controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
            animation={{ swipe: 250 }}
            labels={{ Close: 'Cerrar', Next: 'Imagen siguiente', Previous: 'Imagen anterior', 'Zoom in': 'Acercar', 'Zoom out': 'Alejar' }}
            styles={{ root: THEME }}
        />
    );
}
