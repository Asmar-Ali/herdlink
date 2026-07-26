export type Principal = 'user' | 'service';

export interface JwtPayload {
  sub: string;
  type: Principal;
  roles?: string[];
  iss?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  type: Principal;
  roles: string[];
}
