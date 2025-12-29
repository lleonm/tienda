'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  productsAPI, 
  productVariantsAPI, 
  variantAttributeValuesAPI,
  productAttributesAPI,
  productAttributeValuesAPI 
} from '@/lib/api';
import { 
  Product, 
  ProductVariant, 
  ProductAttribute, 
  ProductAttributeValue,
  VariantAttributeValue 
} from '@/types';
import Modal, { ModalType } from '@/components/Modal';

interface VariantWithDetails extends ProductVariant {
  attributeValues: Array<{
    attribute_id: number;
    attribute_name: string;
    value_id: number;
    value: string;
  }>;
}

interface NewVariantCombination {
  attributes: { [attributeId: number]: number }; // attribute_id -> attribute_value_id
  price: string;
  stock: string;
  sku: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = parseInt(params.id as string);

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<VariantWithDetails[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<Map<number, ProductAttributeValue[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para editar producto padre
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');

  // Estados para filtros
  const [filters, setFilters] = useState<Map<number, number | null>>(new Map()); // attribute_id -> attribute_value_id (null = todos)
  
  // Estados para cambios pendientes
  const [pendingChanges, setPendingChanges] = useState<Map<number, Partial<ProductVariant>>>(new Map()); // variant_id -> changes

  // Estados para agregar nuevas variantes
  const [showAddVariants, setShowAddVariants] = useState(false);
  const [newVariants, setNewVariants] = useState<NewVariantCombination[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<number[]>([]);
  const [selectedValues, setSelectedValues] = useState<Map<number, number[]>>(new Map());
  const [lockedAttributes, setLockedAttributes] = useState<number[]>([]); // Atributos que no se pueden deseleccionar
  const [lockedValues, setLockedValues] = useState<Map<number, number[]>>(new Map()); // Valores que no se pueden deseleccionar

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
    loadProductData();
  }, [productId]);

  const loadProductData = async () => {
    try {
      setLoading(true);

      // Cargar producto, variantes, atributos
      const [productData, variantsData, attributesData, allAttributeValues] = await Promise.all([
        productsAPI.getById(productId),
        productVariantsAPI.getByProductId(productId),
        productAttributesAPI.getAll(),
        productAttributeValuesAPI.getAll(),
      ]);

      setProduct(productData);
      setProductName(productData.name);
      setProductDescription(productData.description || '');
      setAttributes(attributesData);

      // Organizar attribute values por attribute_id
      const valuesMap = new Map<number, ProductAttributeValue[]>();
      allAttributeValues.forEach((av: ProductAttributeValue) => {
        if (!valuesMap.has(av.attribute_id)) {
          valuesMap.set(av.attribute_id, []);
        }
        valuesMap.get(av.attribute_id)!.push(av);
      });
      setAttributeValues(valuesMap);

      console.log('Attributes loaded:', attributesData);
      console.log('Attribute values map:', valuesMap);
      console.log('Variants data:', variantsData);

      // Cargar detalles de cada variante
      const variantsWithDetails = await Promise.all(
        variantsData.map(async (variant: ProductVariant) => {
          console.log('Loading data for variant:', variant.id);
          
          const vavData = await variantAttributeValuesAPI.getByVariantId(variant.id);
          console.log('VAV data for variant', variant.id, ':', vavData);
          
          const attributeValuesDetails = vavData.map((vav: VariantAttributeValue) => {
            // Convertir IDs a número para comparación (JSON Server puede devolver strings)
            const attrValue = allAttributeValues.find((av: ProductAttributeValue) => 
              Number(av.id) === Number(vav.attribute_value_id)
            );
            const attr = attributesData.find((a: ProductAttribute) => 
              Number(a.id) === Number(attrValue?.attribute_id)
            );
            
            console.log('Processing VAV:', vav, '-> attrValue:', attrValue, '-> attr:', attr);
            
            return {
              attribute_id: Number(attr?.id) || 0,
              attribute_name: attr?.name || '',
              value_id: Number(attrValue?.id) || 0,
              value: attrValue?.value || '',
            };
          });

          return {
            ...variant,
            attributeValues: attributeValuesDetails,
          };
        })
      );

      console.log('Variants with details:', variantsWithDetails);
      setVariants(variantsWithDetails);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showNotification('error', 'Error', 'No se pudieron cargar los datos del producto');
    } finally {
      setLoading(false);
    }
  };

  const handleProductUpdate = async (field: 'name' | 'description') => {
    try {
      const value = field === 'name' ? productName : productDescription;
      if (!value.trim()) {
        showNotification('warning', 'Atención', 'El campo no puede estar vacío');
        return;
      }

      await productsAPI.update(productId, { [field]: value });
      setProduct(prev => prev ? { ...prev, [field]: value } : null);
      
      if (field === 'name') setEditingName(false);
      if (field === 'description') setEditingDescription(false);
      
      showNotification('success', '¡Actualizado!', 'Producto actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando producto:', error);
      showNotification('error', 'Error', 'No se pudo actualizar el producto');
    }
  };

  const handleVariantChange = (variantId: number, field: 'price' | 'stock' | 'active', value: any) => {
    let updateValue: any;
    
    if (field === 'active') {
      updateValue = value;
    } else {
      // Asegurar que price y stock sean números válidos
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        return; // No actualizar si es inválido
      }
      updateValue = numValue;
    }
    
    // Actualizar localmente
    setVariants(variants.map(v => 
      Number(v.id) === Number(variantId) ? { ...v, [field]: updateValue } : v
    ));
    
    // Rastrear cambio pendiente
    const newPendingChanges = new Map(pendingChanges);
    const existingChanges = newPendingChanges.get(variantId) || {};
    newPendingChanges.set(variantId, { ...existingChanges, [field]: updateValue });
    setPendingChanges(newPendingChanges);
  };

  const saveAllChanges = async () => {
    if (pendingChanges.size === 0) return;
    
    try {
      setSaving(true);
      
      // Guardar todos los cambios
      const promises = Array.from(pendingChanges.entries()).map(([variantId, changes]) => 
        productVariantsAPI.update(Number(variantId), changes)
      );
      
      await Promise.all(promises);
      
      setPendingChanges(new Map());
      showNotification('success', '¡Guardado!', `${pendingChanges.size} variante(s) actualizada(s) exitosamente`);
    } catch (error) {
      console.error('Error guardando cambios:', error);
      showNotification('error', 'Error', 'No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setPendingChanges(new Map());
    loadProductData(); // Recargar datos originales
  };

  const handleVariantUpdate = async (variantId: number, field: 'price' | 'stock' | 'active', value: any) => {
    try {
      let updates: any;
      
      if (field === 'active') {
        updates = { [field]: value };
      } else {
        // Asegurar que price y stock sean números válidos
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          return; // No actualizar si es inválido
        }
        updates = { [field]: numValue };
      }
      
      await productVariantsAPI.update(variantId, updates);
      
      // Actualizar localmente
      setVariants(variants.map(v => 
        Number(v.id) === Number(variantId) ? { ...v, ...updates } : v
      ));

      showNotification('success', '¡Actualizado!', `Variante actualizada exitosamente`);
    } catch (error) {
      console.error('Error actualizando variante:', error);
      showNotification('error', 'Error', 'No se pudo actualizar la variante');
    }
  };

  const toggleAttribute = (attributeId: number) => {
    // No permitir deseleccionar atributos bloqueados
    if (lockedAttributes.includes(attributeId)) return;
    
    if (selectedAttributes.includes(attributeId)) {
      setSelectedAttributes(selectedAttributes.filter(id => id !== attributeId));
      const newMap = new Map(selectedValues);
      newMap.delete(attributeId);
      setSelectedValues(newMap);
    } else {
      setSelectedAttributes([...selectedAttributes, attributeId]);
    }
  };

  const toggleAttributeValue = (attributeId: number, valueId: number) => {
    setSelectedValues(selectedValues => {
      const newMap = new Map(selectedValues);
      const current = newMap.get(attributeId) || [];
      
      // Verificar si el valor está bloqueado
      const lockedValuesForAttr = lockedValues.get(attributeId) || [];
      const isLocked = lockedValuesForAttr.includes(valueId);
      
      if (current.includes(valueId)) {
        // Solo permitir desmarcar si NO está bloqueado
        if (!isLocked) {
          newMap.set(attributeId, current.filter(id => id !== valueId));
        }
      } else {
        newMap.set(attributeId, [...current, valueId]);
      }
      
      return newMap;
    });
  };

  const generateCombinations = () => {
    if (selectedAttributes.length === 0) {
      showNotification('warning', 'Atención', 'Debes seleccionar al menos un atributo');
      return;
    }

    // Validar que cada atributo tenga al menos un valor seleccionado
    for (const attrId of selectedAttributes) {
      const values = selectedValues.get(attrId) || [];
      if (values.length === 0) {
        const attr = attributes.find(a => a.id === attrId);
        showNotification('warning', 'Atención', `Debes seleccionar al menos un valor para ${attr?.name}`);
        return;
      }
    }

    // Generar todas las combinaciones
    const allCombinations: NewVariantCombination[] = [];
    const generateRecursive = (index: number, current: { [key: number]: number }) => {
      if (index === selectedAttributes.length) {
        allCombinations.push({
          attributes: { ...current },
          price: '0',
          stock: '0',
          sku: `${product?.baseSku}-V${(variants.length + allCombinations.length + 1).toString().padStart(3, '0')}`,
        });
        return;
      }

      const attrId = selectedAttributes[index];
      const values = selectedValues.get(attrId) || [];
      
      for (const valueId of values) {
        generateRecursive(index + 1, { ...current, [attrId]: valueId });
      }
    };

    generateRecursive(0, {});
    
    // Filtrar solo las combinaciones que NO existen en las variantes actuales
    const newCombinations = allCombinations.filter(combo => {
      // Verificar si esta combinación ya existe
      const exists = variants.some(variant => {
        const variantAttrValues = variant.attributeValues || [];
        
        // Si la variante no tiene la misma cantidad de atributos, no es la misma combinación
        if (variantAttrValues.length !== Object.keys(combo.attributes).length) {
          return false;
        }
        
        // Verificar que todos los attribute_value_id coincidan
        return Object.values(combo.attributes).every(valueId => 
          variantAttrValues.some(av => Number(av.value_id) === Number(valueId))
        );
      });
      
      return !exists;
    });
    
    if (newCombinations.length === 0) {
      showNotification('info', 'Sin cambios', 'Todas estas combinaciones ya existen');
      return;
    }
    
    console.log('Total combinations:', allCombinations.length, 'New combinations:', newCombinations.length);
    setNewVariants(newCombinations);
  };

  const updateNewVariant = (index: number, field: 'price' | 'stock' | 'sku', value: string) => {
    setNewVariants(newVariants.map((nv, i) => 
      i === index ? { ...nv, [field]: value } : nv
    ));
  };

  const removeNewVariant = (index: number) => {
    setNewVariants(newVariants.filter((_, i) => i !== index));
  };

  const getAttributeName = (attributeId: number): string => {
    const attr = attributes.find(a => Number(a.id) === Number(attributeId));
    return attr?.name || '';
  };

  const getAttributeValueName = (attributeId: number, valueId: number): string => {
    const values = attributeValues.get(Number(attributeId)) || [];
    const value = values.find(v => Number(v.id) === Number(valueId));
    return value?.value || '';
  };

  const saveNewVariants = async () => {
    // Validar que todas las variantes tengan precio y stock
    for (const nv of newVariants) {
      if (!nv.price || parseFloat(nv.price) <= 0) {
        showNotification('warning', 'Atención', 'Todas las variantes deben tener un precio válido');
        return;
      }
      if (!nv.stock || parseInt(nv.stock) < 0) {
        showNotification('warning', 'Atención', 'Todas las variantes deben tener un stock válido');
        return;
      }
    }

    try {
      setSaving(true);

      for (const nv of newVariants) {
        // Crear variante
        const variant = await productVariantsAPI.create({
          product_id: productId,
          sku: nv.sku,
          price: parseFloat(nv.price),
          stock: parseInt(nv.stock),
          active: true,
          createdAt: new Date().toISOString(),
        });

        // Crear relaciones variant-attribute-values
        for (const [attrId, valueId] of Object.entries(nv.attributes)) {
          await variantAttributeValuesAPI.create({
            variant_id: variant.id,
            attribute_value_id: valueId,
          });
        }
      }

      showNotification('success', '¡Creadas!', `${newVariants.length} variante(s) creada(s) exitosamente`);
      setShowAddVariants(false);
      setNewVariants([]);
      setSelectedAttributes([]);
      setSelectedValues(new Map());
      setLockedAttributes([]);
      setLockedValues(new Map());
      loadProductData();
    } catch (error) {
      console.error('Error creando variantes:', error);
      showNotification('error', 'Error', 'No se pudieron crear las variantes');
    } finally {
      setSaving(false);
    }
  };

  const getAttributeValuesDisplay = (variant: VariantWithDetails) => {
    return variant.attributeValues
      .map(av => `${av.attribute_name}: ${av.value}`)
      .join(', ');
  };

  const getUniqueAttributesFromVariants = () => {
    const attrIds = new Set<number>();
    variants.forEach(variant => {
      variant.attributeValues.forEach(av => {
        if (av.attribute_id) attrIds.add(av.attribute_id);
      });
    });
    return Array.from(attrIds).map(id => attributes.find(a => Number(a.id) === id)).filter(a => a);
  };

  const getUniqueValuesForAttribute = (attributeId: number) => {
    const valueIds = new Set<number>();
    variants.forEach(variant => {
      variant.attributeValues.forEach(av => {
        if (Number(av.attribute_id) === Number(attributeId)) {
          valueIds.add(av.value_id);
        }
      });
    });
    return Array.from(valueIds)
      .map(id => attributeValues.get(attributeId)?.find(v => Number(v.id) === id))
      .filter(v => v);
  };

  const handleFilterChange = (attributeId: number, valueId: string) => {
    const newFilters = new Map(filters);
    if (valueId === 'all') {
      newFilters.delete(attributeId);
    } else {
      newFilters.set(attributeId, Number(valueId));
    }
    setFilters(newFilters);
  };

  const getFilteredVariants = () => {
    if (filters.size === 0) return variants;
    
    return variants.filter(variant => {
      // Verificar que la variante cumpla con todos los filtros
      for (const [attrId, valueId] of filters.entries()) {
        const hasValue = variant.attributeValues.some(av => 
          Number(av.attribute_id) === Number(attrId) && Number(av.value_id) === Number(valueId)
        );
        if (!hasValue) return false;
      }
      return true;
    });
  };

  const initializeExistingAttributes = () => {
    console.log('=== INITIALIZING EXISTING ATTRIBUTES ===');
    console.log('Variants:', variants);
    console.log('Attributes:', attributes);
    console.log('AttributeValues Map:', attributeValues);
    
    if (variants.length === 0) {
      console.log('No variants, clearing all');
      setLockedAttributes([]);
      setSelectedAttributes([]);
      setSelectedValues(new Map());
      return;
    }

    // Extraer todos los atributos únicos de las variantes existentes
    const existingAttrIds = new Set<number>();
    const existingValues = new Map<number, Set<number>>();

    variants.forEach(variant => {
      console.log('Processing variant:', variant);
      variant.attributeValues.forEach(av => {
        console.log('  - Attribute value:', av);
        existingAttrIds.add(av.attribute_id);
        
        if (!existingValues.has(av.attribute_id)) {
          existingValues.set(av.attribute_id, new Set());
        }
        existingValues.get(av.attribute_id)!.add(av.value_id);
      });
    });

    const attrArray = Array.from(existingAttrIds);
    console.log('Locked attributes (attribute IDs):', attrArray);
    console.log('Existing values (by attribute):', existingValues);
    
    setLockedAttributes(attrArray);
    setSelectedAttributes(attrArray);
    
    // Pre-seleccionar todos los valores existentes
    const valuesMap = new Map<number, number[]>();
    existingValues.forEach((valueSet, attrId) => {
      valuesMap.set(attrId, Array.from(valueSet));
    });
    console.log('Selected values map:', valuesMap);
    
    // Los mismos valores que están seleccionados también están bloqueados
    setLockedValues(new Map(valuesMap));
    console.log('Locked values map:', valuesMap);
    console.log('=== END INITIALIZATION ===');
    setSelectedValues(valuesMap);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Producto no encontrado</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Modal
        isOpen={modal.isOpen}
        onClose={closeNotification}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📦 Editar Producto</h1>
          <p className="text-gray-600 mt-1">{product.name}</p>
        </div>
        <button
          onClick={() => router.push('/admin/products')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          ← Volver
        </button>
      </div>

      {/* Información del producto */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Información General</h2>
        <div className="space-y-4">
          {/* SKU Base (no editable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU Base</label>
            <div className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded">
              {product.baseSku}
            </div>
          </div>

          {/* Nombre (editable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto</label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleProductUpdate('name');
                    if (e.key === 'Escape') {
                      setProductName(product.name);
                      setEditingName(false);
                    }
                  }}
                />
                <button
                  onClick={() => handleProductUpdate('name')}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setProductName(product.name);
                    setEditingName(false);
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded hover:bg-gray-100 cursor-pointer group"
                onClick={() => setEditingName(true)}>
                <span className="text-sm text-gray-900">{product.name}</span>
                <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">✏️ Editar</span>
              </div>
            )}
          </div>

          {/* Descripción (editable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            {editingDescription ? (
              <div className="flex gap-2">
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setProductDescription(product.description || '');
                      setEditingDescription(false);
                    }
                  }}
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleProductUpdate('description')}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => {
                      setProductDescription(product.description || '');
                      setEditingDescription(false);
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 px-3 py-2 rounded hover:bg-gray-100 cursor-pointer group"
                onClick={() => setEditingDescription(true)}>
                <span className="text-sm text-gray-900">{product.description || 'Sin descripción'}</span>
                <span className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">✏️ Editar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variantes existentes */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Variantes ({getFilteredVariants().length} de {variants.length})</h2>
          <button
            onClick={() => {
              initializeExistingAttributes();
              setShowAddVariants(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Agregar Variantes
          </button>
        </div>

        {/* Filtros */}
        {variants.length > 0 && getUniqueAttributesFromVariants().length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">🔍 Filtrar por:</span>
              {filters.size > 0 && (
                <button
                  onClick={() => setFilters(new Map())}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {getUniqueAttributesFromVariants().map((attr) => {
                if (!attr) return null;
                const uniqueValues = getUniqueValuesForAttribute(Number(attr.id));
                return (
                  <div key={attr.id}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {attr.name}
                    </label>
                    <select
                      value={filters.get(Number(attr.id)) || 'all'}
                      onChange={(e) => handleFilterChange(Number(attr.id), e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Todas</option>
                      {uniqueValues.map((value) => (
                        <option key={value.id} value={value.id}>
                          {value.value}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Botones de guardar cambios */}
        {pendingChanges.size > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-800 text-sm font-medium">
                ⚠️ {pendingChanges.size} variante(s) con cambios sin guardar
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={discardChanges}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Descartar
              </button>
              <button
                onClick={saveAllChanges}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:bg-gray-400"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}

        {variants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay variantes creadas</p>
            <p className="text-sm">Haz clic en "Agregar Variantes" para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atributos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio (₡)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Activo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getFilteredVariants().map((variant) => (
                  <tr key={variant.id} className={`hover:bg-gray-50 ${!variant.active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono">{variant.sku}</td>
                    <td className="px-4 py-3 text-sm">
                      {variant.attributeValues && variant.attributeValues.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {variant.attributeValues.map((av, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              <span className="font-medium">{av.attribute_name}:</span>
                              <span className="ml-1">{av.value}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin atributos</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={variant.price || 0}
                        onChange={(e) => handleVariantChange(variant.id, 'price', e.target.value)}
                        className="w-28 px-2 py-1 border rounded text-sm"
                        step="0.01"
                        min="0"
                        disabled={!variant.active}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={variant.stock || 0}
                        onChange={(e) => handleVariantChange(variant.id, 'stock', e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm"
                        min="0"
                        disabled={!variant.active}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={variant.active}
                          onChange={() => handleVariantChange(variant.id, 'active', !variant.active)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para agregar variantes */}
      {showAddVariants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onMouseDown={(e) => {
            // Inicializar al abrir el modal
            if (e.currentTarget === e.target && newVariants.length === 0) {
              initializeExistingAttributes();
            }
          }}>

          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Agregar Nuevas Variantes</h2>

              {newVariants.length === 0 ? (
                <>
                  {/* Paso 1: Seleccionar atributos y valores */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">1. Selecciona atributos y valores</h3>
                    {lockedAttributes.length > 0 && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                        ℹ️ Los atributos marcados con 🔒 ya están en uso y no pueden deseleccionarse
                      </div>
                    )}
                    
                    {(() => {
                      console.log('=== RENDERING ATTRIBUTES ===');
                      console.log('Attributes:', attributes);
                      console.log('AttributeValues:', attributeValues);
                      console.log('SelectedAttributes:', selectedAttributes);
                      console.log('SelectedValues:', selectedValues);
                      console.log('LockedAttributes:', lockedAttributes);
                      return null;
                    })()}
                    
                    {attributes.map((attr) => {
                      const isLocked = lockedAttributes.includes(Number(attr.id));
                      const isSelected = selectedAttributes.includes(Number(attr.id));
                      const values = attributeValues.get(Number(attr.id));
                      
                      console.log(`Attribute ${attr.name} (id=${attr.id}):`, {
                        isLocked,
                        isSelected,
                        values: values,
                        selectedValuesForThis: selectedValues.get(Number(attr.id))
                      });
                      
                      return (
                      <div key={attr.id} className="mb-4 border rounded-lg p-4">
                        <label className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAttribute(Number(attr.id))}
                            disabled={isLocked}
                            className="mr-2"
                          />
                          <span className="font-medium">
                            {attr.name}
                            {isLocked && <span className="ml-2 text-sm text-blue-600">🔒</span>}
                          </span>
                        </label>

                        {isSelected && (
                          <div className="ml-6">
                            <div className="text-xs text-gray-600 mb-2">Selecciona valores:</div>
                            {values && values.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {values.map((value) => {
                                  const isValueSelected = selectedValues.get(Number(attr.id))?.includes(Number(value.id));
                                  const isValueLocked = lockedValues.get(Number(attr.id))?.includes(Number(value.id));
                                  
                                  return (
                                    <button
                                      key={value.id}
                                      onClick={() => toggleAttributeValue(Number(attr.id), Number(value.id))}
                                      disabled={isValueLocked}
                                      className={`px-3 py-1 rounded text-sm transition-colors ${
                                        isValueSelected
                                          ? isValueLocked
                                            ? 'bg-blue-600 text-white cursor-not-allowed opacity-90'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                    >
                                      {value.value}
                                      {isValueLocked && <span className="ml-1">🔒</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-sm text-red-500">No hay valores disponibles para este atributo</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowAddVariants(false);
                        setSelectedAttributes([]);
                        setSelectedValues(new Map());
                        setLockedAttributes([]);
                        setLockedValues(new Map());
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={generateCombinations}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Generar Combinaciones →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Paso 2: Configurar precios y stock */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">
                      2. Configura precio y stock ({newVariants.length} variante{newVariants.length !== 1 ? 's' : ''})
                    </h3>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {newVariants.map((nv, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm mb-1">
                                {Object.entries(nv.attributes).map(([attrId, valueId]) => {
                                  const attr = attributes.find(a => Number(a.id) === Number(attrId));
                                  const valueName = getAttributeValueName(Number(attrId), Number(valueId));
                                  return `${attr?.name}: ${valueName}`;
                                }).join(', ')}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">SKU: {nv.sku}</div>
                            </div>
                            <button
                              onClick={() => removeNewVariant(index)}
                              className="text-red-600 hover:text-red-800 text-sm ml-2"
                            >
                              🗑️
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 mt-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                              <input
                                type="text"
                                value={nv.sku}
                                onChange={(e) => updateNewVariant(index, 'sku', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Precio (₡)</label>
                              <input
                                type="number"
                                value={nv.price}
                                onChange={(e) => updateNewVariant(index, 'price', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm"
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
                              <input
                                type="number"
                                value={nv.stock}
                                onChange={(e) => updateNewVariant(index, 'stock', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm"
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setNewVariants([])}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      ← Volver
                    </button>
                    <button
                      onClick={() => {
                        setShowAddVariants(false);
                        setNewVariants([]);
                        setSelectedAttributes([]);
                        setSelectedValues(new Map());
                        setLockedAttributes([]);
                        setLockedValues(new Map());
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveNewVariants}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {saving ? 'Guardando...' : 'Guardar Variantes'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
