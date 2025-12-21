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

// Tipos para Productos
export interface Product {
  id: number;
  name: string;
  description: string;
  category: 'ropa' | 'accesorios';
  price: number;
  stock: number;
  sku: string;
  imageUrl?: string;
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
