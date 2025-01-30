export class UserResponse {
  publicId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  isEnabled: boolean;
  address?: AddressResponse;
}

export class AddressResponse {
  publicId: string;
  houseNumber: string | null;
  street: string;
  city: string;
  country: string;
}
