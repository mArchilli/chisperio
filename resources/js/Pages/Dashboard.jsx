import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                        Dashboard
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Bienvenido al panel de administración</p>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Card Categorías */}
                        <Link href={route('categorias.index')} className="group">
                            <div className="overflow-hidden bg-white shadow-xl sm:rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-[#40B0C2]/10 to-[#A72DAB]/10">
                                            <svg className="h-8 w-8 text-[#40B0C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <svg className="h-6 w-6 text-gray-400 group-hover:text-[#A72DAB] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Categorías</h3>
                                    <p className="text-gray-600">Gestiona las categorías de productos</p>
                                </div>
                                <div className="bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] h-1"></div>
                            </div>
                        </Link>

                        {/* Card Subcategorías - Info */}
                        <div className="overflow-hidden bg-white shadow-xl sm:rounded-2xl">
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#40B0C2]/10 to-[#A72DAB]/10">
                                        <svg className="h-8 w-8 text-[#A72DAB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Subcategorías</h3>
                                <p className="text-gray-600">Accede a las subcategorías desde cada categoría</p>
                            </div>
                            <div className="bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] h-1"></div>
                        </div>
                    </div>

                    {/* Welcome Card */}
                    <div className="mt-6 overflow-hidden bg-gradient-to-br from-[#40B0C2]/5 to-[#A72DAB]/5 shadow-xl sm:rounded-2xl border-2 border-gray-100">
                        <div className="p-8 text-center">
                            <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-[#40B0C2] to-[#A72DAB] mb-4">
                                <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent mb-2">
                                ¡Bienvenido al Sistema!
                            </h3>
                            <p className="text-gray-600 max-w-2xl mx-auto">
                                Estás autenticado correctamente. Utiliza el menú lateral para navegar por las diferentes secciones del sistema.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
