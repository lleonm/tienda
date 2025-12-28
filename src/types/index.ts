// Tipos para Users (Administradores y Clientes)
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  password: string;
  createdAt: string;
}

// Tipos para Geografía de Costa Rica
export interface Provincia {
  id: number;
  codigo: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface Canton {
  id: number;
  codigo: string;
  nombre: string;
  provinciaId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Distrito {
  id: number;
  codigo: string;
  nombre: string;
  cantonId: number;
  codigoPostal: string;
  createdAt: string;
  updatedAt: string;
}

export interface CostaRicaGeografia {
  provincias: Provincia[];
  cantones: Canton[];
  distritos: Distrito[];
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  identificationType: 'fisica' | 'juridica' | 'dimex' | 'pasaporte'; // Tipo de identificación
  identificationNumber: string; // Número de cédula/DIMEX/pasaporte
  phones: string[]; // Array de teléfonos (formato: 8888-8888)
  address: {
    provinciaCodigo: string; // Código de provincia (1-7)
    cantonCodigo: string; // Código de cantón (101, 102, etc.)
    distritoCodigo: string; // Código de distrito (10101, 10102, etc.)
    direccionExacta: string; // Dirección exacta (señas)
    codigoPostal?: string; // Código postal (asignado automáticamente por distrito)
  };
  createdBy: 'frontend' | 'admin'; // Origen de creación
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
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
  category?: string; // Categoría del producto (legacy field)
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
  productName: string;
  productSku: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string; // Usaremos string para poder tener números de orden personalizados
  orderNumber: string; // Número de orden consecutivo (ej: "ORD-0001")
  customerId: string;
  customerName?: string; // Para mostrar sin hacer join
  products: OrderProduct[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  notes?: string;
  createdBy: string; // Usuario que creó la orden
  createdAt: string;
  updatedAt: string;
  updatedBy?: string; // Usuario que modificó por última vez
}

export interface OrderWithDetails extends Order {
  customer?: Customer;
  productDetails?: Product[];
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
