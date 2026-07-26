import { TokenService } from '@herdlink/auth';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

const VALID_EMAIL = 'rancher@herdlink.io';
const VALID_PASSWORD = 'herdlink-demo';

describe('AuthService', () => {
  let service: AuthService;
  let tokenService: jest.Mocked<TokenService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: TokenService,
          useValue: {
            signUser: jest.fn(),
            signService: jest.fn(),
          } satisfies Partial<TokenService>,
        },
      ],
    }).compile();

    service = module.get(AuthService);
    tokenService = module.get(TokenService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('returns a signed token and the operator on valid credentials', async () => {
      tokenService.signUser.mockResolvedValue('signed.jwt.token');

      const result = await service.login({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
      });

      expect(tokenService.signUser).toHaveBeenCalledWith('user-rancher', [
        'rancher',
      ]);
      expect(result).toEqual({
        token: 'signed.jwt.token',
        user: {
          id: 'user-rancher',
          email: VALID_EMAIL,
          name: 'Rancher',
          role: 'Ranch operator',
        },
      });
    });

    it('accepts the email case-insensitively and trims whitespace', async () => {
      tokenService.signUser.mockResolvedValue('signed.jwt.token');

      await expect(
        service.login({ email: '  RANCHER@herdlink.io ', password: VALID_PASSWORD }),
      ).resolves.toMatchObject({ token: 'signed.jwt.token' });
    });

    it('rejects a wrong password without issuing a token', async () => {
      await expect(
        service.login({ email: VALID_EMAIL, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tokenService.signUser).not.toHaveBeenCalled();
    });

    it('rejects an unknown email without issuing a token', async () => {
      await expect(
        service.login({ email: 'intruder@herdlink.io', password: VALID_PASSWORD }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tokenService.signUser).not.toHaveBeenCalled();
    });
  });
});
