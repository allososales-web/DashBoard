export interface Store {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  region?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
