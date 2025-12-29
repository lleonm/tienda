'use client';

import { useState, useEffect } from 'react';
import { customersAPI } from '@/lib/api';
import { Customer, CostaRicaGeografia, Provincia, Canton, Distrito } from '@/types';
import Modal, { ModalType } from '@/components/Modal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrigin, setFilterOrigin] = useState<'all' | 'frontend' | 'admin'>('all');

  // Estados para geografía de Costa Rica
  const [geografia, setGeografia] = useState<CostaRicaGeografia | null>(null);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cantones, setCantones] = useState<Canton[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [selectedProvinciaId, setSelectedProvinciaId] = useState<number | null>(null);
  const [selectedCantonId, setSelectedCantonId] = useState<number | null>(null);

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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    identificationType: 'fisica' as 'fisica' | 'juridica' | 'dimex' | 'pasaporte',
    identificationNumber: '',
    phones: [''],
    address: {
      provinciaCodigo: '',
      cantonCodigo: '',
      distritoCodigo: '',
      direccionExacta: '',
      codigoPostal: '',
    },
    isActive: true,
  });

  const showNotification = (type: ModalType, title: string, message: string, onConfirm?: () => void) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeNotification = () => {
    setModal({ ...modal, isOpen: false });
  };

  useEffect(() => {
    loadCustomers();
    loadGeografia();
  }, []);

  const loadGeografia = async () => {
    try {
      const response = await fetch('/data/costa_rica_geografia.json');
      const data: CostaRicaGeografia = await response.json();
      setGeografia(data);
      setProvincias(data.provincias);
    } catch (error) {
      console.error('Error cargando geografía:', error);
      showNotification('error', 'Error', 'No se pudo cargar la geografía de Costa Rica');
    }
  };

  // Helper para obtener nombres desde códigos
  const getAddressNames = (customer: Customer) => {
    if (!customer.address || !geografia) return null;
    
    const provincia = geografia.provincias.find(p => p.codigo === customer.address.provinciaCodigo);
    const canton = geografia.cantones.find(c => c.codigo === customer.address.cantonCodigo);
    const distrito = geografia.distritos.find(d => d.codigo === customer.address.distritoCodigo);
    
    return {
      provinciaNombre: provincia?.nombre || customer.address.provinciaCodigo,
      cantonNombre: canton?.nombre || customer.address.cantonCodigo,
      distritoNombre: distrito?.nombre || customer.address.distritoCodigo,
    };
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name.trim()) {
      showNotification('warning', 'Campo requerido', 'El nombre es obligatorio');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      showNotification('warning', 'Email inválido', 'Ingresa un email válido');
      return;
    }

    const validPhones = formData.phones.filter(p => p.trim());
    if (validPhones.length === 0) {
      showNotification('warning', 'Campo requerido', 'Agrega al menos un teléfono');
      return;
    }

    try {
      const customerData = {
        ...formData,
        phones: validPhones,
        createdBy: 'admin' as const,
        createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, customerData);
        showNotification('success', '¡Actualizado!', 'Cliente actualizado exitosamente');
      } else {
        await customersAPI.create(customerData);
        showNotification('success', '¡Creado!', 'Cliente creado exitosamente');
      }

      setShowModal(false);
      resetForm();
      loadCustomers();
    } catch (error) {
      console.error('Error guardando cliente:', error);
      showNotification('error', 'Error', 'No se pudo guardar el cliente');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    
    // Cargar cantones y distritos ANTES de abrir el modal
    if (geografia && customer.address?.provinciaCodigo) {
      const provincia = geografia.provincias.find(p => p.codigo === customer.address.provinciaCodigo);
      if (provincia) {
        setSelectedProvinciaId(provincia.id);
        const cantonesFiltrados = geografia.cantones.filter(c => c.provinciaId === provincia.id);
        setCantones(cantonesFiltrados);

        if (customer.address?.cantonCodigo) {
          const canton = cantonesFiltrados.find(c => c.codigo === customer.address.cantonCodigo);
          if (canton) {
            setSelectedCantonId(canton.id);
            const distritosFiltrados = geografia.distritos.filter(d => d.cantonId === canton.id);
            setDistritos(distritosFiltrados);
          }
        }
      }
    }

    // Establecer formData después de cargar los selectores
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      identificationType: customer.identificationType || 'fisica',
      identificationNumber: customer.identificationNumber || '',
      phones: customer.phones && customer.phones.length > 0 ? customer.phones : [''],
      address: {
        provinciaCodigo: customer.address?.provinciaCodigo || '',
        cantonCodigo: customer.address?.cantonCodigo || '',
        distritoCodigo: customer.address?.distritoCodigo || '',
        direccionExacta: customer.address?.direccionExacta || '',
        codigoPostal: customer.address?.codigoPostal || '',
      },
      isActive: customer.isActive ?? true,
    });
    
    // Pequeño delay para asegurar que los estados se actualicen
    setTimeout(() => {
      setShowModal(true);
    }, 50);
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

  const resetForm = () => {
    setEditingCustomer(null);
    setSelectedProvinciaId(null);
    setSelectedCantonId(null);
    setCantones([]);
    setDistritos([]);
    setFormData({
      name: '',
      email: '',
      identificationType: 'fisica' as 'fisica' | 'juridica' | 'dimex' | 'pasaporte',
      identificationNumber: '',
      phones: [''],
      address: {
        provinciaCodigo: '',
        cantonCodigo: '',
        distritoCodigo: '',
        direccionExacta: '',
        codigoPostal: '',
      },
      isActive: true,
    });
  };

  const addPhoneField = () => {
    setFormData({ ...formData, phones: [...formData.phones, ''] });
  };

  const removePhoneField = (index: number) => {
    const newPhones = formData.phones.filter((_, i) => i !== index);
    setFormData({ ...formData, phones: newPhones.length > 0 ? newPhones : [''] });
  };

  const updatePhone = (index: number, value: string) => {
    const newPhones = [...formData.phones];
    newPhones[index] = value;
    setFormData({ ...formData, phones: newPhones });
  };

  // Funciones para manejar selectores en cascada de geografía
  const handleProvinciaChange = (provinciaCodigo: string) => {
    if (!geografia) return;
    
    const provincia = geografia.provincias.find(p => p.codigo === provinciaCodigo);
    if (provincia) {
      setSelectedProvinciaId(provincia.id);
      const cantonesFiltrados = geografia.cantones.filter(c => c.provinciaId === provincia.id);
      setCantones(cantonesFiltrados);
      setDistritos([]);
      setSelectedCantonId(null);
      
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          provinciaCodigo: provinciaCodigo,
          cantonCodigo: '',
          distritoCodigo: '',
          codigoPostal: '',
        },
      });
    }
  };

  const handleCantonChange = (cantonCodigo: string) => {
    if (!geografia) return;
    
    const canton = cantones.find(c => c.codigo === cantonCodigo);
    if (canton) {
      setSelectedCantonId(canton.id);
      const distritosFiltrados = geografia.distritos.filter(d => d.cantonId === canton.id);
      setDistritos(distritosFiltrados);
      
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          cantonCodigo: cantonCodigo,
          distritoCodigo: '',
          codigoPostal: '',
        },
      });
    }
  };

  const handleDistritoChange = (distritoCodigo: string) => {
    if (!geografia) return;
    
    const distrito = distritos.find(d => d.codigo === distritoCodigo);
    if (distrito) {
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          distritoCodigo: distritoCodigo,
          codigoPostal: distrito.codigoPostal,
        },
      });
    }
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
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
            <p className="text-gray-600 mt-1">Administra la información de tus clientes</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
          >
            ➕ Nuevo Cliente
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{customers.length}</div>
            <div className="text-sm text-gray-600">Total Clientes</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {customers.filter(c => c.isActive === true).length}
            </div>
            <div className="text-sm text-gray-600">Activos</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {customers.filter(c => c.createdBy === 'frontend').length}
            </div>
            <div className="text-sm text-gray-600">Registrados (Web)</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">
              {customers.filter(c => c.createdBy === 'admin').length}
            </div>
            <div className="text-sm text-gray-600">Creados (Admin)</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 flex gap-4">
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
                  Dirección
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
                filteredCustomers.map((customer) => (
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
                        {customer.address ? (
                          (() => {
                            const addressNames = getAddressNames(customer);
                            return addressNames ? (
                              <>
                                <div className="font-medium">{addressNames.provinciaNombre}</div>
                                <div className="text-gray-500">
                                  {addressNames.cantonNombre}, {addressNames.distritoNombre}
                                </div>
                                <div className="text-gray-500 text-xs mt-1">
                                  {customer.address.direccionExacta?.substring(0, 40)}{customer.address.direccionExacta && customer.address.direccionExacta.length > 40 ? '...' : ''}
                                </div>
                              </>
                            ) : (
                              <div className="text-gray-400">Cargando geografía...</div>
                            );
                          })()
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
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {customer.isActive ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editingCustomer ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                {/* Información básica */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Información Básica</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="Juan Pérez"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="email@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Identificación *
                      </label>
                      <select
                        value={formData.identificationType}
                        onChange={(e) => setFormData({ ...formData, identificationType: e.target.value as 'fisica' | 'juridica' | 'dimex' | 'pasaporte' })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="fisica">Cédula Física</option>
                        <option value="juridica">Cédula Jurídica</option>
                        <option value="dimex">DIMEX</option>
                        <option value="pasaporte">Pasaporte</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de Identificación *
                      </label>
                      <input
                        type="text"
                        value={formData.identificationNumber}
                        onChange={(e) => setFormData({ ...formData, identificationNumber: e.target.value })}
                        required
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder={formData.identificationType === 'fisica' ? '1-0234-0567' : formData.identificationType === 'juridica' ? '3-101-123456' : formData.identificationType === 'dimex' ? '155812345678' : 'CR1234567'}
                      />
                    </div>
                  </div>
                </div>

                {/* Teléfonos */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Teléfonos *</h3>
                    <button
                      type="button"
                      onClick={addPhoneField}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      ➕ Agregar teléfono
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.phones.map((phone, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => updatePhone(index, e.target.value)}
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          placeholder="8888-1234"
                        />
                        {formData.phones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePhoneField(index)}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Dirección</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Provincia *
                      </label>
                      <select
                        value={formData.address.provinciaCodigo}
                        onChange={(e) => handleProvinciaChange(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Seleccionar provincia...</option>
                        {provincias.map(provincia => (
                          <option key={provincia.codigo} value={provincia.codigo}>{provincia.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cantón *
                      </label>
                      <select
                        value={formData.address.cantonCodigo}
                        onChange={(e) => handleCantonChange(e.target.value)}
                        disabled={!selectedProvinciaId || cantones.length === 0}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Seleccionar cantón...</option>
                        {cantones.map(canton => (
                          <option key={canton.codigo} value={canton.codigo}>{canton.nombre}</option>
                        ))}
                      </select>
                      {!selectedProvinciaId && (
                        <p className="text-xs text-gray-500 mt-1">Primero selecciona una provincia</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Distrito *
                      </label>
                      <select
                        value={formData.address.distritoCodigo}
                        onChange={(e) => handleDistritoChange(e.target.value)}
                        disabled={!selectedCantonId || distritos.length === 0}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Seleccionar distrito...</option>
                        {distritos.map(distrito => (
                          <option key={distrito.codigo} value={distrito.codigo}>{distrito.nombre}</option>
                        ))}
                      </select>
                      {!selectedCantonId && (
                        <p className="text-xs text-gray-500 mt-1">Primero selecciona un cantón</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección Exacta (Señas) *
                      </label>
                      <textarea
                        value={formData.address.direccionExacta}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, direccionExacta: e.target.value },
                          })
                        }
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="De la Iglesia 200m norte, casa verde con portón blanco"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código Postal
                      </label>
                      <input
                        type="text"
                        value={formData.address.codigoPostal}
                        readOnly
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                        placeholder="Se asigna automáticamente"
                      />
                      <p className="text-xs text-gray-500 mt-1">Se asigna al seleccionar el distrito</p>
                    </div>
                  </div>
                </div>

                {/* Estado */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm font-medium">
                      {formData.isActive ? '✅ Cliente Activo' : '❌ Cliente Inactivo'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  {editingCustomer ? '💾 Guardar Cambios' : '➕ Crear Cliente'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
