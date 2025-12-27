'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  price: number;
  stock: number;
  isParent?: boolean;
  isActive: boolean;
}

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedIds: number[]) => void;
  availableProducts: Product[];
}

export default function ProductSelectorModal({
  isOpen,
  onClose,
  onSave,
  availableProducts,
}: ProductSelectorModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'regular' | 'parent'>('all');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedIds(new Set());
      setSearchTerm('');
      setFilterType('all');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleProduct = (productId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleSave = () => {
    onSave(Array.from(selectedIds));
    onClose();
  };

  const filteredProducts = availableProducts.filter(product => {
    const matchesSearch = 
      (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'regular' && !product.isParent) ||
      (filterType === 'parent' && product.isParent);

    return matchesSearch && matchesFilter;
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Seleccionar Productos</h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedIds.size} producto{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, SKU o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Todos los tipos</option>
              <option value="regular">Solo regulares</option>
              <option value="parent">Solo con variantes</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {selectedIds.size === filteredProducts.length ? '☐ Deseleccionar todos' : '☑ Seleccionar todos'}
            </button>
            <p className="text-sm text-gray-500">
              Mostrando {filteredProducts.length} de {availableProducts.length} productos
            </p>
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-lg">No se encontraron productos</p>
              <p className="text-sm mt-1">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <label
                  key={product.id}
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedIds.has(product.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="w-5 h-5 rounded mr-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{product.name}</p>
                      {product.isParent && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          Con variantes
                        </span>
                      )}
                      {!product.isActive && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>SKU: <strong>{product.sku || 'N/A'}</strong></span>
                      <span>Precio: <strong className="text-green-600">${(product.price || 0).toFixed(2)}</strong></span>
                      <span>Stock: <strong className={(product.stock || 0) > 0 ? 'text-green-600' : 'text-red-600'}>{product.stock || 0}</strong></span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={selectedIds.size === 0}
            className={`px-6 py-2.5 rounded-lg font-medium ${
              selectedIds.size === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            💾 Guardar ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
