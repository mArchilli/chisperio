import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

/**
 * Input de contraseña con botón "mostrar/ocultar" (ícono de ojo). Reemplaza a un
 * `<input type="password">` suelto: acepta las mismas props (value, onChange,
 * name, id, autoComplete, autoFocus, required…) y `className` para el input.
 * `containerClassName` va al wrapper (útil para el margen que antes estaba en el
 * input, p. ej. `mt-1.5`).
 */
export default function PasswordInput({
    className = '',
    containerClassName = '',
    ...props
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className={`relative ${containerClassName}`}>
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                className={`${className} pr-11`}
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 transition-colors hover:text-gray-600"
            >
                {visible ? (
                    <EyeOff className="h-5 w-5" />
                ) : (
                    <Eye className="h-5 w-5" />
                )}
            </button>
        </div>
    );
}
