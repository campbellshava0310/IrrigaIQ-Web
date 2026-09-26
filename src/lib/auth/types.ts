export type Role = 'ADMIN' | 'FARM_MANAGER';

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  enabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: CurrentUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Registration extends LoginCredentials {
  fullName: string;
}
