import { Injectable } from '@nestjs/common';
import { Address, User } from '@prisma/client';
import { AddressResponse, UserResponse } from './dto';

@Injectable()
export class UserHelper {
  mapToUserResponse(
    user: User,
    roles: string[],
    address?: AddressResponse,
  ): UserResponse {
    const userResponse = new UserResponse();
    userResponse.publicId = user.publicId;
    userResponse.email = user.email;
    userResponse.firstName = user.firstName;
    userResponse.lastName = user.lastName;
    userResponse.isEnabled = user.isEnabled;
    userResponse.roles = roles;
    userResponse.address = address;
    return userResponse;
  }

  mapToAddressResponse(address: Address) {
    const response = new AddressResponse();
    response.publicId = address.publicId;
    response.houseNumber = address.houseNumber;
    response.street = address.street;
    response.city = address.city;
    response.country = address.country;
    return response;
  }
}
