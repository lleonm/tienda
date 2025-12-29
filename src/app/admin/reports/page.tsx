'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Customer } from '@/types';
import { ordersAPI, customersAPI } from '@/lib/api';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'annual';

interface ReportData {
  period: string;
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  averageTicket: number;
  orders: Order[];
}

export default function ReportsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [selectedDate, setSelectedDate] = useState(''); // Para diario
  const [selectedMonth, setSelectedMonth] = useState(''); // Para mensual (YYYY-MM)
  const [selectedYear, setSelectedYear] = useState(''); // Para anual
  const [startDate, setStartDate] = useState(''); // Para semanal
  const [endDate, setEndDate] = useState(''); // Para semanal
  
  // Reporte generado
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    loadData();
    initializeDates();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, customersData] = await Promise.all([
        ordersAPI.getAll(),
        customersAPI.getAll()
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeDates = () => {
    const today = new Date();
    
    // Función helper para obtener fecha local en formato YYYY-MM-DD
    const getLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Inicializar fecha para diario
    setSelectedDate(getLocalDateString(today));
    
    // Inicializar mes para mensual (formato YYYY-MM)
    const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(yearMonth);
    
    // Inicializar año para anual
    setSelectedYear(today.getFullYear().toString());
    
    // Inicializar rango para semanal (última semana)
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    setStartDate(getLocalDateString(lastWeek));
    setEndDate(getLocalDateString(today));
  };

  const getAvailableYears = () => {
    if (orders.length === 0) return [new Date().getFullYear().toString()];
    
    const years = new Set<number>();
    orders.forEach(order => {
      const year = new Date(order.createdAt).getFullYear();
      years.add(year);
    });
    
    // Agregar año actual si no está
    years.add(new Date().getFullYear());
    
    return Array.from(years).sort((a, b) => b - a).map(y => y.toString());
  };

  const generateReport = () => {
    let start: Date;
    let end: Date;
    let period = '';

    switch (reportType) {
      case 'daily':
        if (!selectedDate) return;
        // Crear fecha con zona horaria local para evitar problemas
        const [yearDay, monthDay, day] = selectedDate.split('-').map(Number);
        start = new Date(yearDay, monthDay - 1, day, 0, 0, 0, 0);
        end = new Date(yearDay, monthDay - 1, day, 23, 59, 59, 999);
        period = `Día ${start.toLocaleDateString('es-CR', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        })}`;
        break;
        
      case 'weekly':
        if (!startDate || !endDate) return;
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        period = `Semana del ${start.toLocaleDateString('es-CR')} al ${end.toLocaleDateString('es-CR')}`;
        break;
        
      case 'monthly':
        if (!selectedMonth) return;
        const [year, month] = selectedMonth.split('-').map(Number);
        start = new Date(year, month - 1, 1);
        end = new Date(year, month, 0, 23, 59, 59, 999);
        period = start.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
        break;
        
      case 'annual':
        if (!selectedYear) return;
        const yearNum = parseInt(selectedYear);
        start = new Date(yearNum, 0, 1);
        end = new Date(yearNum, 11, 31, 23, 59, 59, 999);
        period = `Año ${yearNum}`;
        break;
        
      default:
        return;
    }

    // Filtrar órdenes por rango de fechas
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate <= end;
    });

    // Calcular métricas
    const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const totalProducts = filteredOrders.reduce((sum, order) => 
      sum + order.products.reduce((pSum, p) => pSum + p.quantity, 0), 0
    );
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    setReportData({
      period,
      totalSales,
      totalOrders,
      totalProducts,
      averageTicket,
      orders: filteredOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    });
  };

  const handlePrint = () => {
    // Debug: Imprimir el HTML del reporte en consola
    const reportElement = document.querySelector('.print-report');
    if (reportElement) {
      console.log('=== HTML DEL REPORTE ===');
      console.log(reportElement.outerHTML);
      console.log('=== DIMENSIONES DEL REPORTE ===');
      console.log('Altura:', reportElement.scrollHeight, 'px');
      console.log('Ancho:', reportElement.scrollWidth, 'px');
      console.log('Altura del viewport:', window.innerHeight, 'px');
      console.log('=== DIMENSIONES DE CADA SECCIÓN ===');
      Array.from(reportElement.children).forEach((child, index) => {
        const el = child as HTMLElement;
        console.log(`  ${index + 1}. ${child.className}`);
        console.log(`     Altura: ${el.scrollHeight}px, Padding: ${getComputedStyle(el).padding}`);
      });
    }
    
    // Agregar clase especial al body antes de imprimir
    document.body.classList.add('printing-report');
    
    // Esperar un momento para que los estilos se apliquen
    setTimeout(() => {
      window.print();
      
      // Remover la clase después de imprimir/cancelar
      setTimeout(() => {
        document.body.classList.remove('printing-report');
      }, 100);
    }, 100);
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'N/A';
  };

  const getReportTypeLabel = (type: ReportType) => {
    const labels = {
      daily: 'Diario',
      weekly: 'Semanal',
      monthly: 'Mensual',
      annual: 'Anual'
    };
    return labels[type];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Controles - se ocultan al imprimir */}
      <div className="print:hidden bg-white shadow-sm border-b p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📄 Reportes de Ventas</h1>
              <p className="text-gray-600 mt-1">Genera reportes detallados e imprimibles</p>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ← Volver
            </button>
          </div>

          {/* Filtros */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Reporte
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual</option>
                </select>
              </div>

              {/* Controles según tipo de reporte */}
              {reportType === 'daily' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecciona el Día
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {reportType === 'weekly' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {reportType === 'monthly' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecciona el Mes
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {reportType === 'annual' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecciona el Año
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    {getAvailableYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <button
                onClick={generateReport}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Generar Reporte
              </button>
              {reportData && (
                <button
                  onClick={handlePrint}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  🖨️ Imprimir
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reporte imprimible */}
      {reportData ? (
        <div className="max-w-7xl mx-auto p-6 print:p-0 print:max-w-full">
          <div className="bg-white rounded-lg shadow-lg print:shadow-none print-report">
            {/* Encabezado del reporte */}
            <div className="border-b-2 border-gray-200 p-6 print:border-black print:p-2 print:pb-1">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 print:text-xl">Tienda Online</h1>
                <h2 className="text-xl text-gray-700 mt-2 print:text-lg print:mt-0">
                  Reporte de Ventas {getReportTypeLabel(reportType)}
                </h2>
                <p className="text-lg text-gray-600 mt-1 print:text-base print:mt-0">{reportData.period}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Generado: {new Date().toLocaleDateString('es-CR', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Resumen ejecutivo */}
            <div className="p-6 print:p-2 print:py-1">
              <h3 className="text-lg font-bold text-gray-900 mb-4 print:text-base print:mb-1">Resumen Ejecutivo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-2 print:gap-1">
                <div className="border rounded-lg p-4 print:border-gray-400 print:p-1">
                  <p className="text-sm text-gray-600 print:text-xs">Total Ventas</p>
                  <p className="text-2xl font-bold text-green-600 print:text-black print:text-base">
                    ₡{reportData.totalSales.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="border rounded-lg p-4 print:border-gray-400 print:p-1">
                  <p className="text-sm text-gray-600 print:text-xs">Órdenes</p>
                  <p className="text-2xl font-bold text-blue-600 print:text-black print:text-base">
                    {reportData.totalOrders}
                  </p>
                </div>
                <div className="border rounded-lg p-4 print:border-gray-400 print:p-1">
                  <p className="text-sm text-gray-600 print:text-xs">Productos Vendidos</p>
                  <p className="text-2xl font-bold text-purple-600 print:text-black print:text-base">
                    {reportData.totalProducts}
                  </p>
                </div>
                <div className="border rounded-lg p-4 print:border-gray-400 print:p-1">
                  <p className="text-sm text-gray-600 print:text-xs">Ticket Promedio</p>
                  <p className="text-2xl font-bold text-orange-600 print:text-black print:text-base">
                    ₡{reportData.averageTicket.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalle de órdenes */}
            <div className="p-6 print:p-2 print:py-1">
              <h3 className="text-lg font-bold text-gray-900 mb-4 print:text-base print:mb-1">Detalle de Órdenes</h3>
              
              {reportData.orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay órdenes en el período seleccionado
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 print:bg-gray-200">
                        <th className="border p-2 text-left text-sm font-semibold print:border-black print:p-1 print:text-xs">
                          # Orden
                        </th>
                        <th className="border p-2 text-left text-sm font-semibold print:border-black print:p-1 print:text-xs">
                          Fecha
                        </th>
                        <th className="border p-2 text-left text-sm font-semibold print:border-black print:p-1 print:text-xs">
                          Cliente
                        </th>
                        <th className="border p-2 text-left text-sm font-semibold print:border-black print:p-1 print:text-xs">
                          Estado
                        </th>
                        <th className="border p-2 text-right text-sm font-semibold print:border-black print:p-1 print:text-xs">
                          Subtotal
                        </th>
                        <th className="border p-2 text-right text-sm font-semibold print:border-black print:p-1 print:text-xs">
                          IVA
                        </th>
                        <th className="border p-2 text-right text-sm font-semibold print:border-black print:p-1 print:text-xs">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 print:hover:bg-white">
                          <td className="border p-2 text-sm print:border-black print:p-1 print:text-xs">
                            {order.orderNumber}
                          </td>
                          <td className="border p-2 text-sm print:border-black print:p-1 print:text-xs">
                            {new Date(order.createdAt).toLocaleDateString('es-CR')}
                          </td>
                          <td className="border p-2 text-sm print:border-black print:p-1 print:text-xs">
                            {getCustomerName(order.customerId)}
                          </td>
                          <td className="border p-2 text-sm print:border-black print:p-1 print:text-xs">
                            <span className={`px-2 py-1 rounded text-xs print:px-0 print:py-0 ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800 print:bg-white print:text-black' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800 print:bg-white print:text-black' :
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-800 print:bg-white print:text-black' :
                              'bg-yellow-100 text-yellow-800 print:bg-white print:text-black'
                            }`}>
                              {order.status === 'pending' ? 'Pendiente' :
                               order.status === 'processing' ? 'En Proceso' :
                               order.status === 'shipped' ? 'Enviado' :
                               order.status === 'delivered' ? 'Entregado' :
                               'Cancelado'}
                            </span>
                          </td>
                          <td className="border p-2 text-sm text-right print:border-black print:p-1 print:text-xs">
                            ₡{order.subtotal.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="border p-2 text-sm text-right print:border-black print:p-1 print:text-xs">
                            ₡{order.tax.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="border p-2 text-sm text-right font-semibold print:border-black print:p-1 print:text-xs">
                            ₡{order.total.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {/* Fila de totales */}
                      <tr className="bg-gray-100 font-bold print:bg-gray-300">
                        <td colSpan={4} className="border p-2 text-right print:border-black print:p-1 print:text-xs">
                          TOTALES:
                        </td>
                        <td className="border p-2 text-right print:border-black print:p-1 print:text-xs">
                          ₡{reportData.orders.reduce((sum, o) => sum + o.subtotal, 0).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border p-2 text-right print:border-black print:p-1 print:text-xs">
                          ₡{reportData.orders.reduce((sum, o) => sum + o.tax, 0).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="border p-2 text-right print:border-black print:p-1 print:text-xs">
                          ₡{reportData.totalSales.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pie de página */}
            <div className="border-t p-6 text-center text-sm text-gray-500 print:border-black print:p-1 print:text-xs">
              <p>Este documento es un reporte oficial de Tienda Online</p>
              <p className="mt-1 print:mt-0">Para consultas contactar: info@tiendaonline.com</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Selecciona los parámetros y genera un reporte
            </h2>
            <p className="text-gray-600">
              Configura el tipo de reporte y el rango de fechas arriba, luego haz clic en "Generar Reporte"
            </p>
          </div>
        </div>
      )}

      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5cm;
            size: A4;
          }
          
          /* Ocultar header, sidebar y cualquier contenedor padre */
          body.printing-report header,
          body.printing-report aside,
          body.printing-report nav,
          body.printing-report > #__next > div > header,
          body.printing-report > #__next > div > div > aside,
          body.printing-report > div[id] {
            display: none !important;
          }
          
          /* Ocultar el div flex que contiene sidebar + main */
          body.printing-report .flex:has(aside) {
            display: block !important;
          }
          
          body.printing-report .flex:has(aside) > aside {
            display: none !important;
          }
          
          /* Resetear body para impresión */
          body.printing-report {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          /* Mostrar SOLO el reporte */
          body.printing-report .print-report {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* Ocultar controles */
          .print\\:hidden {
            display: none !important;
          }
          
          /* Estilos compactos */
          .print\\:p-0 { padding: 0 !important; }
          .print\\:p-1 { padding: 0.25rem !important; }
          .print\\:p-2 { padding: 0.5rem !important; }
          .print\\:py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
          .print\\:pb-1 { padding-bottom: 0.25rem !important; }
          .print\\:mb-1 { margin-bottom: 0.25rem !important; }
          .print\\:mt-0 { margin-top: 0 !important; }
          .print\\:gap-1 { gap: 0.25rem !important; }
          .print\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .print\\:max-w-full { max-width: 100% !important; }
          
          .print\\:text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
          .print\\:text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
          .print\\:text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
          .print\\:text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
          
          .print\\:border-black { border-color: black !important; }
          .print\\:text-black { color: black !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:bg-gray-200 { background-color: #e5e7eb !important; }
          .print\\:bg-gray-300 { background-color: #d1d5db !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-gray-400 { border-color: #9ca3af !important; }
          
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  );
}
