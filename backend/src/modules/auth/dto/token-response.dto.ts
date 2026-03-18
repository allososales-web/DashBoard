export class MeResponseDto {
  id: string;
  username: string;
  name: string;
  role: string;
  stores: { storeId: string; storeName: string; permissionLevel: string }[];
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  user: MeResponseDto;
}
