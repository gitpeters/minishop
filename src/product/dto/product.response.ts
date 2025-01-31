export class ProductResponse {
  publicId: string;
  name: string;
  description: string | null;
  price: number;
  availableQuantity: number;
  categoryName: string | null;
  images: string[];
}
