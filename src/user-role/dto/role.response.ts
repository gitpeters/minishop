export class RoleResponse {
  publicId: string;
  name: string;
  description: string | null;
  totalUsersAssigned: number;
  assignUsers: RoleUser[];
}

export class RoleUser {
  publicId: string;
  email: string;
}
