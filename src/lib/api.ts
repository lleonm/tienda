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
    method: 'PUT',
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
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/products/${id}`, {
    method: 'DELETE',
  }),
};

// Orders API
export const ordersAPI = {
  getAll: () => fetchAPI<any[]>('/orders'),
  getById: (id: number) => fetchAPI<any>(`/orders/${id}`),
  create: (data: any) => fetchAPI<any>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchAPI<any>(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
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
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/variantConfigs/${id}`, {
    method: 'DELETE',
  }),
};
