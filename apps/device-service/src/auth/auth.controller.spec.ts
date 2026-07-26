import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
          } satisfies Partial<AuthService>,
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards credentials to the service and returns the session', async () => {
    const dto: LoginDto = { email: 'rancher@herdlink.io', password: 'herdlink-demo' };
    const session = {
      token: 'signed.jwt.token',
      user: {
        id: 'user-rancher',
        email: dto.email,
        name: 'Rancher',
        role: 'Ranch operator',
      },
    };
    service.login.mockResolvedValue(session);

    const result = await controller.login(dto);

    expect(service.login).toHaveBeenCalledWith(dto);
    expect(result).toBe(session);
  });

  it('propagates UnauthorizedException from the service', async () => {
    service.login.mockRejectedValue(new UnauthorizedException());

    await expect(
      controller.login({ email: 'bad@herdlink.io', password: 'nope-nope' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
