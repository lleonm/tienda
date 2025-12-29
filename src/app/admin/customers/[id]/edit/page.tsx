'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { customersAPI } from '@/lib/api';
import { CustomerAddress, CostaRicaGeografia, Provincia, Canton, Distrito, Customer } from '@/types';

interface Modal {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
}

function Modal({ isOpen, onClose, onConfirm, type, title, message }: Modal & { onClose: () => void }) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'confirm': return '❓';
      default: return 'ℹ️';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return 'bg-green-600';
      case 'error': return 'bg-red-600';
      case 'warning': return 'bg-yellow-600';
      case 'confirm': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <div className={`${getColor()} text-white p-4 rounded-t-lg flex items-center gap-3`}>
          <span className="text-2xl">{getIcon()}</span>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-700">{message}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
          {type === 'confirm' ? (
            <>
              <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                Cancelar
              </button>
              <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Confirmar
              </button>
            </>
          ) : (
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [geografia, setGeografia] = useState<CostaRicaGeografia | null>(null);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cantones, setCantones] = useState<Canton[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [selectedProvinciaId, setSelectedProvinciaId] = useState<number | null>(null);
  const [selectedCantonId, setSelectedCantonId] = useState<number | null>(null);

  const [originalCustomer, setOriginalCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    identificationType: 'fisica' as 'fisica' | 'juridica' | 'dimex' | 'pasaporte',
    identificationNumber: '',
    phones: [''],
    addresses: [] as CustomerAddress[],
    isActive: true,
  });

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [addressFormData, setAddressFormData] = useState<Partial<CustomerAddress>>({
    id: '',
    label: '',
    provinciaCodigo: '',
    cantonCodigo: '',
    distritoCodigo: '',
    direccionExacta: '',
    codigoPostal: '',
    isDefault: false,
  });

  const [modal, setModal] = useState<Modal>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    loadGeografia();
    loadCustomer();
  }, []);

  const loadCustomer = async () => {
    try {
      setLoadingCustomer(true);
      const customer = await customersAPI.getById(customerId);
      setOriginalCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email,
        identificationType: customer.identificationType,
        identificationNumber: customer.identificationNumber,
        phones: customer.phones,
        addresses: customer.addresses,
        isActive: customer.isActive,
      });
    } catch (error) {
      console.error('Error cargando cliente:', error);
      showNotification('error', 'Error', 'No se pudo cargar el cliente');
    } finally {
      setLoadingCustomer(false);
    }
  };

  const loadGeografia = async () => {
    try {
      const response = await fetch('/data/costa_rica_geografia.json');
      const data: CostaRicaGeografia = await response.json();
      setGeografia(data);
      setProvincias(data.provincias);
    } catch (error) {
      console.error('Error cargando geografía:', error);
    }
  };

  const showNotification = (
    type: Modal['type'],
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeNotification = () => {
    setModal({ ...modal, isOpen: false });
  };

  const getAddressNames = (address: CustomerAddress) => {
    if (!address || !geografia) return null;
    
    const provincia = geografia.provincias.find(p => p.codigo === address.provinciaCodigo);
    const canton = geografia.cantones.find(c => c.codigo === address.cantonCodigo);
    const distrito = geografia.distritos.find(d => d.codigo === address.distritoCodigo);
    
    return {
      provinciaNombre: provincia?.nombre || address.provinciaCodigo,
      cantonNombre: canton?.nombre || address.cantonCodigo,
      distritoNombre: distrito?.nombre || address.distritoCodigo,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    if (formData.addresses.length === 0) {
      showNotification('warning', 'Campo requerido', 'Agrega al menos una dirección');
      return;
    }

    const hasDefault = formData.addresses.some(addr => addr.isDefault);
    if (!hasDefault) {
      showNotification('warning', 'Dirección predeterminada requerida', 'Debes marcar una dirección como predeterminada');
      return;
    }

    try {
      setLoading(true);
      const customerData = {
        ...formData,
        phones: validPhones,
        createdBy: originalCustomer?.createdBy || 'admin',
        createdAt: originalCustomer?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await customersAPI.update(customerId, customerData);
      showNotification('success', '¡Actualizado!', 'Cliente actualizado exitosamente');
      
      setTimeout(() => {
        router.push('/admin/customers');
      }, 1500);
    } catch (error) {
      console.error('Error guardando cliente:', error);
      showNotification('error', 'Error', 'No se pudo guardar el cliente');
      setLoading(false);
    }
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

  const openAddressModal = (address?: CustomerAddress) => {
    if (address) {
      setEditingAddress(address);
      
      if (geografia && address.provinciaCodigo) {
        const provincia = geografia.provincias.find(p => p.codigo === address.provinciaCodigo);
        if (provincia) {
          setSelectedProvinciaId(provincia.id);
          const cantonesFiltrados = geografia.cantones.filter(c => c.provinciaId === provincia.id);
          setCantones(cantonesFiltrados);

          if (address.cantonCodigo) {
            const canton = cantonesFiltrados.find(c => c.codigo === address.cantonCodigo);
            if (canton) {
              setSelectedCantonId(canton.id);
              const distritosFiltrados = geografia.distritos.filter(d => d.cantonId === canton.id);
              setDistritos(distritosFiltrados);
            }
          }
        }
      }

      setAddressFormData(address);
    } else {
      setEditingAddress(null);
      setSelectedProvinciaId(null);
      setSelectedCantonId(null);
      setCantones([]);
      setDistritos([]);
      setAddressFormData({
        id: crypto.randomUUID(),
        label: '',
        provinciaCodigo: '',
        cantonCodigo: '',
        distritoCodigo: '',
        direccionExacta: '',
        codigoPostal: '',
        isDefault: formData.addresses.length === 0,
      });
    }
    setShowAddressModal(true);
  };

  const handleSaveAddress = () => {
    if (!addressFormData.provinciaCodigo || !addressFormData.cantonCodigo || !addressFormData.distritoCodigo) {
      showNotification('warning', 'Campos requeridos', 'Completa todos los campos de ubicación');
      return;
    }

    if (!addressFormData.direccionExacta?.trim()) {
      showNotification('warning', 'Campo requerido', 'Ingresa la dirección exacta');
      return;
    }

    const newAddresses = [...formData.addresses];
    
    if (editingAddress) {
      const index = newAddresses.findIndex(addr => addr.id === editingAddress.id);
      if (index !== -1) {
        newAddresses[index] = addressFormData as CustomerAddress;
      }
    } else {
      newAddresses.push(addressFormData as CustomerAddress);
    }

    if (addressFormData.isDefault) {
      newAddresses.forEach(addr => {
        if (addr.id !== addressFormData.id) {
          addr.isDefault = false;
        }
      });
    }

    setFormData({ ...formData, addresses: newAddresses });
    setShowAddressModal(false);
    resetAddressForm();
  };

  const handleDeleteAddress = (addressId: string) => {
    const address = formData.addresses.find(addr => addr.id === addressId);
    const addressLabel = address?.label || 'esta dirección';

    showNotification(
      'confirm',
      '¿Eliminar dirección?',
      `¿Estás seguro de eliminar ${addressLabel}?`,
      () => {
        let newAddresses = formData.addresses.filter(addr => addr.id !== addressId);
        
        if (address?.isDefault && newAddresses.length > 0) {
          newAddresses[0].isDefault = true;
        }

        setFormData({ ...formData, addresses: newAddresses });
        showNotification('success', '¡Eliminada!', 'Dirección eliminada exitosamente');
      }
    );
  };

  const handleSetDefaultAddress = (addressId: string) => {
    const newAddresses = formData.addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === addressId,
    }));
    setFormData({ ...formData, addresses: newAddresses });
  };

  const resetAddressForm = () => {
    setEditingAddress(null);
    setSelectedProvinciaId(null);
    setSelectedCantonId(null);
    setCantones([]);
    setDistritos([]);
    setAddressFormData({
      id: '',
      label: '',
      provinciaCodigo: '',
      cantonCodigo: '',
      distritoCodigo: '',
      direccionExacta: '',
      codigoPostal: '',
      isDefault: false,
    });
  };

  const handleProvinciaChangeInModal = (provinciaCodigo: string) => {
    if (!geografia) return;
    
    const provincia = geografia.provincias.find(p => p.codigo === provinciaCodigo);
    if (provincia) {
      setSelectedProvinciaId(provincia.id);
      const cantonesFiltrados = geografia.cantones.filter(c => c.provinciaId === provincia.id);
      setCantones(cantonesFiltrados);
      setDistritos([]);
      setSelectedCantonId(null);
      
      setAddressFormData({
        ...addressFormData,
        provinciaCodigo: provinciaCodigo,
        cantonCodigo: '',
        distritoCodigo: '',
        codigoPostal: '',
      });
    }
  };

  const handleCantonChangeInModal = (cantonCodigo: string) => {
    if (!geografia) return;
    
    const canton = cantones.find(c => c.codigo === cantonCodigo);
    if (canton) {
      setSelectedCantonId(canton.id);
      const distritosFiltrados = geografia.distritos.filter(d => d.cantonId === canton.id);
      setDistritos(distritosFiltrados);
      
      setAddressFormData({
        ...addressFormData,
        cantonCodigo: cantonCodigo,
        distritoCodigo: '',
        codigoPostal: '',
      });
    }
  };

  const handleDistritoChange = (distritoCodigo: string) => {
    if (!geografia) return;
    
    const distrito = distritos.find(d => d.codigo === distritoCodigo);
    if (distrito) {
      setAddressFormData({
        ...addressFormData,
        distritoCodigo: distritoCodigo,
        codigoPostal: distrito.codigoPostal,
      });
    }
  };

  if (loadingCustomer) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/customers')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Volver a clientes
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b">
            <h1 className="text-3xl font-bold">✏️ Editar Cliente</h1>
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

              {/* Direcciones */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Direcciones *</h3>
                  <button
                    type="button"
                    onClick={() => openAddressModal()}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    ➕ Agregar dirección
                  </button>
                </div>
                
                {formData.addresses.length === 0 ? (
                  <div className="text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500">No hay direcciones. Agrega al menos una dirección.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.addresses.map((address) => {
                      const addressNames = getAddressNames(address);
                      return (
                        <div
                          key={address.id}
                          className={`p-4 rounded-lg border-2 ${
                            address.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {address.label && (
                                  <span className="font-medium text-gray-900">{address.label}</span>
                                )}
                                {address.isDefault && (
                                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                                    Predeterminada
                                  </span>
                                )}
                              </div>
                              {addressNames && (
                                <div className="text-sm text-gray-700">
                                  <p className="font-medium">
                                    {addressNames.provinciaNombre}, {addressNames.cantonNombre}, {addressNames.distritoNombre}
                                  </p>
                                  <p className="text-gray-600 mt-1">{address.direccionExacta}</p>
                                  {address.codigoPostal && (
                                    <p className="text-gray-500 text-xs mt-1">CP: {address.codigoPostal}</p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              {!address.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(address.id)}
                                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                                  title="Marcar como predeterminada"
                                >
                                  ⭐
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openAddressModal(address)}
                                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                              >
                                ✏️
                              </button>
                              {formData.addresses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAddress(address.id)}
                                  className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                disabled={loading}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
              >
                {loading ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/customers')}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal para agregar/editar dirección */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editingAddress ? '✏️ Editar Dirección' : '➕ Nueva Dirección'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddressModal(false);
                    resetAddressForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Etiqueta (Opcional)
                  </label>
                  <input
                    type="text"
                    value={addressFormData.label || ''}
                    onChange={(e) => setAddressFormData({ ...addressFormData, label: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="Casa, Oficina, Bodega, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provincia *
                    </label>
                    <select
                      value={addressFormData.provinciaCodigo || ''}
                      onChange={(e) => handleProvinciaChangeInModal(e.target.value)}
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
                      value={addressFormData.cantonCodigo || ''}
                      onChange={(e) => handleCantonChangeInModal(e.target.value)}
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
                      value={addressFormData.distritoCodigo || ''}
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección Exacta (Señas) *
                  </label>
                  <textarea
                    value={addressFormData.direccionExacta || ''}
                    onChange={(e) => setAddressFormData({ ...addressFormData, direccionExacta: e.target.value })}
                    rows={3}
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
                    value={addressFormData.codigoPostal || ''}
                    readOnly
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    placeholder="Se asigna automáticamente"
                  />
                  <p className="text-xs text-gray-500 mt-1">Se asigna al seleccionar el distrito</p>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addressFormData.isDefault || false}
                      onChange={(e) => setAddressFormData({ ...addressFormData, isDefault: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm font-medium">
                      ⭐ Marcar como dirección predeterminada
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  {editingAddress ? '💾 Guardar Cambios' : '➕ Agregar Dirección'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressModal(false);
                    resetAddressForm();
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
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
