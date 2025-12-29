'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tienda Online</h1>
              <p className="text-sm text-gray-600">Panel de Administración</p>
            </div>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800"
            >
              Ver Tienda →
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            <Link
              href="/admin/dashboard"
              className={`block px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin/dashboard')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              📊 Dashboard
            </Link>
            
            <Link
              href="/admin/statistics"
              className={`block px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin/statistics')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              📈 Estadísticas
            </Link>
            
            <Link
              href="/admin/reports"
              className={`block px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin/reports')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              📄 Reportes
            </Link>
            
            <Link
              href="/admin/catalogo"
              className={`block px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin/catalogo')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              📦 Catálogo
            </Link>
            
            <Link
              href="/admin/products"
              className={`block px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin/products')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              🏷️ Productos
            </Link>
            
            <Link
              href="/admin/users"
              className={`block px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin/users')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              👥 Usuarios
            </Link>

            <Link
              href="/admin/customers"
              className={`block px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin/customers')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              👤 Clientes
            </Link>

            <Link
              href="/admin/configuration"
              className={`block px-4 py-2 rounded-lg transition-colors ${
                isActive('/admin/configuration')
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              ⚙️ Configuración
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
