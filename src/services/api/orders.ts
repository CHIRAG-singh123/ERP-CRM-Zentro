import { fetchJson } from './http';

export interface OrderItem {
  productId: {
    _id: string;
    name: string;
    price: number;
    sku?: string;
  };
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerId: {
    _id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
  totalAmount: number;
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled';
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  paymentMethod: string;
  invoiceId?: {
    _id: string;
    invoiceNumber: string;
    total: number;
    status: string;
  };
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  tenantId?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  productId: string;
  quantity: number;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  paymentMethod?: string;
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getOrders = async (params?: {
  page?: number;
  limit?: number;
  status?: Order['status'];
  paymentStatus?: Order['paymentStatus'];
}): Promise<OrdersResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus);

  const queryString = queryParams.toString();
  return fetchJson<OrdersResponse>(`/orders${queryString ? `?${queryString}` : ''}`);
};

export const getOrder = async (id: string): Promise<{ order: Order }> => {
  return fetchJson<{ order: Order }>(`/orders/${id}`);
};

export const createOrder = async (data: CreateOrderData): Promise<{ order: Order; invoice: any }> => {
  return fetchJson<{ order: Order; invoice: any }>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateOrderStatus = async (
  id: string,
  status: Order['status']
): Promise<{ order: Order }> => {
  return fetchJson<{ order: Order }>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const cancelOrder = async (id: string): Promise<{ message: string; order: Order }> => {
  return fetchJson<{ message: string; order: Order }>(`/orders/${id}`, {
    method: 'DELETE',
  });
};

