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
  getById: (id: string) => fetchAPI<any>(`/customers/${id}`),
  create: (data: any) => fetchAPI<any>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => fetchAPI<any>(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => fetchAPI<void>(`/customers/${id}`, {
    method: 'DELETE',
  }),
};

// Product Attributes API
export const productAttributesAPI = {
  getAll: () => fetchAPI<any[]>('/productAttributes'),
  getById: (id: number) => fetchAPI<any>(`/productAttributes/${id}`),
  create: (data: any) => fetchAPI<any>('/productAttributes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchAPI<any>(`/productAttributes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/productAttributes/${id}`, {
    method: 'DELETE',
  }),
};

// Product Attribute Values API
export const productAttributeValuesAPI = {
  getAll: () => fetchAPI<any[]>('/productAttributeValues'),
  getById: (id: number) => fetchAPI<any>(`/productAttributeValues/${id}`),
  getByAttributeId: (attributeId: number) => 
    fetchAPI<any[]>(`/productAttributeValues?attribute_id=${attributeId}`),
  create: (data: any) => fetchAPI<any>('/productAttributeValues', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchAPI<any>(`/productAttributeValues/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/productAttributeValues/${id}`, {
    method: 'DELETE',
  }),
};

// Product Variants API
export const productVariantsAPI = {
  getAll: () => fetchAPI<any[]>('/productVariants'),
  getById: (id: number) => fetchAPI<any>(`/productVariants/${id}`),
  getByProductId: (productId: number) => 
    fetchAPI<any[]>(`/productVariants?product_id=${productId}`),
  create: (data: any) => fetchAPI<any>('/productVariants', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchAPI<any>(`/productVariants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/productVariants/${id}`, {
    method: 'DELETE',
  }),
};

// Variant Attribute Values API (relación many-to-many)
export const variantAttributeValuesAPI = {
  getAll: () => fetchAPI<any[]>('/variantAttributeValues'),
  getByVariantId: (variantId: number) => 
    fetchAPI<any[]>(`/variantAttributeValues?variant_id=${variantId}`),
  create: (data: any) => fetchAPI<any>('/variantAttributeValues', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  delete: (variantId: number, attributeValueId: number) => 
    fetchAPI<void>(`/variantAttributeValues?variant_id=${variantId}&attribute_value_id=${attributeValueId}`, {
      method: 'DELETE',
    }),
};

// Product Catalog Nodes API (relación many-to-many: productos <-> nodos de catálogo)
export const productCatalogNodesAPI = {
  getAll: () => fetchAPI<any[]>('/productCatalogNodes'),
  getById: (id: number) => fetchAPI<any>(`/productCatalogNodes/${id}`),
  getByProductId: (productId: number) => 
    fetchAPI<any[]>(`/productCatalogNodes?product_id=${productId}`),
  getByCatalogNodeId: (catalogNodeId: number) => 
    fetchAPI<any[]>(`/productCatalogNodes?catalog_node_id=${catalogNodeId}`),
  create: (data: any) => fetchAPI<any>('/productCatalogNodes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => fetchAPI<any>(`/productCatalogNodes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => fetchAPI<void>(`/productCatalogNodes/${id}`, {
    method: 'DELETE',
  }),
};
