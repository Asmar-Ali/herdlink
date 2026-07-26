import { TokenService } from '@herdlink/auth';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';

/**
 * The signed-in operator returned to the client alongside a JWT. Mirrors the
 * dashboard-ui `AuthUser` shape so the SPA can persist it verbatim.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthenticatedSession {
  token: string;
  user: SessionUser;
}

/**
 * Demo-only hardcoded credentials. HerdLink has no signup flow yet — every
 * operator signs in with this shared account until a dedicated identity
 * service (or realtime-gateway's JWT endpoint) lands. See
 * docs/adr/0002-auth-login-in-device-service.md. The dashboard pre-fills the
 * login form with these same values.
 */
const DEMO_USER = {
  id: 'user-rancher',
  email: 'rancher@herdlink.io',
  password: 'herdlink-demo',
  name: 'Rancher',
  role: 'Ranch operator',
  roles: ['rancher'],
} as const;

@Injectable()
export class AuthService {
  constructor(private readonly tokenService: TokenService) {}

  async login({ email, password }: LoginDto): Promise<AuthenticatedSession> {
    const emailMatches = email.trim().toLowerCase() === DEMO_USER.email;
    if (!emailMatches || password !== DEMO_USER.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.tokenService.signUser(DEMO_USER.id, [
      ...DEMO_USER.roles,
    ]);

    return {
      token,
      user: {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        role: DEMO_USER.role,
      },
    };
  }
}
