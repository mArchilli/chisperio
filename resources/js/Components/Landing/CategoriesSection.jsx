import { Link } from '@inertiajs/react';
import { useState } from 'react';

const CATEGORY_FILTERS = [
    {
        key: 'chispas-frias',
        label: 'Chispas frías',
        image: '/images/img-filtro-chispas.png',
        categoryNames: ['chispas frias'],
    },
    {
        key: 'fuegos-artificiales',
        label: 'Fuegos artificiales',
        image: '/images/img-filtro-fuegos-artificiales.png',
        categoryNames: ['fuegos artificiales'],
    },
    {
        key: 'maquinas',
        label: 'Máquinas',
        image: '/images/img-filtro-maquinas.png',
        categoryNames: ['maquinaria', 'maquinas'],
    },
    {
        key: 'humo',
        label: 'Humo',
        image: '/images/img-filtro-humo.png',
        categoryNames: ['humo'],
    },
    {
        key: 'velas',
        label: 'Velas',
        image: '/images/img-filtro-velas.png',
        categoryNames: ['velas'],
    },
];

const normalizeName = (value) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

const catalogHref = (categoryId) => {
    const href = categoryId
        ? route('tienda.index', { categoria: categoryId })
        : route('tienda.index');

    return `${href}#productos`;
};

export default function CategoriesSection({ categorias = [] }) {
    const [activeCategoryId, setActiveCategoryId] = useState(null);
    const categoriesByName = new Map(
        categorias.map((category) => [normalizeName(category.nombre), category])
    );

    const filters = CATEGORY_FILTERS.map((filter) => ({
        ...filter,
        category: filter.categoryNames
            .map((name) => categoriesByName.get(normalizeName(name)))
            .find(Boolean),
    })).filter((filter) => filter.category);

    if (filters.length === 0) return null;

    return (
        <section
            id="tienda"
            aria-labelledby="effect-categories-title"
            className="mb-16 w-full px-6 md:mb-20 md:px-10 lg:px-12 xl:px-16"
        >
            <div className="grid items-stretch gap-9 lg:grid-cols-[minmax(340px,0.75fr)_minmax(0,1.35fr)] lg:gap-14 xl:gap-20">
                <div className="min-w-0 py-2 md:py-4 lg:order-2">
                    <h2
                        id="effect-categories-title"
                        className="max-w-5xl text-[2.5rem] font-black uppercase leading-[0.98] tracking-tight text-[#1c1b1b] md:text-[3.25rem] lg:text-[clamp(2.75rem,3.3vw,4rem)]"
                    >
                        ¿Qué tipo de efecto estás buscando?
                    </h2>

                    <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-5 lg:gap-6 xl:gap-7">
                        {filters.map(({ key, label, image, category }, index) => {
                            const isActive = activeCategoryId === category.id;
                            const isLastUnpaired = filters.length % 2 === 1 && index === filters.length - 1;

                            return (
                                <Link
                                    key={key}
                                    href={catalogHref(category.id)}
                                    onClick={() => setActiveCategoryId(category.id)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`group flex w-full flex-col rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4 ${
                                        isLastUnpaired
                                            ? 'col-span-2 w-[calc(50%_-_0.5rem)] justify-self-center md:col-span-1 md:w-auto'
                                            : ''
                                    }`}
                                >
                                    <span
                                        className={`relative block aspect-square overflow-hidden rounded-[1.4rem] border bg-white shadow-[0_10px_28px_-20px_rgba(28,27,27,0.45)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_32px_-20px_rgba(96,0,202,0.5)] group-active:scale-[0.98] ${
                                            isActive
                                                ? 'border-[#6000ca]/50 ring-4 ring-[#6000ca]/10'
                                                : 'border-black/[0.06] group-hover:border-[#6000ca]/25'
                                        }`}
                                    >
                                        <img
                                            src={image}
                                            alt={label}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                                            loading="lazy"
                                        />
                                    </span>
                                    <span
                                        className={`mt-3 min-h-10 px-1 text-xs font-bold uppercase leading-snug tracking-[0.07em] transition-colors md:text-[13px] ${
                                            isActive
                                                ? 'text-[#6000ca]'
                                                : 'text-[#4b4356] group-hover:text-[#6000ca]'
                                        }`}
                                    >
                                        {label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <aside className="relative min-h-[320px] overflow-hidden rounded-[2rem] border border-[#6000ca]/10 bg-gradient-to-br from-[#f4edff] via-[#edf3ff] to-[#e8f9ff] p-7 md:min-h-[350px] md:p-9 lg:order-1">
                    <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#6000ca]/10 blur-3xl" aria-hidden="true" />
                    <div className="absolute -bottom-20 left-6 h-44 w-44 rounded-full bg-[#00b8ff]/10 blur-3xl" aria-hidden="true" />

                    <div className="relative z-10 flex h-full max-w-[330px] flex-col items-start">
                        <h3 className="text-3xl font-black uppercase leading-[0.98] tracking-tight text-[#1c1b1b] md:text-[2.5rem]">
                            Encontrá el efecto ideal
                        </h3>
                        <p className="mt-4 text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                            Descubrí opciones para entradas, shows y momentos inolvidables.
                        </p>
                        <Link
                            href={catalogHref()}
                            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#6000ca] px-6 py-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#6000ca]/20 transition-all hover:bg-[#4f00a8] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4 active:scale-95"
                        >
                            Ver todos los productos
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
                            </svg>
                        </Link>
                    </div>

                    <img
                        src="/images/img-filtro-fuegos-artificiales.png"
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-16 -right-14 w-64 mix-blend-multiply opacity-30 md:w-72"
                    />
                </aside>
            </div>
        </section>
    );
}
