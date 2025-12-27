// Tipos para Users (Administradores y Clientes)
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  password: string;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

// Tipos para Catálogo Jerárquico
export interface CatalogNode {
  id: number;
  name: string;
  description?: string;
  parentId: number | null; // null si es raíz
  level: number; // 0 para raíz, 1 para primer nivel, etc.
  order: number; // Para ordenar nodos al mismo nivel
  isActive: boolean;
  isFinal: boolean; // true si puede contener productos
  createdAt: string;
}

export interface CatalogNodeWithChildren extends CatalogNode {
  children?: CatalogNodeWithChildren[];
  productCount?: number; // Cantidad de productos en este nodo
}

// Tipos para Productos
export interface Product {
  id: number;
  name: string;
  description: string;
  catalogNodeId: number; // Referencia al nodo del catálogo
  price: number;
  stock: number;
  sku: string;
  imageUrl?: string;
  createdAt: string;
  // Campos para manejo de variantes
  isParent?: boolean; // true si es un producto padre que agrupa variantes
  parentId?: number | null; // ID del producto padre (si es una variante)
  variantType?: 'size' | 'color' | 'design' | null; // Tipo de variación
  variantValue?: string; // Valor de la variación (ej: "M", "Rojo", "Diseño 1")
  // Campo para activar/desactivar
  isActive?: boolean; // true si está activo y disponible para venta
}

export interface ProductWithVariants extends Product {
  variants?: Product[]; // Variantes del producto (solo si isParent = true)
  catalogNode?: CatalogNode; // Información del nodo del catálogo
}

// Configuración de Variantes
export interface VariantConfig {
  id: number;
  type: string; // 'size', 'color', 'design', etc.
  label: string; // 'Talla', 'Color', 'Diseño'
  hasGlobalValues: boolean; // true si tiene valores predefinidos globales
  values?: string[]; // Valores predefinidos (solo si hasGlobalValues = true)
  createdAt: string;
}

// Tipos para Órdenes
export interface OrderProduct {
  productId: number;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  customerId: number;
  products: OrderProduct[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

// Tipos para Facturas
export interface Invoice {
  id: number;
  orderId: number;
  customerId: number;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
}
