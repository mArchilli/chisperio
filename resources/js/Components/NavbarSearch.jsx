import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export default function NavbarSearch({ currentUrl, initialQuery = '' }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(initialQuery);
    const inputRef = useRef(null);

    useEffect(() => {
        setOpen(false);
        setQuery(initialQuery);
    }, [currentUrl, initialQuery]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const handleSubmit = (event) => {
        event.preventDefault();
        const term = query.trim();
        if (!term) {
            inputRef.current?.focus();
            return;
        }
        inputRef.current?.blur();
        setOpen(false);
        router.get(`${route('tienda.index', { q: term })}#productos`);
    };

    return (
        <div className="flex min-w-0 justify-end md:w-full md:max-w-xs">
            <button
                type="button"
                onClick={() => setOpen((previous) => !previous)}
                aria-label="Buscar en el catálogo"
                aria-expanded={open}
                aria-controls="navbar-search-form"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6000ca] text-white transition-colors hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 md:hidden"
            >
                <Search className="h-5 w-5" aria-hidden="true" />
            </button>

            <form
                id="navbar-search-form"
                role="search"
                aria-label="Buscar productos en el catálogo"
                action={`${route('tienda.index')}#productos`}
                method="get"
                onSubmit={handleSubmit}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') setOpen(false);
                }}
                className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-full items-center gap-2 border-b border-[#6000ca]/15 bg-white px-5 py-3 shadow-md md:static md:flex md:w-full md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
            >
                <label htmlFor="navbar-search-input" className="sr-only">Buscar productos</label>
                <div className="relative min-w-0 flex-1">
                    <input
                        ref={inputRef}
                        id="navbar-search-input"
                        name="q"
                        type="search"
                        inputMode="search"
                        enterKeyHint="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar productos..."
                        className="h-11 w-full rounded-full border border-[#6000ca]/20 bg-[#fcf9f8] pl-4 pr-12 text-base text-[#1c1b1b] placeholder:text-[#81788a] focus:border-[#6000ca] focus:outline-none focus:ring-2 focus:ring-[#6000ca]/20 md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
                    />
                    <button
                        type="submit"
                        aria-label="Buscar"
                        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#6000ca] text-white transition-colors hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2"
                    >
                        <Search className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Cerrar buscador"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#6000ca] hover:bg-[#6000ca]/[0.06] md:hidden"
                >
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>
            </form>
        </div>
    );
}
