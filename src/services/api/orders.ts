import { fetchJson } from './http';

export interface PlaceOrderResponse {
  success: boolean;
  message?: string;
}

/**
 * Place an order for a product (demo flow). Server sends receipt email to current user.
 */
export const placeOrder = async (
  productId: string,
  quantity: number = 1
): Promise<PlaceOrderResponse> => {
  return fetchJson<PlaceOrderResponse>('/orders/receipt', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
};
