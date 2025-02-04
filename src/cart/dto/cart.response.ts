export class CartResponse {
  id: string;
  fee?: number | 0;
  subTotal: number;
  items: CartItemResponse[];
}

export class CartItemResponse {
  id: string;
  amount: number;
  productId: string;
  productName: string;
  quanity: number;
}
