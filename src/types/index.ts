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

// Tipo para dirección individual
export interface CustomerAddress {
  id: string; // ID único para cada dirección
  label?: string; // Etiqueta opcional (ej: "Casa", "Oficina", "Casa de mamá")
  provinciaCodigo: string; // Código de provincia (1-7)
  cantonCodigo: string; // Código de cantón (101, 102, etc.)
  distritoCodigo: string; // Código de distrito (10101, 10102, etc.)
  direccionExacta: string; // Dirección exacta (señas)
  codigoPostal?: string; // Código postal (asignado automáticamente por distrito)
  isDefault: boolean; // true si es la dirección predeterminada
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  identificationType: 'fisica' | 'juridica' | 'dimex' | 'pasaporte'; // Tipo de identificación
  identificationNumber: string; // Número de cédula/DIMEX/pasaporte
  phones: string[]; // Array de teléfonos (formato: 8888-8888)
  addresses: CustomerAddress[]; // Array de direcciones
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

// Tipos para Productos (nuevo sistema normalizado)
export interface Product {
  id: number;
  name: string;
  description?: string;
  catalogNodeId?: number;
  baseSku?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductAttribute {
  id: number;
  name: string;
  input_type?: string; // select, radio, text
  createdAt: string;
}

export interface ProductAttributeValue {
  id: number;
  attribute_id: number;
  value: string;
  createdAt: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  price: number;
  stock: number;
  active: boolean;
  createdAt: string;
}

export interface VariantAttributeValue {
  variant_id: number;
  attribute_value_id: number;
}

// Relación many-to-many: Producto <-> Nodo de Catálogo
export interface ProductCatalogNode {
  id: number;
  product_id: number;
  catalog_node_id: number;
  isPrimary: boolean; // true para el nodo principal/preferido
  createdAt: string;
}

// Tipos extendidos para trabajar con joins
export interface ProductVariantWithDetails extends ProductVariant {
  attributes?: Array<{
    attribute_id: number;
    attribute_name: string;
    value_id: number;
    value: string;
  }>;
  product?: Product;
}

export interface ProductWithVariants extends Product {
  variants?: ProductVariantWithDetails[];
  catalogNode?: CatalogNode;
}

// Configuración de Variantes (legacy - mantener por compatibilidad)
export interface VariantConfig {
  id: number;
  type: string;
  label: string;
  hasGlobalValues: boolean;
  values?: string[];
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
  shippingAddress?: CustomerAddress | null; // Dirección de entrega
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
