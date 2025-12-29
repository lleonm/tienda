'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order } from '@/types';
import { ordersAPI } from '@/lib/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

type TimeRange = 'week' | 'month' | 'year';

interface DailySales {
  date: string;
  sales: number;
  orders: number;
}

interface StatusStats {
  name: string;
  value: number;
  color: string;
}

export default function StatisticsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await ordersAPI.getAll();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error cargando órdenes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDailySales = (): DailySales[] => {
    const now = new Date();
    const daysToShow = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    
    const dailyData: { [key: string]: { sales: number; orders: number } } = {};
    
    // Inicializar con ceros
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { sales: 0, orders: 0 };
    }
    
    // Agregar ventas reales
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      if (dailyData[orderDate]) {
        dailyData[orderDate].sales += order.total;
        dailyData[orderDate].orders += 1;
      }
    });
    
    return Object.entries(dailyData).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('es-CR', { month: 'short', day: 'numeric' }),
      sales: data.sales,
      orders: data.orders
    }));
  };

  const getWeeklySales = (): DailySales[] => {
    const now = new Date();
    const weeks = timeRange === 'year' ? 52 : 12;
    
    const weeklyData: { [key: string]: { sales: number; orders: number } } = {};
    
    // Inicializar semanas
    for (let i = weeks - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7));
      const weekNum = Math.ceil((date.getDate()) / 7);
      const monthYear = date.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' });
      const key = `S${weekNum} ${monthYear}`;
      weeklyData[key] = { sales: 0, orders: 0 };
    }
    
    // Agregar ventas reales
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const weekNum = Math.ceil(orderDate.getDate() / 7);
      const monthYear = orderDate.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' });
      const key = `S${weekNum} ${monthYear}`;
      
      if (weeklyData[key]) {
        weeklyData[key].sales += order.total;
        weeklyData[key].orders += 1;
      }
    });
    
    return Object.entries(weeklyData).map(([date, data]) => ({
      date,
      sales: data.sales,
      orders: data.orders
    }));
  };

  const getMonthlySales = (): DailySales[] => {
    const now = new Date();
    const months = 12;
    
    const monthlyData: { [key: string]: { sales: number; orders: number } } = {};
    
    // Inicializar meses
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' });
      monthlyData[key] = { sales: 0, orders: 0 };
    }
    
    // Agregar ventas reales
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const key = orderDate.toLocaleDateString('es-CR', { month: 'short', year: 'numeric' });
      
      if (monthlyData[key]) {
        monthlyData[key].sales += order.total;
        monthlyData[key].orders += 1;
      }
    });
    
    return Object.entries(monthlyData).map(([date, data]) => ({
      date,
      sales: data.sales,
      orders: data.orders
    }));
  };

  const getStatusStats = (): StatusStats[] => {
    const statusColors: { [key: string]: string } = {
      pending: '#FCD34D',
      processing: '#60A5FA',
      shipped: '#A78BFA',
      delivered: '#34D399',
      cancelled: '#F87171'
    };
    
    const statusNames: { [key: string]: string } = {
      pending: 'Pendiente',
      processing: 'En Proceso',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };
    
    const statusCount: { [key: string]: number } = {};
    
    orders.forEach(order => {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    });
    
    return Object.entries(statusCount).map(([status, value]) => ({
      name: statusNames[status] || status,
      value,
      color: statusColors[status] || '#9CA3AF'
    }));
  };

  const getTotalSales = () => {
    return orders.reduce((sum, order) => sum + order.total, 0);
  };

  const getAverageSale = () => {
    return orders.length > 0 ? getTotalSales() / orders.length : 0;
  };

  const getTopProducts = () => {
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    orders.forEach(order => {
      order.products.forEach(product => {
        if (!productSales[product.productSku]) {
          productSales[product.productSku] = {
            name: product.productName,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[product.productSku].quantity += product.quantity;
        productSales[product.productSku].revenue += product.subtotal;
      });
    });
    
    return Object.entries(productSales)
      .map(([sku, data]) => ({ sku, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando estadísticas...</div>
      </div>
    );
  }

  const dailySalesData = getDailySales();
  const weeklySalesData = getWeeklySales();
  const monthlySalesData = getMonthlySales();
  const statusStats = getStatusStats();
  const topProducts = getTopProducts();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Estadísticas de Ventas</h1>
          <p className="text-gray-600 mt-1">Análisis y métricas de rendimiento</p>
        </div>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          ← Volver al Dashboard
        </button>
      </div>

      {/* Resumen de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-medium opacity-90">Total Ventas</div>
          <div className="text-3xl font-bold mt-2">
            ₡{getTotalSales().toLocaleString('es-CR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-medium opacity-90">Órdenes Totales</div>
          <div className="text-3xl font-bold mt-2">{orders.length}</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-medium opacity-90">Venta Promedio</div>
          <div className="text-3xl font-bold mt-2">
            ₡{getAverageSale().toLocaleString('es-CR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-sm font-medium opacity-90">Productos Vendidos</div>
          <div className="text-3xl font-bold mt-2">
            {orders.reduce((sum, order) => sum + order.products.reduce((pSum, p) => pSum + p.quantity, 0), 0)}
          </div>
        </div>
      </div>

      {/* Selector de rango de tiempo */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTimeRange('week')}
          className={`px-4 py-2 rounded-lg font-medium ${
            timeRange === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Última Semana
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-4 py-2 rounded-lg font-medium ${
            timeRange === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Último Mes
        </button>
        <button
          onClick={() => setTimeRange('year')}
          className={`px-4 py-2 rounded-lg font-medium ${
            timeRange === 'year'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Último Año
        </button>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ventas diarias */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Ventas por Día</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `₡${value.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} name="Ventas (₡)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Órdenes por día */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📦 Órdenes por Día</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" fill="#10B981" name="Órdenes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ventas semanales */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Ventas por Semana</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `₡${value.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Bar dataKey="sales" fill="#8B5CF6" name="Ventas (₡)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ventas mensuales */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📆 Ventas por Mes</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `₡${value.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#F59E0B" strokeWidth={2} name="Ventas (₡)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de órdenes */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Estado de Órdenes</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top productos */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Top 5 Productos</h2>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.quantity} unidades vendidas</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    ₡{product.revenue.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay datos de productos aún
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
