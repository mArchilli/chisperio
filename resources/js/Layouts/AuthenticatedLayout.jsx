import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        // Obtener el estado guardado del localStorage
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebarCollapsed');
            return saved === 'true';
        }
        return false;
    });

    // Guardar el estado en localStorage cuando cambie
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
    }, [sidebarCollapsed]);

    const navigation = [
        { name: 'Dashboard', href: 'dashboard', current: 'dashboard', icon: (
            <svg className={`h-5 w-5 ${!sidebarCollapsed ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )},
        { name: 'Categorías', href: 'categorias.index', current: 'categorias.*', icon: (
            <svg className={`h-5 w-5 ${!sidebarCollapsed ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        )},
        { name: 'Productos', href: 'productos.index', current: 'productos.*', icon: (
            <svg className={`h-5 w-5 ${!sidebarCollapsed ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        )},
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Sidebar para móvil */}
            <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)}></div>
                <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl">
                    <div className="flex h-16 items-center justify-between px-6 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB]">
                        <Link href="/">
                            <span className="text-white text-xl font-bold">Chisperio</span>
                        </Link>
                        <button onClick={() => setSidebarOpen(false)} className="text-white hover:text-gray-200 transition-colors">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <nav className="flex-1 space-y-2 px-4 py-6">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={route(item.href)}
                                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                                    route().current(item.current)
                                        ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-lg shadow-purple-500/30'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-[#40B0C2]'
                                }`}
                            >
                                {item.icon}
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                    <div className="border-t border-gray-100 p-4">
                        <a
                            href="/"
                            className="group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-gray-700 hover:text-[#40B0C2] bg-white/50 hover:bg-white/70 border border-gray-200/50 mb-4"
                        >
                            <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            Sitio Principal
                        </a>
                        <div className="mb-3 px-4 py-3 bg-gradient-to-br from-gray-50 to-white rounded-xl">
                            <div className="text-sm font-semibold text-gray-800">{user.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{user.email}</div>
                        </div>
                        <div className="space-y-1">
                            <Link
                                href={route('profile.edit')}
                                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-[#40B0C2] transition-all"
                            >
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Perfil
                            </Link>
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="flex items-center w-full text-left px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all"
                            >
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Cerrar Sesión
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar para desktop */}
            <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
                <div className="flex flex-col flex-grow bg-white shadow-xl overflow-y-auto">
                    <div className={`flex h-16 items-center bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
                        {!sidebarCollapsed && (
                            <Link href="/">
                                <span className="text-white text-xl font-bold">Chisperio</span>
                            </Link>
                        )}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-2 rounded-lg text-white hover:bg-white/20 transition-all"
                            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {sidebarCollapsed ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                )}
                            </svg>
                        </button>
                    </div>
                    <nav className="flex-1 space-y-2 px-4 py-6">
                        {navigation.map((item) => (
                            <Link
                                key={item.name}
                                href={route(item.href)}
                                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                                    route().current(item.current)
                                        ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-lg shadow-purple-500/30'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-[#40B0C2]'
                                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                                title={sidebarCollapsed ? item.name : ''}
                            >
                                {item.icon}
                                {!sidebarCollapsed && item.name}
                            </Link>
                        ))}
                    </nav>
                    <div className="border-t border-gray-100 p-4">
                        <a
                            href="/"
                            className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-gray-700 hover:text-[#40B0C2] bg-white/50 hover:bg-white/70 border border-gray-200/50 mb-4 ${sidebarCollapsed ? 'justify-center' : ''}`}
                            title={sidebarCollapsed ? 'Sitio Principal' : ''}
                        >
                            <svg className={`h-5 w-5 ${!sidebarCollapsed ? 'mr-3' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            {!sidebarCollapsed && 'Sitio Principal'}
                        </a>
                        {!sidebarCollapsed ? (
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button className="flex w-full items-center justify-between text-left px-4 py-3 bg-gradient-to-br from-gray-50 to-white rounded-xl hover:shadow-md transition-all">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#40B0C2] to-[#A72DAB] flex items-center justify-center text-white font-bold mr-3">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-800">{user.name}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content position="top" align="left">
                                    <Dropdown.Link href={route('profile.edit')}>Perfil</Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Cerrar Sesión
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        ) : (
                            <div className="flex flex-col items-center space-y-2">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#40B0C2] to-[#A72DAB] flex items-center justify-center text-white font-bold">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button className="p-2 rounded-lg hover:bg-gray-100 transition-all" title="Opciones">
                                            <svg className="h-5 w-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                            </svg>
                                        </button>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content position="top" align="left">
                                        <Dropdown.Link href={route('profile.edit')}>Perfil</Dropdown.Link>
                                        <Dropdown.Link href={route('logout')} method="post" as="button">
                                            Cerrar Sesión
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Contenido principal */}
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
                {/* Barra superior móvil */}
                <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow-sm lg:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="px-4 text-gray-500 hover:text-[#40B0C2] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#40B0C2] transition-colors"
                    >
                        <span className="sr-only">Abrir menú</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex flex-1 justify-between px-4">
                        <div className="flex flex-1 items-center">
                            <span className="text-lg font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">Chisperio</span>
                        </div>
                    </div>
                </div>

                {header && (
                    <header className="bg-white shadow-sm">
                        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                <main className="pb-8">{children}</main>
            </div>
        </div>
    );
}
