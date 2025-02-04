export class StripeCheckout {
  success_url: string;
  cancel_url: string;
  customer_email: string;
  client_reference_id: string;
  line_items: LineItem[];
}

export class LineItem {
  quantity: number;
  price_data: PriceData;
}

export class PriceData {
  currency: string;
  unit_amount: number;
  product_data: ProductData;
}

export class ProductData {
  name: string;
}
