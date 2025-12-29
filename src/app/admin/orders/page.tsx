'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Order, Customer, Product } from '@/types';
import { ordersAPI, customersAPI, productsAPI } from '@/lib/api';

type ModalType = 'success' | 'error' | 'confirm';

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'orderNumber'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showNotification = (type: ModalType, title: string, message: string, onConfirm?: () => void) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeNotification = () => {
    setModal({ ...modal, isOpen: false });
  };

  useEffect(() => {
    loadOrders();
    loadCustomers();
    loadProducts();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersAPI.getAll();
      setOrders(data);
    } catch (error) {
      console.error('Error cargando órdenes:', error);
      showNotification('error', 'Error', 'No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await customersAPI.getAll();
      setCustomers(data.filter(c => c.isActive));
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll();
      // Solo productos activos con stock
      setProducts(data.filter(p => p.isActive && p.stock > 0 && !p.isParent));
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const handleCancelOrder = (order: Order) => {
    showNotification(
      'confirm',
      '¿Cancelar orden?',
      `¿Está seguro de cancelar la orden ${order.orderNumber}? El inventario será restaurado.`,
      async () => {
        try {
          // Restaurar inventario
          for (const orderProd of order.products) {
            const product = products.find(p => p.id === orderProd.productId);
            if (product) {
              await productsAPI.update(product.id, {
                stock: product.stock + orderProd.quantity,
              });
            }
          }

          await ordersAPI.update(order.id, {
            status: 'cancelled',
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin', // TODO: usar usuario real
          });

          showNotification('success', '¡Cancelada!', 'Orden cancelada e inventario restaurado');
          loadOrders();
          loadProducts();
        } catch (error) {
          console.error('Error cancelando orden:', error);
          showNotification('error', 'Error', 'No se pudo cancelar la orden');
        }
      }
    );
  };

  const handleChangeStatus = (order: Order, newStatus: Order['status']) => {
    showNotification(
      'confirm',
      'Cambiar estado',
      `¿Cambiar estado de la orden ${order.orderNumber} a "${statusLabels[newStatus]}"?`,
      async () => {
        try {
          await ordersAPI.update(order.id, {
            status: newStatus,
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin', // TODO: usar usuario real
          });
          showNotification('success', '¡Actualizada!', 'Estado de la orden actualizado');
          loadOrders();
        } catch (error) {
          console.error('Error actualizando orden:', error);
          showNotification('error', 'Error', 'No se pudo actualizar el estado');
        }
      }
    );
  };

  const handlePrintOrder = (order: Order) => {
    setViewingOrder(order);
    // Esperar a que el modal se muestre antes de imprimir
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const statusLabels: Record<Order['status'], string> = {
    pending: 'Pendiente',
    processing: 'En Proceso',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };

  const statusColors: Record<Order['status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
        case 'orderNumber':
          comparison = a.orderNumber.localeCompare(b.orderNumber);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Cargando órdenes...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Órdenes</h1>
        <p className="text-gray-600">Administra las órdenes de compra</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Órdenes</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-sm text-yellow-600">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4">
          <div className="text-sm text-blue-600">En Proceso</div>
          <div className="text-2xl font-bold text-blue-900">{stats.processing}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-green-600">Completadas</div>
          <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <div className="text-sm text-red-600">Canceladas</div>
          <div className="text-2xl font-bold text-red-900">{stats.cancelled}</div>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-4">
          <div className="text-sm text-purple-600">Ingresos</div>
          <div className="text-2xl font-bold text-purple-900">
            ₡{stats.totalRevenue.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder="Buscar por número o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="processing">En Proceso</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Ordenar por Fecha</option>
              <option value="orderNumber">Ordenar por Número</option>
              <option value="total">Ordenar por Total</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              {sortOrder === 'asc' ? '↑ Ascendente' : '↓ Descendente'}
            </button>
            
            <button
              onClick={() => router.push('/admin/orders/new')}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              + Nueva Orden
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Órdenes */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron órdenes
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{order.orderNumber}</div>
                      <div className="text-sm text-gray-500">{order.products.length} productos</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{order.customerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString('es-CR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ₡{order.total.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setViewingOrder(order);
                            setShowModal(true);
                          }}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                        >
                          Ver
                        </button>
                        
                        <button
                          onClick={() => handlePrintOrder(order)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                        >
                          Imprimir
                        </button>

                        {order.status !== 'cancelled' && order.status !== 'completed' && (
                          <>
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleChangeStatus(order, 'processing')}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                              >
                                Procesar
                              </button>
                            )}
                            
                            {order.status === 'processing' && (
                              <button
                                onClick={() => handleChangeStatus(order, 'completed')}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                              >
                                Completar
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleCancelOrder(order)}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ver Orden */}
      {showModal && viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Orden {viewingOrder.orderNumber}</h2>
                  <p className="text-gray-600 mt-1">
                    Creada el {new Date(viewingOrder.createdAt).toLocaleString('es-CR')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setViewingOrder(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Info Cliente */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Cliente</h3>
                <p className="text-gray-700">{viewingOrder.customerName}</p>
              </div>

              {/* Productos */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Precio</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Cantidad</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {viewingOrder.products.map((prod, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm">{prod.productName}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{prod.productSku}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            ₡{prod.price.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{prod.quantity}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">
                            ₡{prod.subtotal.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span>₡{viewingOrder.subtotal.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>IVA (13%):</span>
                  <span>₡{viewingOrder.tax.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                  <span>Total:</span>
                  <span>₡{viewingOrder.total.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Notas */}
              {viewingOrder.notes && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
                  <p className="text-gray-700">{viewingOrder.notes}</p>
                </div>
              )}

              {/* Estado y Auditoría */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Estado:</span>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${statusColors[viewingOrder.status]}`}>
                      {statusLabels[viewingOrder.status]}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Creado por:</span>
                    <span className="ml-2 text-gray-900">{viewingOrder.createdBy}</span>
                  </div>
                  {viewingOrder.updatedBy && (
                    <div>
                      <span className="text-gray-600">Actualizado por:</span>
                      <span className="ml-2 text-gray-900">{viewingOrder.updatedBy}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notificaciones */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className={`text-xl font-bold mb-4 ${
              modal.type === 'success' ? 'text-green-600' : 
              modal.type === 'error' ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {modal.title}
            </h3>
            <p className="text-gray-700 mb-6">{modal.message}</p>
            <div className="flex gap-3">
              {modal.type === 'confirm' ? (
                <>
                  <button
                    onClick={closeNotification}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      modal.onConfirm?.();
                      closeNotification();
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Confirmar
                  </button>
                </>
              ) : (
                <button
                  onClick={closeNotification}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Aceptar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Contenido para imprimir */}
      {viewingOrder && (
        <div className="print-content hidden print:block">
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold">ORDEN DE COMPRA</h1>
              <p className="text-xl mt-2">{viewingOrder.orderNumber}</p>
            </div>

            <div className="mb-6">
              <p><strong>Fecha:</strong> {new Date(viewingOrder.createdAt).toLocaleString('es-CR')}</p>
              <p><strong>Cliente:</strong> {viewingOrder.customerName}</p>
              <p><strong>Estado:</strong> {statusLabels[viewingOrder.status]}</p>
            </div>

            <table className="w-full mb-6 border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2">Producto</th>
                  <th className="text-left py-2">SKU</th>
                  <th className="text-right py-2">Precio</th>
                  <th className="text-right py-2">Cant.</th>
                  <th className="text-right py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {viewingOrder.products.map((prod, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">{prod.productName}</td>
                    <td className="py-2">{prod.productSku}</td>
                    <td className="text-right py-2">₡{prod.price.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right py-2">{prod.quantity}</td>
                    <td className="text-right py-2">₡{prod.subtotal.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-right space-y-2">
              <p><strong>Subtotal:</strong> ₡{viewingOrder.subtotal.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</p>
              <p><strong>IVA (13%):</strong> ₡{viewingOrder.tax.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</p>
              <p className="text-xl font-bold border-t-2 border-black pt-2">
                <strong>Total:</strong> ₡{viewingOrder.total.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {viewingOrder.notes && (
              <div className="mt-6">
                <p><strong>Notas:</strong></p>
                <p>{viewingOrder.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
