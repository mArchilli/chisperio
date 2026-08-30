import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import WhatsAppSucursalModal from '@/Components/WhatsAppSucursalModal';
import { WHATSAPP_MENSAJE_POR_DEFECTO } from '@/lib/whatsapp';

const WhatsAppSucursalContext = createContext(null);

/**
 * Provee `abrirSelectorWhatsApp(mensaje?)` a toda la app y renderiza una única
 * instancia de WhatsAppSucursalModal. Ningún botón de WhatsApp del sitio abre un
 * número directo: todos llaman a `abrirSelectorWhatsApp` y el modal se encarga
 * de que el usuario elija sucursal antes de abrir el chat.
 *
 * Vive por encima de `<App>` (ver app.jsx), así el modal sobrevive a la
 * navegación de Inertia — p. ej. Checkout lo abre y sigue visible al aterrizar
 * en la pantalla de confirmación.
 */
export function WhatsAppSucursalProvider({ children }) {
    const [estado, setEstado] = useState({
        abierto: false,
        mensaje: WHATSAPP_MENSAJE_POR_DEFECTO,
    });

    const abrirSelectorWhatsApp = useCallback((mensaje) => {
        setEstado({ abierto: true, mensaje: mensaje || WHATSAPP_MENSAJE_POR_DEFECTO });
    }, []);

    const cerrarSelectorWhatsApp = useCallback(() => {
        setEstado((prev) => ({ ...prev, abierto: false }));
    }, []);

    const value = useMemo(
        () => ({ abrirSelectorWhatsApp, cerrarSelectorWhatsApp }),
        [abrirSelectorWhatsApp, cerrarSelectorWhatsApp]
    );

    return (
        <WhatsAppSucursalContext.Provider value={value}>
            {children}
            <WhatsAppSucursalModal
                abierto={estado.abierto}
                mensaje={estado.mensaje}
                onClose={cerrarSelectorWhatsApp}
            />
        </WhatsAppSucursalContext.Provider>
    );
}

export function useWhatsAppSucursal() {
    const ctx = useContext(WhatsAppSucursalContext);
    if (!ctx) {
        throw new Error('useWhatsAppSucursal debe usarse dentro de WhatsAppSucursalProvider');
    }
    return ctx;
}
