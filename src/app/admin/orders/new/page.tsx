'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Order, 
  Customer, 
  Product, 
  ProductVariant,
  ProductAttribute,
  ProductAttributeValue,
  VariantAttributeValue,
  OrderProduct, 
  CustomerAddress 
} from '@/types';
import { 
  ordersAPI, 
  customersAPI, 
  productsAPI,
  productAttributesAPI,
  productAttributeValuesAPI,
  productVariantsAPI,
  variantAttributeValuesAPI
} from '@/lib/api';

type ModalType = 'success' | 'error' | 'warning' | 'confirm';

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onConfirm?: () => void;
}

function Modal({ isOpen, onClose, onConfirm, type, title, message }: ModalState & { onClose: () => void }) {
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

export default function NewOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [productAttributeValues, setProductAttributeValues] = useState<ProductAttributeValue[]>([]);
  const [variantAttributeValues, setVariantAttributeValues] = useState<VariantAttributeValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estados del formulario
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  
  // Modal de cliente
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [customerOriginFilter, setCustomerOriginFilter] = useState<string>('all');
  
  // Modal de productos
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Segundo paso: selección de variantes
  const [showVariantsStep, setShowVariantsStep] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variantsOfProduct, setVariantsOfProduct] = useState<ProductVariant[]>([]);
  
  // Selecciones de atributos dinámicas
  // Mapa de attribute_id -> selected attribute_value_id
  const [selectedAttributes, setSelectedAttributes] = useState<Record<number, number>>({});
  
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        customersData, 
        productsData,
        variantsData,
        attributesData,
        attributeValuesData,
        variantAttrsData
      ] = await Promise.all([
        customersAPI.getAll(),
        productsAPI.getAll(),
        productVariantsAPI.getAll(),
        productAttributesAPI.getAll(),
        productAttributeValuesAPI.getAll(),
        variantAttributeValuesAPI.getAll(),
      ]);
      
      setCustomers(customersData.filter(c => c.isActive));
      setProducts(productsData);
      setProductVariants(variantsData);
      setProductAttributes(attributesData);
      setProductAttributeValues(attributeValuesData);
      setVariantAttributeValues(variantAttrsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showNotification('error', 'Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: ModalType, title: string, message: string, onConfirm?: () => void) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeNotification = () => {
    setModal({ ...modal, isOpen: false });
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer.id);
    setSelectedAddress(''); // Reset address when changing customer
    setShowCustomerModal(false);
    setCustomerSearch('');
    setCustomerTypeFilter('all');
    setCustomerOriginFilter('all');
  };

  const viewProductVariants = (product: Product) => {
    // Obtener variantes del producto que tengan stock y estén activas
    const variants = productVariants.filter(v => 
      Number(v.product_id) === Number(product.id) && v.stock > 0 && v.active
    );
    
    setSelectedProduct(product);
    setVariantsOfProduct(variants);
    setSelectedAttributes({});
    setShowVariantsStep(true);
  };
  
  const backToProductList = () => {
    setShowVariantsStep(false);
    setSelectedProduct(null);
    setVariantsOfProduct([]);
    setSelectedAttributes({});
  };
  
  // Obtener atributos únicos que tienen las variantes de este producto
  const getProductAttributes = (): ProductAttribute[] => {
    if (variantsOfProduct.length === 0) return [];
    
    // Obtener todos los attribute_value_ids de las variantes
    const variantIds = variantsOfProduct.map(v => Number(v.id));
    const variantAttrs = variantAttributeValues.filter(va => 
      variantIds.includes(Number(va.variant_id))
    );
    
    // Obtener attribute_ids únicos
    const attributeValueIds = [...new Set(variantAttrs.map(va => Number(va.attribute_value_id)))];
    const attrValues = productAttributeValues.filter(av => 
      attributeValueIds.includes(Number(av.id))
    );
    const attributeIds = [...new Set(attrValues.map(av => Number(av.attribute_id)))];
    
    // Obtener los atributos
    return productAttributes.filter(a => attributeIds.includes(Number(a.id)));
  };
  
  // Obtener valores disponibles para un atributo dado las selecciones actuales
  const getAvailableValuesForAttribute = (attributeId: number): ProductAttributeValue[] => {
    // Filtrar variantes según las selecciones actuales (excepto este atributo)
    let filteredVariants = [...variantsOfProduct];
    
    for (const [selectedAttrId, selectedValueId] of Object.entries(selectedAttributes)) {
      if (Number(selectedAttrId) === Number(attributeId)) continue; // No filtrar por el atributo actual
      
      filteredVariants = filteredVariants.filter(variant => {
        // Verificar si esta variante tiene el valor seleccionado
        return variantAttributeValues.some(va => 
          Number(va.variant_id) === Number(variant.id) && 
          Number(va.attribute_value_id) === Number(selectedValueId)
        );
      });
    }
    
    // Obtener todos los attribute_value_ids de estas variantes filtradas para este atributo
    const variantIds = filteredVariants.map(v => Number(v.id));
    const relevantVarAttrs = variantAttributeValues.filter(va => 
      variantIds.includes(Number(va.variant_id))
    );
    const attributeValueIds = [...new Set(relevantVarAttrs.map(va => Number(va.attribute_value_id)))];
    
    // Filtrar por el atributo específico
    return productAttributeValues.filter(av => 
      Number(av.attribute_id) === Number(attributeId) && 
      attributeValueIds.includes(Number(av.id))
    );
  };
  
  // Obtener la variante seleccionada según los atributos elegidos
  const getSelectedVariant = (): ProductVariant | null => {
    const productAttrs = getProductAttributes();
    
    // Verificar que todos los atributos estén seleccionados
    if (productAttrs.length !== Object.keys(selectedAttributes).length) {
      return null;
    }
    
    // Buscar la variante que tenga exactamente todos los valores seleccionados
    return variantsOfProduct.find(variant => {
      const variantAttrValues = variantAttributeValues
        .filter(va => Number(va.variant_id) === Number(variant.id))
        .map(va => Number(va.attribute_value_id));
      
      // Verificar que tenga todos los valores seleccionados
      return Object.values(selectedAttributes).every(valueId => 
        variantAttrValues.includes(Number(valueId))
      ) && variantAttrValues.length === Object.keys(selectedAttributes).length;
    }) || null;
  };
  
  const selectAttributeValue = (attributeId: number, valueId: number) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeId]: valueId
    }));
  };

  const addProductToOrder = (variant: ProductVariant, product: Product) => {
    // Verificar si la variante ya está en la orden
    const existing = orderProducts.find(op => op.productSku === variant.sku);
    if (existing) {
      // Incrementar cantidad
      updateOrderProduct(orderProducts.indexOf(existing), 'quantity', (existing.quantity + 1).toString());
    } else {
      // Generar un productId único basado en el variant id
      const newProductId = variant.id;
      
      // Agregar nuevo
      setOrderProducts([...orderProducts, {
        productId: newProductId,
        productName: product.name,
        productSku: variant.sku,
        quantity: 1,
        price: variant.price,
        subtotal: variant.price,
      }]);
    }
    setShowProductModal(false);
    setShowVariantsStep(false);
    setProductSearch('');
    setSelectedProduct(null);
    setVariantsOfProduct([]);
    setSelectedAttributes({});
  };

  const removeProductFromOrder = (index: number) => {
    setOrderProducts(orderProducts.filter((_, i) => i !== index));
  };

  const updateOrderProduct = (index: number, field: keyof OrderProduct, value: any) => {
    const updated = [...orderProducts];
    
    if (field === 'quantity') {
      const quantity = parseInt(value) || 1;
      // Buscar la variante por SKU
      const variant = productVariants.find(v => v.sku === updated[index].productSku);
      
      if (variant && quantity > variant.stock) {
        showNotification('warning', 'Stock insuficiente', `Solo hay ${variant.stock} unidades disponibles`);
        return;
      }
      
      updated[index] = {
        ...updated[index],
        quantity,
        subtotal: updated[index].price * quantity,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    setOrderProducts(updated);
  };

  const calculateOrderTotal = () => {
    const subtotal = orderProducts.reduce((sum, p) => sum + p.subtotal, 0);
    const tax = subtotal * 0.13; // IVA 13% Costa Rica
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleCreateOrder = async () => {
    // Validaciones
    if (!selectedCustomer) {
      showNotification('warning', 'Campo requerido', 'Debe seleccionar un cliente');
      return;
    }

    if (!selectedAddress) {
      showNotification('warning', 'Campo requerido', 'Debe seleccionar una dirección de entrega');
      return;
    }

    if (orderProducts.length === 0) {
      showNotification('warning', 'Campo requerido', 'Debe agregar al menos un producto');
      return;
    }

    // Validar stock disponible
    for (const orderProd of orderProducts) {
      const variant = productVariants.find(v => v.id === orderProd.productId);
      if (!variant || variant.stock < orderProd.quantity) {
        showNotification('error', 'Stock insuficiente', `No hay suficiente stock para ${orderProd.productName}`);
        return;
      }
    }

    try {
      setSaving(true);
      const { subtotal, tax, total } = calculateOrderTotal();
      const orderNumber = await ordersAPI.getNextOrderNumber();
      const customer = customers.find(c => c.id === selectedCustomer);
      const address = customer?.addresses?.find(a => a.id === selectedAddress);

      const newOrder: Partial<Order> = {
        id: Date.now().toString(),
        orderNumber,
        customerId: selectedCustomer,
        customerName: customer?.name || '',
        shippingAddress: address || null,
        products: orderProducts,
        subtotal,
        tax,
        total,
        status: 'pending',
        notes: orderNotes,
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await ordersAPI.create(newOrder);

      // Descontar inventario
      for (const orderProd of orderProducts) {
        const variant = productVariants.find(v => v.id === orderProd.productId);
        if (variant) {
          await productVariantsAPI.update(variant.id, {
            stock: variant.stock - orderProd.quantity,
          });
        }
      }

      showNotification('success', '¡Orden creada!', `Orden ${orderNumber} creada exitosamente`);
      
      setTimeout(() => {
        router.push('/admin/orders');
      }, 1500);
    } catch (error) {
      console.error('Error creando orden:', error);
      showNotification('error', 'Error', 'No se pudo crear la orden');
      setSaving(false);
    }
  };

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
  
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                         c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
                         c.identificationNumber.includes(customerSearch);
    const matchesType = customerTypeFilter === 'all' || c.identificationType === customerTypeFilter;
    const matchesOrigin = customerOriginFilter === 'all' || c.createdBy === customerOriginFilter;
    return matchesSearch && matchesType && matchesOrigin;
  });
  
  // Filtro defensivo: solo productos padre (no variantes)
  const variantProductIds = new Set(productVariants.map(v => Number(v.product_id)));
  
  const filteredProducts = products.filter(p => {
    // Excluir cualquier objeto que tenga propiedades de variante (sku, price, stock)
    const isNotVariant = !('sku' in p && 'price' in p && 'stock' in p);
    // Solo incluir productos que tienen variantes asociadas
    const hasVariants = variantProductIds.has(Number(p.id));
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                         (p.baseSku && p.baseSku.toLowerCase().includes(productSearch.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || (p.catalogNodeId && p.catalogNodeId.toString() === categoryFilter);
    
    return isNotVariant && hasVariants && matchesSearch && matchesCategory;
  });

  // Obtener categorías únicas
  const categories = Array.from(new Set(products.map(p => p.catalogNodeId)))
    .filter(id => id !== undefined && id !== null)
    .map(id => ({
      id: String(id),
      name: `Categoría ${id}`
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/orders')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Volver a órdenes
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b">
            <h1 className="text-3xl font-bold">📦 Nueva Orden</h1>
          </div>

          <div className="p-6 space-y-6">
            {/* Seleccionar Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              {selectedCustomerData ? (
                <div className="flex gap-3">
                  <div className="flex-1 p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        {selectedCustomerData.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{selectedCustomerData.name}</div>
                        <div className="text-sm text-gray-500">{selectedCustomerData.email}</div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors font-medium"
                >
                  + Seleccionar Cliente
                </button>
              )}
            </div>

            {/* Seleccionar Dirección */}
            {selectedCustomerData && selectedCustomerData.addresses && selectedCustomerData.addresses.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección de Entrega *
                </label>
                <select
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Seleccionar dirección...</option>
                  {selectedCustomerData.addresses.map(address => (
                    <option key={address.id} value={address.id}>
                      {address.label ? `${address.label} - ` : ''}{address.direccionExacta}
                      {address.isDefault ? ' (Predeterminada)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Productos */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Productos *
                </label>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  + Agregar Producto
                </button>
              </div>

              {orderProducts.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500">No hay productos agregados. Haz clic en "Agregar Producto".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderProducts.map((orderProd, index) => {
                    const variant = productVariants.find(v => v.id === orderProd.productId);
                    return (
                      <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{orderProd.productName}</div>
                          <div className="text-sm text-gray-500">SKU: {orderProd.productSku}</div>
                          <div className="text-sm text-gray-500">
                            Precio: ₡{orderProd.price.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                            {variant && <span className="ml-2">(Stock disponible: {variant.stock})</span>}
                          </div>
                        </div>
                        
                        <div className="w-24">
                          <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            max={variant?.stock || 999}
                            value={orderProd.quantity}
                            onChange={(e) => updateOrderProduct(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="w-36 text-right">
                          <label className="block text-xs text-gray-500 mb-1">Subtotal</label>
                          <div className="text-lg font-semibold text-gray-900">
                            ₡{orderProd.subtotal.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <button
                          onClick={() => removeProductFromOrder(index)}
                          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Notas adicionales sobre la orden..."
              />
            </div>

            {/* Resumen */}
            {orderProducts.length > 0 && (
              <div className="p-6 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4 text-lg">Resumen de la Orden</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-medium">₡{calculateOrderTotal().subtotal.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>IVA (13%):</span>
                    <span className="font-medium">₡{calculateOrderTotal().tax.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-blue-200">
                    <span>Total:</span>
                    <span className="text-blue-600">₡{calculateOrderTotal().total.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-6 border-t">
              <button
                onClick={handleCreateOrder}
                disabled={saving}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
              >
                {saving ? 'Creando orden...' : '✅ Crear Orden'}
              </button>
              <button
                onClick={() => router.push('/admin/orders')}
                disabled={saving}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de selección de cliente */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">👤 Seleccionar Cliente</h2>
                <button
                  onClick={() => {
                    setShowCustomerModal(false);
                    setCustomerSearch('');
                    setCustomerTypeFilter('all');
                    setCustomerOriginFilter('all');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Filtros */}
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="🔍 Buscar por nombre, email o identificación..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-4">
                  <select
                    value={customerTypeFilter}
                    onChange={(e) => setCustomerTypeFilter(e.target.value)}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="fisica">Cédula Física</option>
                    <option value="juridica">Cédula Jurídica</option>
                    <option value="dimex">DIMEX</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>
                  <select
                    value={customerOriginFilter}
                    onChange={(e) => setCustomerOriginFilter(e.target.value)}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">Todos los orígenes</option>
                    <option value="admin">Creados (Admin)</option>
                    <option value="frontend">Registrados (Web)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">👤</div>
                  <p>No se encontraron clientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCustomers.map(customer => (
                    <div
                      key={customer.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={() => selectCustomer(customer)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              customer.createdBy === 'frontend' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {customer.createdBy === 'frontend' ? '🌐 Web' : '👨‍💼 Admin'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{customer.email}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>
                              {customer.identificationType === 'fisica' && '🇨🇷 Cédula'}
                              {customer.identificationType === 'juridica' && '🏬 Jurídica'}
                              {customer.identificationType === 'dimex' && '🌎 DIMEX'}
                              {customer.identificationType === 'pasaporte' && '✈️ Pasaporte'}
                              {' '}{customer.identificationNumber}
                            </span>
                            {customer.addresses && customer.addresses.length > 0 && (
                              <span>📍 {customer.addresses.length} {customer.addresses.length === 1 ? 'dirección' : 'direcciones'}</span>
                            )}
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
                          Seleccionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de productos */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {showVariantsStep ? (
                    <>
                      <button 
                        onClick={backToProductList}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        ← 
                      </button>
                      {selectedProduct?.name} - Variantes
                    </>
                  ) : (
                    '🛍️ Seleccionar Producto'
                  )}
                </h2>
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setProductSearch('');
                    setCategoryFilter('all');
                    setShowVariantsStep(false);
                    setSelectedProduct(null);
                    setVariantsOfProduct([]);
                    setSelectedAttributes({});
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Filtros - solo mostrar en el primer paso */}
              {!showVariantsStep && (
                <div className="mt-4 flex gap-4">
                  <div className="flex-1 relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="🔍 Buscar por nombre o SKU..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowSuggestions(e.target.value.length > 0);
                      setSelectedSuggestionIndex(-1);
                    }}
                    onFocus={() => setShowSuggestions(productSearch.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={(e) => {
                      if (!showSuggestions || filteredProducts.length === 0) return;
                      
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedSuggestionIndex(prev => 
                          prev < Math.min(filteredProducts.length - 1, 4) ? prev + 1 : prev
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
                      } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                        e.preventDefault();
                        const product = filteredProducts[selectedSuggestionIndex];
                        viewProductVariants(product);
                        setProductSearch('');
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                      } else if (e.key === 'Escape') {
                        setShowSuggestions(false);
                        setSelectedSuggestionIndex(-1);
                      }
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  
                  {/* Sugerencias */}
                  {showSuggestions && productSearch && filteredProducts.length > 0 && !showVariantsStep && (
                    <div className="absolute z-10 w-full mt-1 bg-white border-2 border-blue-500 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                      {filteredProducts.slice(0, 5).map((product, index) => {
                        const variantCount = productVariants.filter(v => v.product_id === product.id && v.stock > 0).length;
                        return (
                          <div
                            key={product.id}
                            onClick={() => {
                              viewProductVariants(product);
                              setProductSearch('');
                              setShowSuggestions(false);
                              setSelectedSuggestionIndex(-1);
                            }}
                            className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                              index === selectedSuggestionIndex 
                                ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500">SKU base: {product.baseSku}</div>
                                <div className="text-xs text-blue-600 mt-1">
                                  {variantCount} variante{variantCount !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {filteredProducts.length > 5 && (
                        <div className="p-2 text-center text-sm text-gray-500 bg-gray-50">
                          +{filteredProducts.length - 5} productos más...
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {showVariantsStep ? (
                /* Paso 2: Mostrar selectores de opciones de variantes */
                variantsOfProduct.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-2">📦</div>
                    <p>No hay variantes disponibles con stock</p>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* Información del producto */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-1">{selectedProduct?.name}</h3>
                      <p className="text-sm text-gray-600">{selectedProduct?.description}</p>
                    </div>

                    {/* Selectores de opciones */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-700">Selecciona las opciones:</h4>
                      
                      {getProductAttributes().map(attribute => {
                        const availableValues = getAvailableValuesForAttribute(attribute.id);
                        const selectedValue = selectedAttributes[attribute.id];
                        
                        return (
                          <div key={attribute.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {attribute.name} *
                            </label>
                            <div className={`grid gap-2 ${
                              attribute.name === 'Talla' 
                                ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6' 
                                : 'grid-cols-2 sm:grid-cols-3'
                            }`}>
                              {availableValues.map(value => (
                                <button
                                  key={value.id}
                                  onClick={() => selectAttributeValue(attribute.id, value.id)}
                                  className={`py-3 px-4 border-2 rounded-lg font-semibold transition-all ${
                                    selectedValue === value.id
                                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                  }`}
                                >
                                  {value.value}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Mostrar información de la variante seleccionada */}
                      {(() => {
                        const variant = getSelectedVariant();
                        if (variant) {
                          return (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium text-gray-700">SKU: {variant.sku}</p>
                                  <p className="text-sm text-gray-600">Stock disponible: {variant.stock} unidades</p>
                                </div>
                                <p className="text-xl font-bold text-green-700">
                                  ₡{variant.price.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Botón para agregar */}
                    <div className="pt-4 border-t">
                      <button
                        onClick={() => {
                          const variant = getSelectedVariant();
                          if (variant && selectedProduct) {
                            addProductToOrder(variant, selectedProduct);
                          }
                        }}
                        disabled={!getSelectedVariant()}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {!getSelectedVariant()
                          ? 'Selecciona todas las opciones'
                          : '+ Agregar a la orden'}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                /* Paso 1: Mostrar productos padre */
                filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-2">📦</div>
                    <p>No se encontraron productos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProducts.map(product => {
                      const variantCount = productVariants.filter(v => v.product_id === product.id && v.stock > 0).length;
                      return (
                        <div
                          key={product.id}
                          className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
                          onClick={() => viewProductVariants(product)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{product.name}</h3>
                              <p className="text-sm text-gray-500">SKU base: {product.baseSku}</p>
                              <p className="text-sm text-blue-600 mt-1">
                                {variantCount} variante{variantCount !== 1 ? 's' : ''} disponible{variantCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3">
                            <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                              Ver variantes →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
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
