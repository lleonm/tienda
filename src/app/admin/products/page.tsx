"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { productsAPI, variantConfigsAPI } from "@/lib/api";
import { Product, ProductWithVariants, VariantConfig } from "@/types";

interface SelectedVariant {
  configId: number;
  type: string;
  label: string;
  hasGlobalValues: boolean;
  selectedValues: string[];
}

interface VariantCombination {
  combinations: { type: string; value: string }[];
  price: string;
  stock: string;
  sku: string;
  imageUrl?: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [variantConfigs, setVariantConfigs] = useState<VariantConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showAddVariantsModal, setShowAddVariantsModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingParent, setEditingParent] = useState<ProductWithVariants | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(1); // 1: Info basica, 2: Variantes, 3: Precios
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "ropa" as "ropa" | "accesorios",
    price: "",
    stock: "",
    sku: "",
    imageUrl: "",
    hasVariants: false,
  });

  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([]);
  const [variantCombinations, setVariantCombinations] = useState<VariantCombination[]>([]);

  useEffect(() => {
    const adminData = localStorage.getItem("adminUser");
    if (!adminData) {
      router.push("/admin/login");
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      console.log('Cargando datos...');
      const [productsData, configsData] = await Promise.all([
        productsAPI.getAll(),
        variantConfigsAPI.getAll()
      ]);
      console.log('Productos cargados:', productsData);
      console.log('Configuraciones cargadas:', configsData);
      
      // Organizar productos con sus variantes
      const productsMap = new Map<number, ProductWithVariants>();
      const variantProducts: Product[] = [];

      productsData.forEach((product: Product) => {
        if (product.isParent) {
          productsMap.set(product.id, { ...product, variants: [] });
        } else if (product.parentId) {
          variantProducts.push(product);
        } else {
          productsMap.set(product.id, product);
        }
      });

      variantProducts.forEach((variant) => {
        if (variant.parentId && productsMap.has(variant.parentId)) {
          const parent = productsMap.get(variant.parentId)!;
          if (parent.variants) {
            parent.variants.push(variant);
          }
        }
      });

      const organizedProducts = Array.from(productsMap.values());
      setProducts(organizedProducts);
      setVariantConfigs(configsData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      alert("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const getNextSKU = async (): Promise<string> => {
    try {
      const allProducts = await productsAPI.getAll();
      
      // Encontrar el SKU más alto
      let maxSKU = 0;
      allProducts.forEach((product: Product) => {
        const skuMatch = product.sku.match(/^SKU-(\d+)/);
        if (skuMatch) {
          const skuNum = parseInt(skuMatch[1]);
          if (skuNum > maxSKU) {
            maxSKU = skuNum;
          }
        }
      });
      
      // Retornar el siguiente SKU
      const nextNum = maxSKU + 1;
      return `SKU-${nextNum.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Error al generar SKU:', error);
      return `SKU-${Date.now()}`;
    }
  };

  const generateCombinations = () => {
    if (selectedVariants.length === 0) return [];

    const allValues = selectedVariants.map(sv => 
      sv.selectedValues.map(value => ({ type: sv.type, label: sv.label, value }))
    );

    const combinations: { type: string; value: string }[][] = [[]];
    
    for (const values of allValues) {
      const newCombinations: { type: string; value: string }[][] = [];
      for (const combination of combinations) {
        for (const value of values) {
          newCombinations.push([...combination, value]);
        }
      }
      combinations.length = 0;
      combinations.push(...newCombinations);
    }

    return combinations.map((combo, index) => ({
      combinations: combo,
      price: formData.price,
      stock: "0",
      sku: `${formData.sku}-V${(index + 1).toString().padStart(3, '0')}`,
    }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.name || !formData.sku || (!formData.hasVariants && (!formData.price || !formData.stock))) {
        alert("Por favor completa todos los campos requeridos");
        return;
      }
      if (formData.hasVariants) {
        setCurrentStep(2);
      } else {
        // Producto simple, crear directamente
        handleSubmitSimple();
      }
    } else if (currentStep === 2) {
      if (selectedVariants.length === 0 || selectedVariants.some(sv => sv.selectedValues.length === 0)) {
        alert("Debes seleccionar al menos un tipo de variante y sus valores");
        return;
      }
      const combinations = generateCombinations();
      setVariantCombinations(combinations);
      setCurrentStep(3);
    }
  };

  const handleSubmitSimple = async () => {
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        isParent: false,
        parentId: null,
        variantType: null,
        variantValue: null,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await productsAPI.create(productData);
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert("Error al guardar producto");
    }
  };

  const handleSubmitWithVariants = async () => {
    try {
      // Crear producto padre
      const parentData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        stock: 0,
        sku: formData.sku,
        imageUrl: formData.imageUrl,
        isParent: true,
        parentId: null,
        variantType: null,
        isActive: true,
        variantValue: null,
        createdAt: new Date().toISOString(),
      };

      const parentProduct = await productsAPI.create(parentData);

      // Crear todas las variantes
      for (const combo of variantCombinations) {
        const variantName = `${formData.name} - ${combo.combinations.map(c => c.value).join(' / ')}`;
        const variantDesc = `${formData.description} - ${combo.combinations.map(c => `${c.type}: ${c.value}`).join(', ')}`;
        
        const variantData = {
          name: variantName,
          description: variantDesc,
          category: formData.category,
          price: parseFloat(combo.price),
          stock: parseInt(combo.stock),
          sku: combo.sku,
          imageUrl: formData.imageUrl,
          isParent: false,
          parentId: parentProduct.id,
          isActive: true,
          variantType: combo.combinations.map(c => c.type).join('_'),
          variantValue: combo.combinations.map(c => c.value).join(' / '),
          createdAt: new Date().toISOString(),
        };

        await productsAPI.create(variantData);
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error al crear producto con variantes:", error);
      alert("Error al crear producto con variantes");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: (product.category || 'ropa') as 'ropa' | 'accesorios',
      price: (product.price || 0).toString(),
      stock: (product.stock || 0).toString(),
      sku: product.sku || '',
      imageUrl: product.imageUrl || "",
      hasVariants: product.isParent || false,
    });
    setShowModal(true);
  };

  const openNewProductModal = async () => {
    setEditingProduct(null);
    resetForm();
    
    // Auto-generar SKU para nuevo producto
    const nextSKU = await getNextSKU();
    setFormData(prev => ({ ...prev, sku: nextSKU }));
    
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estas seguro de eliminar este producto?")) return;

    try {
      await productsAPI.delete(id);
      loadData();
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      alert("Error al eliminar producto");
    }
  };

  const toggleExpand = (productId: number) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "ropa",
      price: "",
      stock: "",
      sku: "",
      imageUrl: "",
      hasVariants: false,
    });
    setSelectedVariants([]);
    setVariantCombinations([]);
    setCurrentStep(1);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    resetForm();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar que sea una imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
      }
      
      // Verificar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen es muy grande. Máximo 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, imageUrl: '' });
  };

  const getTotalStock = (product: ProductWithVariants): number => {
    if (product.isParent && product.variants) {
      return product.variants.reduce((sum, v) => sum + v.stock, 0);
    }
    return product.stock;
  };

  const toggleVariantConfig = (config: VariantConfig) => {
    const exists = selectedVariants.find(sv => sv.configId === config.id);
    if (exists) {
      setSelectedVariants(selectedVariants.filter(sv => sv.configId !== config.id));
    } else {
      setSelectedVariants([...selectedVariants, {
        configId: config.id,
        type: config.type,
        label: config.label,
        hasGlobalValues: config.hasGlobalValues,
        selectedValues: [],
      }]);
    }
  };

  const toggleVariantValue = (configId: number, value: string) => {
    setSelectedVariants(selectedVariants.map(sv => {
      if (sv.configId === configId) {
        const hasValue = sv.selectedValues.includes(value);
        return {
          ...sv,
          selectedValues: hasValue 
            ? sv.selectedValues.filter(v => v !== value)
            : [...sv.selectedValues, value]
        };
      }
      return sv;
    }));
  };

  const addCustomValue = (configId: number, value: string) => {
    if (!value.trim()) return;
    setSelectedVariants(selectedVariants.map(sv => {
      if (sv.configId === configId && !sv.selectedValues.includes(value.trim())) {
        return {
          ...sv,
          selectedValues: [...sv.selectedValues, value.trim()]
        };
      }
      return sv;
    }));
  };

  const removeCustomValue = (configId: number, value: string) => {
    setSelectedVariants(selectedVariants.map(sv => {
      if (sv.configId === configId) {
        return {
          ...sv,
          selectedValues: sv.selectedValues.filter(v => v !== value)
        };
      }
      return sv;
    }));
  };

  const updateCombinationValue = (index: number, field: 'price' | 'stock' | 'sku' | 'imageUrl', value: string) => {
    const updated = [...variantCombinations];
    updated[index] = { ...updated[index], [field]: value };
    setVariantCombinations(updated);
  };

  const toggleActive = async (product: Product) => {
    try {
      await productsAPI.update(product.id, {
        ...product,
        isActive: product.isActive === false ? true : false,
      });
      loadData();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      alert("Error al cambiar estado del producto");
    }
  };

  const openBulkEdit = (product: ProductWithVariants) => {
    setEditingParent(product);
    setShowBulkEditModal(true);
  };

  const openAddVariants = (product: ProductWithVariants) => {
    setEditingParent(product);
    setFormData({
      ...formData,
      name: product.name,
      description: product.description,
      category: (product.category || 'ropa') as 'ropa' | 'accesorios',
      price: product.price.toString(),
      sku: product.sku,
    });
    
    // Detectar qué tipos de variantes ya tiene el producto
    if (product.variants && product.variants.length > 0) {
      const existingVariantTypes = new Set<string>();
      product.variants.forEach(variant => {
        if (variant.variantType) {
          // variantType puede ser "size", "color", o "size_color"
          variant.variantType.split('_').forEach(type => existingVariantTypes.add(type));
        }
      });
      
      // Pre-seleccionar las configuraciones existentes
      const preSelected: SelectedVariant[] = [];
      variantConfigs.forEach(config => {
        if (existingVariantTypes.has(config.type)) {
          // Obtener los valores existentes para este tipo
          const existingValues = new Set<string>();
          product.variants?.forEach(variant => {
            if (variant.variantValue) {
              // Extraer valores específicos del tipo
              const valueParts = variant.variantValue.split(' / ');
              const typeParts = variant.variantType?.split('_') || [];
              typeParts.forEach((type, index) => {
                if (type === config.type && valueParts[index]) {
                  existingValues.add(valueParts[index]);
                }
              });
            }
          });
          
          preSelected.push({
            configId: config.id,
            type: config.type,
            label: config.label,
            hasGlobalValues: config.hasGlobalValues,
            selectedValues: Array.from(existingValues),
          });
        }
      });
      
      setSelectedVariants(preSelected);
    }
    
    setShowAddVariantsModal(true);
  };

  const handleBulkUpdate = async (updatedVariants: Product[]) => {
    try {
      for (const variant of updatedVariants) {
        await productsAPI.update(variant.id, variant);
      }
      setShowBulkEditModal(false);
      setEditingParent(null);
      loadData();
    } catch (error) {
      console.error("Error al actualizar variantes:", error);
      alert("Error al actualizar variantes");
    }
  };

  const handleAddNewVariants = async () => {
    if (!editingParent) return;

    try {
      const combinations = generateCombinations();
      
      for (const combo of combinations) {
        const variantName = `${editingParent.name} - ${combo.combinations.map(c => c.value).join(' / ')}`;
        const variantDesc = `${editingParent.description} - ${combo.combinations.map(c => `${c.type}: ${c.value}`).join(', ')}`;
        
        const variantData = {
          name: variantName,
          description: variantDesc,
          category: editingParent.category,
          price: parseFloat(combo.price),
          stock: parseInt(combo.stock),
          sku: combo.sku,
          imageUrl: editingParent.imageUrl || "",
          isParent: false,
          parentId: editingParent.id,
          variantType: combo.combinations.map(c => c.type).join('_'),
          variantValue: combo.combinations.map(c => c.value).join(' / '),
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        await productsAPI.create(variantData);
      }

      setShowAddVariantsModal(false);
      setEditingParent(null);
      setSelectedVariants([]);
      setVariantCombinations([]);
      setCurrentStep(1);
      loadData();
    } catch (error) {
      console.error("Error al agregar variantes:", error);
      alert("Error al agregar variantes");
    }
  };

  console.log('Estado actual - Loading:', loading, 'Products:', products.length);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion de Productos</h1>
            <p className="text-sm text-gray-600">Control de inventario y variantes</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Volver al Dashboard
            </button>
            <button
              onClick={openNewProductModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Nuevo Producto
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header de la tabla */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm">
            <div className="col-span-3">Producto</div>
            <div className="col-span-1">Imagen</div>
            <div>Categoría</div>
            <div>Precio</div>
            <div>Stock</div>
            <div className="col-span-2 text-center">Variaciones</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>
          
          {products.map((product) => (
            <div key={product.id} className="border-b last:border-b-0">
              {/* Producto Principal */}
              <div className="flex items-center px-6 py-4 hover:bg-gray-50">
                <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      {product.isParent && (
                        <button
                          onClick={() => toggleExpand(product.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {expandedProducts.has(product.id) ? "▼" : "▶"}
                        </button>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${product.isActive === false ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {product.name}
                          </p>
                          {product.isActive === false && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{product.sku}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </div>
                  <div className="text-gray-900">${(product.price || 0).toFixed(2)}</div>
                  <div>
                    <span className={`font-medium ${getTotalStock(product) > 10 ? 'text-green-600' : getTotalStock(product) > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {product.isParent ? `${getTotalStock(product)} total` : getTotalStock(product)}
                    </span>
                  </div>
                  <div className="col-span-2 flex gap-2 justify-center">
                    {product.isParent && (
                      <>
                        <button
                          onClick={() => openBulkEdit(product)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Variantes"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openAddVariants(product)}
                          className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                          title="Agregar Variantes"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                  <div className="col-span-2 flex gap-2 justify-end">
                    <label className="relative inline-flex items-center cursor-pointer" title={product.isActive === false ? 'Activar Producto' : 'Desactivar Producto'}>
                      <input
                        type="checkbox"
                        checked={product.isActive !== false}
                        onChange={() => toggleActive(product)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                    <button
                      onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                      className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar Producto y Variantes"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar Producto"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Variantes */}
              {product.isParent && product.variants && expandedProducts.has(product.id) && (
                <div className="bg-gray-50 px-6 py-2">
                  {product.variants.map((variant) => (
                    <div key={variant.id} className="flex items-center py-2 pl-8 border-l-2 border-indigo-200">
                      <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm ${variant.isActive === false ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                              {variant.variantValue}
                            </p>
                            {variant.isActive === false && (
                              <span className="px-1 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{variant.sku}</p>
                        </div>
                        <div className="col-span-1">
                          {(variant.imageUrl || product.imageUrl) ? (
                            <div className="relative">
                              <img 
                                src={variant.imageUrl || product.imageUrl || ''} 
                                alt={variant.variantValue || ''}
                                className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                              />
                              {variant.imageUrl && (
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                  ✓
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                            variante
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">${variant.price.toFixed(2)}</div>
                        <div className="text-sm">
                          <span className={`font-medium ${variant.stock > 10 ? 'text-green-600' : variant.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {variant.stock}
                          </span>
                        </div>
                        <div className="col-span-5 flex flex-wrap gap-2 justify-end">
                          <label className="relative inline-flex items-center cursor-pointer" title={variant.isActive === false ? 'Activar' : 'Desactivar'}>
                            <input
                              type="checkbox"
                              checked={variant.isActive !== false}
                              onChange={() => toggleActive(variant)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                          </label>
                          <button
                            onClick={() => handleEdit(variant)}
                            className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar Variante"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(variant.id)}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar Variante"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {products.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No hay productos registrados
            </div>
          )}
        </div>
      </main>

      {/* Modal Crear Producto */}
      {showModal && !editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            {/* Progress Steps */}
            <div className="mb-6">
              <div className="flex items-center justify-center">
                <div className={`flex items-center ${currentStep >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
                    1
                  </div>
                  <span className="ml-2 text-sm font-medium">Informacion Basica</span>
                </div>
                {formData.hasVariants && (
                  <>
                    <div className={`w-16 h-0.5 mx-2 ${currentStep >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                    <div className={`flex items-center ${currentStep >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
                        2
                      </div>
                      <span className="ml-2 text-sm font-medium">Seleccionar Variantes</span>
                    </div>
                    <div className={`w-16 h-0.5 mx-2 ${currentStep >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                    <div className={`flex items-center ${currentStep >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
                        3
                      </div>
                      <span className="ml-2 text-sm font-medium">Precios y Stock</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-6">Nuevo Producto</h2>

            {/* Step 1: Informacion Basica */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={formData.hasVariants}
                      onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Este producto tiene variantes (tallas, colores, diseños)
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripcion *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as "ropa" | "accesorios" })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="ropa">Ropa</option>
                      <option value="accesorios">Accesorios</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU * <span className="text-xs text-gray-500">(Auto-generado)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Base * {formData.hasVariants && <span className="text-xs text-gray-500">(Se puede ajustar por variante)</span>}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  {!formData.hasVariants && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock *
                      </label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                {/* Campo de Imagen */}
                <div className="border-t pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imagen del Producto
                  </label>
                  
                  {!formData.imageUrl ? (
                    <div className="flex items-center gap-4">
                      <label className="flex-1 cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-600">Haz clic para seleccionar una imagen</p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF hasta 2MB</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img 
                          src={formData.imageUrl} 
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-2">Imagen cargada correctamente</p>
                        <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                          Cambiar imagen
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {formData.hasVariants ? 'Siguiente ?' : 'Crear Producto'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Seleccionar Variantes */}
            {currentStep === 2 && formData.hasVariants && (
              <div className="space-y-6">
                <p className="text-sm text-gray-600">Selecciona los tipos de variantes y sus valores para este producto</p>
                
                {variantConfigs.map((config) => {
                  const isSelected = selectedVariants.find(sv => sv.configId === config.id);
                  return (
                    <div key={config.id} className="border border-gray-200 rounded-lg p-4">
                      <label className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => toggleVariantConfig(config)}
                          className="rounded"
                        />
                        <span className="text-lg font-medium text-gray-900">{config.label}</span>
                        <span className="text-xs text-gray-500">({config.type})</span>
                      </label>

                      {isSelected && (
                        <div className="ml-6 mt-3">
                          {config.hasGlobalValues && config.values && config.values.length > 0 ? (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Selecciona los valores que aplican:</p>
                              <div className="flex flex-wrap gap-2">
                                {config.values.map((value) => {
                                  const isValueSelected = isSelected.selectedValues.includes(value);
                                  return (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() => toggleVariantValue(config.id, value)}
                                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                        isValueSelected
                                          ? 'bg-indigo-600 text-white border-indigo-600'
                                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                                      }`}
                                    >
                                      {value}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Agrega valores personalizados para este producto:</p>
                              <div className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  placeholder={`Ej: ${config.type === 'design' ? 'Diseño 1, Diseño 2' : 'Valor personalizado'}`}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const input = e.currentTarget;
                                      addCustomValue(config.id, input.value);
                                      input.value = '';
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    const input = e.currentTarget.previousSibling as HTMLInputElement;
                                    addCustomValue(config.id, input.value);
                                    input.value = '';
                                  }}
                                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                  Agregar
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {isSelected.selectedValues.map((value) => (
                                  <span
                                    key={value}
                                    className="px-3 py-1 text-sm bg-indigo-100 text-indigo-800 rounded-full flex items-center gap-2"
                                  >
                                    {value}
                                    <button
                                      type="button"
                                      onClick={() => removeCustomValue(config.id, value)}
                                      className="text-indigo-600 hover:text-indigo-900"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Siguiente ?
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Precios y Stock */}
            {currentStep === 3 && variantCombinations.length > 0 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900">
                    <strong>{variantCombinations.length} variantes</strong> seran creadas. Define el precio y stock para cada una:
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-3">
                  {variantCombinations.map((combo, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        {combo.combinations.map(c => c.value).join(' / ')}
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Precio
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={combo.price}
                            onChange={(e) => updateCombinationValue(index, 'price', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Stock
                          </label>
                          <input
                            type="number"
                            value={combo.stock}
                            onChange={(e) => updateCombinationValue(index, 'stock', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            SKU <span className="text-xs text-gray-500">(Auto-generado)</span>
                          </label>
                          <input
                            type="text"
                            value={combo.sku}
                            readOnly
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitWithVariants}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Crear Producto y Variantes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Edicion en Masa de Variantes */}
      {showBulkEditModal && editingParent && editingParent.variants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-6xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2">Editar Variantes en Masa</h2>
            <p className="text-sm text-gray-600 mb-4">Producto: {editingParent.name}</p>

            {/* Editar Imagen del Producto Padre */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">Imagen del Producto</h3>
              {!editingParent.imageUrl ? (
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-3 text-center hover:border-blue-500 transition-colors bg-white">
                    <svg className="mx-auto h-8 w-8 text-blue-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-1 text-xs text-blue-700">Haz clic para agregar imagen</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!file.type.startsWith('image/')) {
                          alert('Por favor selecciona un archivo de imagen válido');
                          return;
                        }
                        if (file.size > 2 * 1024 * 1024) {
                          alert('La imagen es muy grande. Máximo 2MB');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (editingParent) {
                            editingParent.imageUrl = reader.result as string;
                            setEditingParent({...editingParent});
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={editingParent.imageUrl} 
                      alt="Producto"
                      className="w-16 h-16 object-cover rounded-lg border-2 border-blue-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editingParent) {
                          editingParent.imageUrl = '';
                          setEditingParent({...editingParent});
                        }
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <label className="cursor-pointer flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm text-center text-blue-700 bg-white hover:bg-blue-50">
                    Cambiar imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (!file.type.startsWith('image/')) {
                            alert('Por favor selecciona un archivo de imagen válido');
                            return;
                          }
                          if (file.size > 2 * 1024 * 1024) {
                            alert('La imagen es muy grande. Máximo 2MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (editingParent) {
                              editingParent.imageUrl = reader.result as string;
                              setEditingParent({...editingParent});
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {editingParent.variants.map((variant, index) => (
                <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex gap-4 mb-3">
                    {/* Imagen de la variante */}
                    <div className="flex-shrink-0">
                      {!variant.imageUrl ? (
                        <label className="cursor-pointer block">
                          <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-indigo-500 transition-colors">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (!file.type.startsWith('image/')) {
                                  alert('Por favor selecciona un archivo de imagen válido');
                                  return;
                                }
                                if (file.size > 2 * 1024 * 1024) {
                                  alert('La imagen es muy grande. Máximo 2MB');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (editingParent.variants) {
                                    editingParent.variants[index].imageUrl = reader.result as string;
                                    setEditingParent({...editingParent});
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="relative">
                          <img 
                            src={variant.imageUrl} 
                            alt={variant.variantValue || ''}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editingParent.variants) {
                                editingParent.variants[index].imageUrl = '';
                                setEditingParent({...editingParent});
                              }
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <label className="absolute -bottom-1 left-0 right-0 bg-indigo-600 text-white text-xs py-1 text-center rounded-b-lg cursor-pointer hover:bg-indigo-700">
                            Cambiar
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (!file.type.startsWith('image/')) {
                                    alert('Por favor selecciona un archivo de imagen válido');
                                    return;
                                  }
                                  if (file.size > 2 * 1024 * 1024) {
                                    alert('La imagen es muy grande. Máximo 2MB');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (editingParent.variants) {
                                      editingParent.variants[index].imageUrl = reader.result as string;
                                      setEditingParent({...editingParent});
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                    
                    {/* Info de la variante */}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{variant.variantValue}</p>
                      <p className="text-xs text-gray-500">{variant.sku}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-3 items-center">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Precio</label>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={variant.price}
                        onChange={(e) => {
                          if (editingParent.variants) {
                            editingParent.variants[index].price = parseFloat(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
                      <input
                        type="number"
                        defaultValue={variant.stock}
                        onChange={(e) => {
                          if (editingParent.variants) {
                            editingParent.variants[index].stock = parseInt(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        SKU <span className="text-xs text-gray-500">(Auto-generado)</span>
                      </label>
                      <input
                        type="text"
                        value={variant.sku}
                        readOnly
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                      <input
                        type="text"
                        defaultValue={variant.name}
                        onChange={(e) => {
                          if (editingParent.variants) {
                            editingParent.variants[index].name = e.target.value;
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center justify-center">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          defaultChecked={variant.isActive !== false}
                          onChange={(e) => {
                            if (editingParent.variants) {
                              editingParent.variants[index].isActive = e.target.checked;
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-700">Activo</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => {
                  setShowBulkEditModal(false);
                  setEditingParent(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingParent.variants) {
                    handleBulkUpdate(editingParent.variants);
                  }
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Nuevas Variantes */}
      {showAddVariantsModal && editingParent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2">Agregar Nuevas Variantes</h2>
            <p className="text-sm text-gray-600 mb-6">Producto: {editingParent.name}</p>

            {currentStep === 1 && (
              <div className="space-y-6">
                <p className="text-sm text-gray-600">Selecciona los tipos de variantes y sus valores que deseas agregar</p>
                
                {variantConfigs.map((config) => {
                  const isSelected = selectedVariants.find(sv => sv.configId === config.id);
                  // Detectar si esta variante ya existe en el producto
                  const alreadyExists = editingParent.variants?.some(v => 
                    v.variantType?.split('_').includes(config.type)
                  );
                  
                  return (
                    <div key={config.id} className="border border-gray-200 rounded-lg p-4">
                      <label className="flex items-center gap-2 mb-3">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => toggleVariantConfig(config)}
                          disabled={alreadyExists}
                          className="rounded"
                        />
                        <span className={`text-lg font-medium ${alreadyExists ? 'text-gray-500' : 'text-gray-900'}`}>
                          {config.label}
                          {alreadyExists && (
                            <span className="ml-2 text-xs text-gray-500">(Ya definido)</span>
                          )}
                        </span>
                      </label>

                      {isSelected && (
                        <div className="ml-6 mt-3">
                          {config.hasGlobalValues && config.values && config.values.length > 0 ? (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">
                                Selecciona los valores: 
                                {alreadyExists && (
                                  <span className="ml-2 text-xs text-gray-500">(Los valores existentes no se pueden modificar)</span>
                                )}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {config.values.map((value) => {
                                  const isValueSelected = isSelected.selectedValues.includes(value);
                                  // Verificar si este valor específico ya existe en las variantes del producto
                                  const valueAlreadyExists = editingParent.variants?.some(v => {
                                    if (v.variantValue && v.variantType?.split('_').includes(config.type)) {
                                      const valueParts = v.variantValue.split(' / ');
                                      const typeParts = v.variantType.split('_');
                                      const index = typeParts.indexOf(config.type);
                                      return valueParts[index] === value;
                                    }
                                    return false;
                                  });
                                  
                                  return (
                                    <button
                                      key={value}
                                      type="button"
                                      onClick={() => !valueAlreadyExists && toggleVariantValue(config.id, value)}
                                      disabled={valueAlreadyExists}
                                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                        valueAlreadyExists
                                          ? 'bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed'
                                          : isValueSelected
                                          ? 'bg-indigo-600 text-white border-indigo-600'
                                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                                      }`}
                                      title={valueAlreadyExists ? 'Este valor ya existe en el producto' : ''}
                                    >
                                      {value}
                                      {valueAlreadyExists && (
                                        <span className="ml-1">✓</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Agrega valores personalizados:</p>
                              <div className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  placeholder={`Ej: ${config.type === 'design' ? 'Diseño 3, Diseño 4' : 'Valor'}`}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const input = e.currentTarget;
                                      addCustomValue(config.id, input.value);
                                      input.value = '';
                                    }
                                  }}
                                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    const input = e.currentTarget.previousSibling as HTMLInputElement;
                                    addCustomValue(config.id, input.value);
                                    input.value = '';
                                  }}
                                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                  Agregar
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {isSelected.selectedValues.map((value) => {
                                  // Verificar si este valor ya existe en las variantes del producto
                                  const valueAlreadyExists = editingParent.variants?.some(v => {
                                    if (v.variantValue && v.variantType?.split('_').includes(config.type)) {
                                      const valueParts = v.variantValue.split(' / ');
                                      const typeParts = v.variantType.split('_');
                                      const index = typeParts.indexOf(config.type);
                                      return valueParts[index] === value;
                                    }
                                    return false;
                                  });

                                  return (
                                    <span
                                      key={value}
                                      className={`px-3 py-1 text-sm rounded-full flex items-center gap-2 ${
                                        valueAlreadyExists
                                          ? 'bg-gray-200 text-gray-600 border border-gray-400'
                                          : 'bg-indigo-100 text-indigo-800'
                                      }`}
                                      title={valueAlreadyExists ? 'Este valor ya existe en el producto' : ''}
                                    >
                                      {valueAlreadyExists && <span className="text-xs">✓</span>}
                                      {value}
                                      {!valueAlreadyExists && (
                                        <button
                                          type="button"
                                          onClick={() => removeCustomValue(config.id, value)}
                                          className="text-indigo-600 hover:text-indigo-900"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                              {isSelected.selectedValues.some(value => {
                                return editingParent.variants?.some(v => {
                                  if (v.variantValue && v.variantType?.split('_').includes(config.type)) {
                                    const valueParts = v.variantValue.split(' / ');
                                    const typeParts = v.variantType.split('_');
                                    const index = typeParts.indexOf(config.type);
                                    return valueParts[index] === value;
                                  }
                                  return false;
                                });
                              }) && (
                                <p className="text-xs text-gray-500 mt-2">
                                  (Los valores existentes no se pueden eliminar)
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddVariantsModal(false);
                      setEditingParent(null);
                      setSelectedVariants([]);
                      setCurrentStep(1);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedVariants.length === 0 || selectedVariants.some(sv => sv.selectedValues.length === 0)) {
                        alert("Debes seleccionar al menos un tipo de variante y sus valores");
                        return;
                      }
                      const combinations = generateCombinations();
                      setVariantCombinations(combinations);
                      setCurrentStep(2);
                    }}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Siguiente ?
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && variantCombinations.length > 0 && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900">
                    <strong>{variantCombinations.length} nuevas variantes</strong> seran agregadas. Define el precio y stock:
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-3">
                  {variantCombinations.map((combo, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex gap-4 mb-3">
                        {/* Imagen de la variante */}
                        <div className="flex-shrink-0">
                          {!combo.imageUrl ? (
                            <label className="cursor-pointer block">
                              <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-indigo-500 transition-colors">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (!file.type.startsWith('image/')) {
                                      alert('Por favor selecciona un archivo de imagen válido');
                                      return;
                                    }
                                    if (file.size > 2 * 1024 * 1024) {
                                      alert('La imagen es muy grande. Máximo 2MB');
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      updateCombinationValue(index, 'imageUrl', reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          ) : (
                            <div className="relative">
                              <img 
                                src={combo.imageUrl} 
                                alt={combo.combinations.map(c => c.value).join(' / ')}
                                className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                              />
                              <button
                                type="button"
                                onClick={() => updateCombinationValue(index, 'imageUrl', '')}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              <label className="absolute -bottom-1 left-0 right-0 bg-indigo-600 text-white text-xs py-1 text-center rounded-b-lg cursor-pointer hover:bg-indigo-700">
                                Cambiar
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (!file.type.startsWith('image/')) {
                                        alert('Por favor selecciona un archivo de imagen válido');
                                        return;
                                      }
                                      if (file.size > 2 * 1024 * 1024) {
                                        alert('La imagen es muy grande. Máximo 2MB');
                                        return;
                                      }
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        updateCombinationValue(index, 'imageUrl', reader.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Título de la combinación */}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {combo.combinations.map(c => c.value).join(' / ')}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {combo.imageUrl ? 'Con imagen personalizada' : 'Sin imagen (usará la del producto)'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Precio</label>
                          <input
                            type="number"
                            step="0.01"
                            value={combo.price}
                            onChange={(e) => updateCombinationValue(index, 'price', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
                          <input
                            type="number"
                            value={combo.stock}
                            onChange={(e) => updateCombinationValue(index, 'stock', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            SKU <span className="text-xs text-gray-500">(Auto-generado)</span>
                          </label>
                          <input
                            type="text"
                            value={combo.sku}
                            readOnly
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewVariants}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Agregar Variantes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Editar (simplificado) */}
      {showModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Editar Producto</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await productsAPI.update(editingProduct.id, {
                  ...formData,
                  price: parseFloat(formData.price),
                  stock: parseInt(formData.stock),
                  createdAt: editingProduct.createdAt,
                });
                setShowModal(false);
                setEditingProduct(null);
                resetForm();
                loadData();
              } catch (error) {
                console.error("Error al actualizar:", error);
                alert("Error al actualizar producto");
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Precio</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Campo de Imagen */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen del Producto
                </label>
                
                {!formData.imageUrl ? (
                  <label className="cursor-pointer block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-500 transition-colors">
                      <svg className="mx-auto h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-1 text-xs text-gray-600">Haz clic para seleccionar</p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 2MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img 
                        src={formData.imageUrl} 
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <label className="cursor-pointer flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center text-gray-700 bg-white hover:bg-gray-50">
                      Cambiar
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}