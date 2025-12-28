const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

// Users API
export const usersAPI = {
  getAll: () => fetchAPI<any[]>('/users'),
  getById: (id: number) => fetchAPI<any>(`/users/${id}`),
  create: (data: any) => fetchAPI<any>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchAPI<any>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/users/${id}`, {
    method: 'DELETE',
  }),
};

// Products API
export const productsAPI = {
  getAll: () => fetchAPI<any[]>('/products'),
  getById: (id: number) => fetchAPI<any>(`/products/${id}`),
  create: (data: any) => fetchAPI<any>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchAPI<any>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/products/${id}`, {
    method: 'DELETE',
  }),
};

// Orders API
export const ordersAPI = {
  getAll: () => fetchAPI<any[]>('/orders'),
  getById: (id: string) => fetchAPI<any>(`/orders/${id}`),
  create: (data: any) => fetchAPI<any>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI<any>(`/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  getNextOrderNumber: async () => {
    const orders = await fetchAPI<any[]>('/orders');
    if (orders.length === 0) return 'ORD-0001';
    const lastOrder = orders[orders.length - 1];
    const lastNumber = parseInt(lastOrder.orderNumber.split('-')[1]);
    return `ORD-${String(lastNumber + 1).padStart(4, '0')}`;
  },
};

// Invoices API
export const invoicesAPI = {
  getAll: () => fetchAPI<any[]>('/invoices'),
  getById: (id: number) => fetchAPI<any>(`/invoices/${id}`),
  create: (data: any) => fetchAPI<any>('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// Variant Configs API
export const variantConfigsAPI = {
  getAll: () => fetchAPI<any[]>('/variantConfigs'),
  getById: (id: number) => fetchAPI<any>(`/variantConfigs/${id}`),
  create: (data: any) => fetchAPI<any>('/variantConfigs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchAPI<any>(`/variantConfigs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/variantConfigs/${id}`, {
    method: 'DELETE',
  }),
};

// Catalog Nodes API
export const catalogAPI = {
  getAll: () => fetchAPI<any[]>('/catalogNodes'),
  getById: (id: number) => fetchAPI<any>(`/catalogNodes/${id}`),
  create: (data: any) => fetchAPI<any>('/catalogNodes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchAPI<any>(`/catalogNodes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/catalogNodes/${id}`, {
    method: 'DELETE',
  }),
};

// Customers API
export const customersAPI = {
  getAll: () => fetchAPI<any[]>('/customers'),
  getById: (id: number) => fetchAPI<any>(`/customers/${id}`),
  create: (data: any) => fetchAPI<any>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchAPI<any>(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/customers/${id}`, {
    method: 'DELETE',
  }),
};
