import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center sm:items-start">
        <h1 className="text-4xl font-bold">Tienda Online</h1>
        <p className="text-xl">Bienvenido a tu tienda de ropa y accesorios</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mt-8">
          <Link 
            href="/admin"
            className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-gradient-to-br from-indigo-50 to-blue-50"
          >
            <h2 className="text-2xl font-semibold mb-2">Panel de Administración</h2>
            <p className="text-gray-600">Gestiona usuarios, inventario y ventas</p>
            <span className="inline-block mt-4 text-indigo-600 font-medium">Acceder →</span>
          </Link>
          
          <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-2">Inventario</h2>
            <p className="text-gray-600">Control de productos y stock</p>
          </div>
          
          <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-2">Facturación</h2>
            <p className="text-gray-600">Gestión de ventas y facturas</p>
          </div>
        </div>
      </main>
    </div>
  );
}
