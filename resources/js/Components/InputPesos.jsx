import { forwardRef, useLayoutEffect, useRef, useState } from 'react';

/**
 * Input de montos en pesos argentinos: se escribe y se ve como "1.250.000,50"
 * (punto de miles, coma decimal, hasta 2 decimales) con un "$" fijo adelante, pero
 * hacia afuera trabaja con el formato que entiende el servidor: string con punto
 * decimal ("1250000.5") o "" si está vacío.
 *
 * `value` / `onChange(valor)` usan ese formato de servidor, así que se puede enchufar
 * directo a useForm sin conversiones.
 */

/** "1250000.5" → "1.250.000,5". Sin ceros ni decimales de más: lo que se tipeó es lo que se ve. */
export function formatearMontoInput(valor) {
    if (valor === '' || valor === null || valor === undefined) return '';

    const [entero, decimales] = String(valor).split('.');
    const enteroConMiles = (entero || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return decimales !== undefined ? `${enteroConMiles},${decimales}` : enteroConMiles;
}

/** "200000.00" (así llega de la base) → "200000": los ".00" no aportan al leerlo. */
const sinDecimalesNulos = (valor) => String(valor ?? '').replace(/\.0+$/, '');

/** Texto tipeado ("1.250.000,5") → formato servidor ("1250000.5"). Ignora todo lo que no sea dígito o coma. */
function parsearTexto(texto) {
    const limpio = texto.replace(/[^\d,]/g, '');
    const coma = limpio.indexOf(',');

    if (coma === -1) return { servidor: limpio.replace(/^0+(?=\d)/, ''), terminaEnComa: false };

    const entero = limpio.slice(0, coma).replace(/^0+(?=\d)/, '') || '0';
    const decimales = limpio.slice(coma + 1).replace(/,/g, '').slice(0, 2);

    return { servidor: `${entero}.${decimales}`, terminaEnComa: decimales === '' };
}

/** Cantidad de dígitos/comas a la izquierda de una posición: sirve para reubicar el cursor tras reformatear. */
const contarSignificativos = (texto, hasta) => texto.slice(0, hasta).replace(/[^\d,]/g, '').length;

const InputPesos = forwardRef(function InputPesos(
    {
        value,
        onChange,
        className = '',
        id,
        required,
        disabled,
        placeholder = '0',
        // Símbolo fijo del campo: "$" por defecto; con simboloAlFinal sirve para "%".
        simbolo = '$',
        simboloAlFinal = false,
        ...props
    },
    refExterno
) {
    const refInterno = useRef(null);
    const input = refExterno ?? refInterno;
    const cursor = useRef(null);

    const [texto, setTexto] = useState(() => formatearMontoInput(sinDecimalesNulos(value)));

    // Si el valor cambia desde afuera (reset del form, respuesta del servidor) se
    // resincroniza el texto; mientras el usuario tipea no pisa lo que está escribiendo
    // (ej. la coma final de "1.000," que todavía no tiene decimales).
    const servidorActual = parsearTexto(texto).servidor;
    const valorExterno = value === null || value === undefined ? '' : String(value);
    if (valorExterno !== servidorActual && Number(valorExterno || NaN) !== Number(servidorActual || NaN)) {
        setTexto(formatearMontoInput(sinDecimalesNulos(valorExterno)));
    }

    // Reubica el cursor después de reformatear, para poder editar en el medio sin que salte al final.
    useLayoutEffect(() => {
        if (cursor.current === null || !input.current) return;

        let significativos = cursor.current;
        let posicion = 0;

        while (posicion < texto.length && significativos > 0) {
            if (/[\d,]/.test(texto[posicion])) significativos -= 1;
            posicion += 1;
        }

        input.current.setSelectionRange(posicion, posicion);
        cursor.current = null;
    }, [texto, input]);

    const manejarCambio = (e) => {
        const { servidor, terminaEnComa } = parsearTexto(e.target.value);
        cursor.current = contarSignificativos(e.target.value, e.target.selectionStart);
        // "1000." (coma recién tipeada) se ve como "1.000," pero hacia afuera es 1000.
        setTexto(formatearMontoInput(servidor));
        onChange(terminaEnComa ? servidor.replace(/\.$/, '') : servidor);
    };

    return (
        <div className="relative">
            <span
                className={`pointer-events-none absolute inset-y-0 flex items-center font-semibold text-gray-500 ${
                    simboloAlFinal ? 'right-0 pr-4' : 'left-0 pl-4'
                }`}
            >
                {simbolo}
            </span>
            <input
                {...props}
                ref={input}
                id={id}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required={required}
                disabled={disabled}
                placeholder={placeholder}
                value={texto}
                onChange={manejarCambio}
                className={`${simboloAlFinal ? 'pr-9' : 'pl-9'} tabular-nums ${className}`}
            />
        </div>
    );
});

export default InputPesos;
