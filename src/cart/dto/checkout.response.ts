export class CheckoutResponse<T> {
  checkoutUrl: string | null;
  order: T;
}
