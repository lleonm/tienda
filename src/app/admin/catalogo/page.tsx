'use client';

import { useState, useEffect } from 'react';
import { catalogAPI, productsAPI, productCatalogNodesAPI } from '@/lib/api';
import { CatalogNode, CatalogNodeWithChildren, ProductCatalogNode } from '@/types';
import Modal, { ModalType } from '@/components/Modal';
import ProductSelectorModal from '@/components/ProductSelectorModal';

export default function CatalogoPage() {
  const [nodes, setNodes] = useState<CatalogNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<CatalogNode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [productCounts, setProductCounts] = useState<Record<number, number>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [products, setProducts] = useState<any[]>([]);
  const [associatedProducts, setAssociatedProducts] = useState<any[]>([]);
  const [productCatalogNodes, setProductCatalogNodes] = useState<ProductCatalogNode[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  
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
    description: '',
    parentId: null as number | null,
    order: 0,
    isActive: true,
    isFinal: false,
  });

  const showModal = (type: ModalType, title: string, message: string, onConfirm?: () => void) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
  };

  const loadAssociatedProducts = async (nodeId: number) => {
    try {
      // Obtener relaciones producto-nodo para este nodo
      const relations = await productCatalogNodesAPI.getByCatalogNodeId(nodeId);
      
      // Obtener todos los productos
      const allProducts = await productsAPI.getAll();
      
      // Filtrar productos que están asociados a este nodo
      const productIds = relations.map((r: ProductCatalogNode) => r.product_id);
      const associated = allProducts.filter((p: any) => productIds.includes(Number(p.id)));
      
      // Agregar información de si es primario
      const associatedWithInfo = associated.map((p: any) => {
        const relation = relations.find((r: ProductCatalogNode) => Number(r.product_id) === Number(p.id));
        return {
          ...p,
          isPrimary: relation?.isPrimary || false,
          relationId: relation?.id
        };
      });
      
      setAssociatedProducts(associatedWithInfo);
    } catch (error) {
      console.error('Error cargando productos asociados:', error);
    }
  };

  const handleAssociateProduct = async (productId: number) => {
    if (!selectedNode) return;
    
    try {
      // Verificar si ya existe la relación
      const existing = await productCatalogNodesAPI.getByProductId(productId);
      const alreadyAssociated = existing.some((r: ProductCatalogNode) => 
        Number(r.catalog_node_id) === Number(selectedNode.id)
      );
      
      if (alreadyAssociated) {
        showModal('warning', 'Ya asociado', 'Este producto ya está asociado a este nodo');
        return;
      }
      
      // Verificar si el producto ya tiene un nodo primario
      const hasPrimary = existing.some((r: ProductCatalogNode) => r.isPrimary);
      
      await productCatalogNodesAPI.create({
        product_id: productId,
        catalog_node_id: selectedNode.id,
        isPrimary: !hasPrimary, // Si no tiene primario, este será el primario
        createdAt: new Date().toISOString(),
      });
      
      showModal('success', '¡Asociado!', 'El producto se asoció correctamente al nodo');
      loadData();
      loadAssociatedProducts(selectedNode.id);
    } catch (error) {
      console.error('Error asociando producto:', error);
      showModal('error', 'Error', 'No se pudo asociar el producto');
    }
  };

  const handleAssociateMultipleProducts = async (productIds: number[]) => {
    if (!selectedNode || productIds.length === 0) return;
    
    try {
      // Asociar todos los productos seleccionados
      const allRelations = await productCatalogNodesAPI.getAll();
      
      for (const productId of productIds) {
        // Verificar si ya existe la relación
        const alreadyAssociated = allRelations.some((r: ProductCatalogNode) => 
          Number(r.product_id) === Number(productId) && 
          Number(r.catalog_node_id) === Number(selectedNode.id)
        );
        
        if (!alreadyAssociated) {
          // Verificar si el producto ya tiene un nodo primario
          const productRelations = allRelations.filter((r: ProductCatalogNode) => 
            Number(r.product_id) === Number(productId)
          );
          const hasPrimary = productRelations.some((r: ProductCatalogNode) => r.isPrimary);
          
          await productCatalogNodesAPI.create({
            product_id: productId,
            catalog_node_id: selectedNode.id,
            isPrimary: !hasPrimary,
            createdAt: new Date().toISOString(),
          });
        }
      }
      
      showModal('success', '¡Asociados!', `${productIds.length} producto(s) asociado(s) correctamente`);
      setShowProductSelector(false);
      loadData();
      loadAssociatedProducts(selectedNode.id);
    } catch (error) {
      console.error('Error asociando productos:', error);
      showModal('error', 'Error', 'No se pudieron asociar algunos productos');
    }
  };

  const handleDisassociateProduct = async (product: any) => {
    showModal('confirm', '¿Desasociar producto?', `¿Deseas quitar "${product.name}" de este nodo?`, async () => {
      try {
        // Eliminar la relación usando el relationId
        if (product.relationId) {
          await productCatalogNodesAPI.delete(product.relationId);
          showModal('success', '¡Desasociado!', 'El producto se desasoció correctamente');
          if (selectedNode) {
            loadData();
            loadAssociatedProducts(selectedNode.id);
          }
        }
      } catch (error) {
        console.error('Error desasociando producto:', error);
        showModal('error', 'Error', 'No se pudo desasociar el producto');
      }
    });
  };

  const handleTogglePrimary = async (product: any) => {
    if (!product.relationId) return;
    
    try {
      await productCatalogNodesAPI.update(product.relationId, {
        isPrimary: !product.isPrimary
      });
      
      showModal('success', '¡Actualizado!', 
        product.isPrimary ? 'Ya no es el nodo principal' : 'Marcado como nodo principal'
      );
      
      if (selectedNode) {
        loadAssociatedProducts(selectedNode.id);
      }
    } catch (error) {
      console.error('Error actualizando relación:', error);
      showModal('error', 'Error', 'No se pudo actualizar');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    setExpandedNodes(new Set(nodes.map(n => n.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [nodesData, productsData, relationsData] = await Promise.all([
        catalogAPI.getAll(),
        productsAPI.getAll(),
        productCatalogNodesAPI.getAll()
      ]);
      
      // Normalizar IDs y parentIds a números
      const normalizedNodes = nodesData.map((node: any) => ({
        ...node,
        id: typeof node.id === 'string' ? parseInt(node.id) : node.id,
        parentId: node.parentId === null ? null : (typeof node.parentId === 'string' ? parseInt(node.parentId) : node.parentId)
      }));
      
      setNodes(normalizedNodes);
      setProductCatalogNodes(relationsData);
      
      // Expandir todos los nodos por defecto
      setExpandedNodes(new Set(normalizedNodes.map((n: CatalogNode) => n.id)));
      
      // Contar productos por nodo usando la nueva tabla de relaciones
      const counts: Record<number, number> = {};
      relationsData.forEach((relation: ProductCatalogNode) => {
        const nodeId = Number(relation.catalog_node_id);
        counts[nodeId] = (counts[nodeId] || 0) + 1;
      });
      setProductCounts(counts);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showModal('error', 'Error', 'No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (nodes: CatalogNode[]): CatalogNodeWithChildren[] => {
    const nodeMap = new Map<number, CatalogNodeWithChildren>();
    const tree: CatalogNodeWithChildren[] = [];

    // Crear mapa de nodos
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [], productCount: productCounts[node.id] || 0 });
    });
    
    // Construir árbol
    nodeMap.forEach(node => {
      if (node.parentId === null) {
        tree.push(node);
      } else {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children!.push(node);
        }
      }
    });

    const sortNodes = (nodes: CatalogNodeWithChildren[]) => {
      nodes.sort((a, b) => a.order - b.order);
      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };
    sortNodes(tree);

    return tree;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que un nodo con hijos no puede ser final
    if (formData.isFinal && selectedNode) {
      const hasChildren = nodes.some(n => n.parentId === selectedNode.id);
      if (hasChildren) {
        showModal('warning', 'No permitido', 'No puedes marcar como nodo final un nodo que tiene hijos. Los nodos finales solo pueden contener productos.');
        return;
      }
    }

    try {
      const level = formData.parentId 
        ? nodes.find(n => n.id === formData.parentId)!.level + 1 
        : 0;

      const data = {
        ...formData,
        level,
        createdAt: selectedNode ? selectedNode.createdAt : new Date().toISOString(),
      };

      if (selectedNode && !isCreating) {
        await catalogAPI.update(selectedNode.id, data);
        showModal('success', '¡Actualizado!', 'El nodo se actualizó correctamente');
      } else {
        const newNode = await catalogAPI.create(data);
        showModal('success', '¡Creado!', 'El nodo se creó exitosamente');
        setSelectedNode(newNode);
        setIsCreating(false);
      }
      
      loadData();
    } catch (error) {
      console.error('Error guardando nodo:', error);
      showModal('error', 'Error', 'No se pudo guardar el nodo');
    }
  };

  const handleSelectNode = (node: CatalogNode) => {
    setSelectedNode(node);
    setIsCreating(false);
    setFormData({
      name: node.name,
      description: node.description || '',
      parentId: node.parentId,
      order: node.order,
      isActive: node.isActive,
      isFinal: node.isFinal || false,
    });
    
    // Cargar productos si es nodo final
    if (node.isFinal) {
      loadAssociatedProducts(node.id);
    } else {
      setAssociatedProducts([]);
    }
  };

  const handleNewNode = (parentId: number | null = null) => {
    // Validar que el padre no sea un nodo final
    if (parentId) {
      const parentNode = nodes.find(n => n.id === parentId);
      if (parentNode?.isFinal) {
        showModal('warning', 'No permitido', 'No puedes agregar nodos hijos a un nodo final. Los nodos finales solo pueden contener productos.');
        return;
      }
    }

    setIsCreating(true);
    setSelectedNode(null);
    setFormData({
      name: '',
      description: '',
      parentId: parentId,
      order: parentId ? nodes.filter(n => n.parentId === parentId).length : nodes.filter(n => n.parentId === null).length,
      isActive: true,
      isFinal: false,
    });
  };

  const handleDelete = async (node: CatalogNode) => {
    const hasChildren = nodes.some(n => n.parentId === node.id);
    if (hasChildren) {
      showModal('warning', 'No se puede eliminar', 'Este nodo tiene nodos hijos. Elimina primero los hijos.');
      return;
    }

    if (productCounts[node.id] > 0) {
      showModal('warning', 'No se puede eliminar', `Este nodo tiene ${productCounts[node.id]} producto(s) asociado(s). Reasígnalos antes de eliminar.`);
      return;
    }

    showModal('confirm', '¿Eliminar nodo?', `¿Estás seguro de eliminar "${node.name}"? Esta acción no se puede deshacer.`, async () => {
      try {
        await catalogAPI.delete(node.id);
        showModal('success', '¡Eliminado!', 'El nodo se eliminó correctamente');
        setSelectedNode(null);
        loadData();
      } catch (error) {
        console.error('Error eliminando nodo:', error);
        showModal('error', 'Error', 'No se pudo eliminar el nodo');
      }
    });
  };

  const handleCancel = () => {
    setSelectedNode(null);
    setIsCreating(false);
    setFormData({
      name: '',
      description: '',
      parentId: null,
      order: 0,
      isActive: true,
      isFinal: false,
    });
  };

  const renderTreeNode = (node: CatalogNodeWithChildren, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const indent = depth * 20;
    
    return (
      <div key={node.id}>
        <div 
          onClick={() => handleSelectNode(node)}
          className={`group flex items-center gap-2 py-2 px-2 cursor-pointer rounded transition-colors ${
            isSelected ? 'bg-blue-100 border-l-4 border-blue-600' : 'hover:bg-gray-100'
          } ${!node.isActive ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${8 + indent}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="w-4 h-4 flex items-center justify-center"
            >
              <span className="text-xs text-gray-500">
                {isExpanded ? '▼' : '▶'}
              </span>
            </button>
          ) : (
            <span className="w-4" />
          )}
          
          <span className="text-lg">
            {node.isFinal ? '📦' : (hasChildren && isExpanded ? '📂' : hasChildren ? '📁' : '📄')}
          </span>
          
          <span className={`flex-1 truncate ${isSelected ? 'font-semibold' : ''}`}>
            {node.name}
            {node.isFinal && <span className="ml-2 text-xs text-blue-600">(Final)</span>}
          </span>
          
          {node.productCount! > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
              {node.productCount}
            </span>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNewNode(node.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-xs text-green-600 hover:text-green-800 px-1"
            title="Agregar nodo hijo"
          >
            ➕
          </button>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando catálogo...</div>
      </div>
    );
  }

  const tree = buildTree(nodes);

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Catálogo</h1>
            <p className="text-sm text-gray-600">Estructura jerárquica de categorías</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{nodes.length}</div>
              <div className="text-xs text-gray-500">Total Nodos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.max(...nodes.map(n => n.level), 0) + 1}</div>
              <div className="text-xs text-gray-500">Niveles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{nodes.filter(n => n.isActive).length}</div>
              <div className="text-xs text-gray-500">Activos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 bg-white border-r flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">🌳 Árbol de Categorías</h2>
            <div className="flex gap-1">
              <button
                onClick={expandAll}
                className="p-1.5 text-xs hover:bg-gray-100 rounded"
                title="Expandir todo"
              >
                ➕
              </button>
              <button
                onClick={collapseAll}
                className="p-1.5 text-xs hover:bg-gray-100 rounded"
                title="Colapsar todo"
              >
                ➖
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {tree.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📁</div>
                <p className="text-sm">Sin nodos</p>
              </div>
            ) : (
              tree.map((node) => renderTreeNode(node, 0))
            )}
          </div>

          <div className="p-3 border-t">
            <button
              onClick={() => handleNewNode()}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              ➕ Nuevo Nodo Raíz
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {!selectedNode && !isCreating ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">📂</div>
                <p className="text-lg">Selecciona un nodo para editar</p>
                <p className="text-sm">o crea uno nuevo desde el árbol</p>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">
                    {isCreating ? '➕ Crear Nuevo Nodo' : `✏️ Editar: ${selectedNode?.name}`}
                  </h2>
                  {isCreating && formData.parentId && (
                    <p className="text-sm text-gray-600">
                      Padre: {nodes.find(n => n.id === formData.parentId)?.name}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      📝 Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="Nombre del nodo"
                    />
                  </div>

                  {isCreating && (
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        📂 Nodo Padre
                      </label>
                      <select
                        value={formData.parentId || ''}
                        onChange={(e) => setFormData({ ...formData, parentId: e.target.value ? Number(e.target.value) : null })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">🌳 Nodo Raíz</option>
                        {nodes.map(node => (
                          <option key={node.id} value={node.id}>
                            {'  '.repeat(node.level)}{node.name} (Nivel {node.level})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      📄 Descripción
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="Descripción opcional"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        🔢 Orden
                      </label>
                      <input
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        min="0"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-3 cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-sm font-medium">
                          {formData.isActive ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFinal}
                        onChange={(e) => setFormData({ ...formData, isFinal: e.target.checked })}
                        className="w-5 h-5 rounded"
                      />
                      <div>
                        <span className="text-sm font-semibold">
                          {formData.isFinal ? '📦 Nodo Final' : '📁 Nodo Contenedor'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.isFinal 
                            ? 'Este nodo puede contener productos' 
                            : 'Este nodo solo agrupa otros nodos'}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    {isCreating ? '➕ Crear Nodo' : '💾 Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                  >
                    Cancelar
                  </button>
                  {selectedNode && !isCreating && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedNode)}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                </div>
              </form>

              {/* Sección de productos asociados */}
              {selectedNode && !isCreating && selectedNode.isFinal && (
                <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">
                      📦 Productos Asociados
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({associatedProducts.length} productos)
                      </span>
                    </h3>
                    <button
                      onClick={async () => {
                        const allProducts = await productsAPI.getAll();
                        const allRelations = await productCatalogNodesAPI.getAll();
                        
                        // Obtener IDs de productos ya asociados a ESTE nodo específicamente
                        const associatedToThisNode = allRelations
                          .filter((r: ProductCatalogNode) => Number(r.catalog_node_id) === Number(selectedNode.id))
                          .map((r: ProductCatalogNode) => Number(r.product_id));
                        
                        // Filtrar productos regulares y padres (no variantes), excluyendo los ya asociados a este nodo
                        const available = allProducts.filter((p: any) => 
                          !associatedToThisNode.includes(Number(p.id)) && // No asociado a este nodo
                          (!p.parentId) // Excluir variantes (productos con parentId)
                        );
                        
                        setProducts(available);
                        setShowProductSelector(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      ➕ Asociar Productos
                    </button>
                  </div>
                  
                  {/* Lista de productos asociados */}
                  {associatedProducts.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
                      <div className="text-4xl mb-2">📦</div>
                      <p>No hay productos asociados a este nodo</p>
                      <p className="text-sm mt-1">Haz clic en "Asociar Productos" para agregar productos</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {associatedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:border-gray-400 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-800">{product.name || 'Sin nombre'}</p>
                              {product.isPrimary && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                                  ⭐ Nodo Principal
                                </span>
                              )}
                              {product.isParent && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                  Producto con variantes
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{product.description || 'Sin descripción'}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>SKU: <strong>{product.sku || 'N/A'}</strong></span>
                              <span>Precio: <strong className="text-green-600">${(product.price || 0).toFixed(2)}</strong></span>
                              <span>Stock: <strong className={(product.stock || 0) > 0 ? 'text-green-600' : 'text-red-600'}>{product.stock || 0}</strong></span>
                              <span>Estado: <strong className={product.isActive ? 'text-green-600' : 'text-gray-400'}>{product.isActive ? 'Activo' : 'Inactivo'}</strong></span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleTogglePrimary(product)}
                              className={`px-4 py-2 rounded text-sm font-medium ${
                                product.isPrimary 
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title={product.isPrimary ? 'Marcar como secundario' : 'Marcar como principal'}
                            >
                              ⭐ {product.isPrimary ? 'Principal' : 'Secundario'}
                            </button>
                            <button
                              onClick={() => handleDisassociateProduct(product)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                            >
                              🗑️ Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      />

      <ProductSelectorModal
        isOpen={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        onSave={handleAssociateMultipleProducts}
        availableProducts={products}
      />
    </div>
  );
}