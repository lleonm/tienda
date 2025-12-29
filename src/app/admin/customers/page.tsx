'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { customersAPI } from '@/lib/api';
import { Customer } from '@/types';
import Modal, { ModalType } from '@/components/Modal';

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'frontend' | 'admin'>('all');

  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
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
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customersAPI.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      showNotification('error', 'Error', 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (customer: Customer) => {
    showNotification(
      'confirm',
      '¿Eliminar cliente?',
      `¿Estás seguro de eliminar a "${customer.name}"? Esta acción no se puede deshacer.`,
      async () => {
        try {
          await customersAPI.delete(customer.id);
          showNotification('success', '¡Eliminado!', 'Cliente eliminado exitosamente');
          loadCustomers();
        } catch (error) {
          console.error('Error eliminando cliente:', error);
          showNotification('error', 'Error', 'No se pudo eliminar el cliente');
        }
      }
    );
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phones && customer.phones.some(phone => phone.includes(searchTerm)));

    const matchesOrigin = 
      filterOrigin === 'all' || 
      customer.createdBy === filterOrigin;

    return matchesSearch && matchesOrigin;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando clientes...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👥 Clientes</h1>
          <p className="text-gray-600 mt-1">Gestiona la base de clientes</p>
        </div>
        <button
          onClick={() => router.push('/admin/customers/new')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
        >
          ➕ Agregar Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clientes</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{customers.length}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {customers.filter(c => c.isActive).length}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Registrados Web</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {customers.filter(c => c.createdBy === 'frontend').length}
              </p>
            </div>
            <div className="text-4xl">🌐</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={filterOrigin}
            onChange={(e) => setFilterOrigin(e.target.value as any)}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Todos los orígenes</option>
            <option value="frontend">Registrados (Web)</option>
            <option value="admin">Creados (Admin)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identificación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direcciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <div className="text-4xl mb-2">👤</div>
                      <p className="text-lg">No se encontraron clientes</p>
                      <p className="text-sm mt-1">
                        {searchTerm || filterOrigin !== 'all'
                          ? 'Intenta con otros filtros'
                          : 'Agrega tu primer cliente'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const defaultAddress = customer.addresses?.find(addr => addr.isDefault) || customer.addresses?.[0];
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-500">ID: {customer.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 font-medium">
                            {customer.identificationType === 'fisica' && '🇨🇷 Cédula Física'}
                            {customer.identificationType === 'juridica' && '🏬 Cédula Jurídica'}
                            {customer.identificationType === 'dimex' && '🌎 DIMEX'}
                            {customer.identificationType === 'pasaporte' && '✈️ Pasaporte'}
                          </div>
                          <div className="text-gray-600 font-mono">{customer.identificationNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">{customer.email}</div>
                          <div className="text-gray-500 mt-1">
                            {customer.phones && customer.phones.length > 0 ? (
                              customer.phones.map((phone, i) => (
                                <div key={i}>📱 {phone}</div>
                              ))
                            ) : (
                              <div className="text-gray-400">Sin teléfono</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {customer.addresses && customer.addresses.length > 0 ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  📍 {customer.addresses.length} {customer.addresses.length === 1 ? 'dirección' : 'direcciones'}
                                </span>
                              </div>
                              {defaultAddress && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {defaultAddress.label && <span className="text-blue-600">({defaultAddress.label})</span>}
                                  {' '}{defaultAddress.direccionExacta?.substring(0, 30)}{defaultAddress.direccionExacta && defaultAddress.direccionExacta.length > 30 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-gray-400">Sin dirección</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            customer.createdBy === 'frontend'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {customer.createdBy === 'frontend' ? '🌐 Web' : '👨‍💼 Admin'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            customer.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {customer.isActive ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => router.push(`/admin/customers/${customer.id}/edit`)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(customer)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeNotification}
        onConfirm={modal.onConfirm}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />
    </div>
  );
}
