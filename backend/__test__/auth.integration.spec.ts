import { ClassSerializerInterceptor, Global, HttpStatus, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import * as request from 'supertest';
import { GlobalExceptionFilter } from 'src/infra/http/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/infra/http/interceptors/response.interceptor';
import { RedisService } from 'src/infra/cache/redis.service';
import { PrismaService } from 'src/infra/database/prisma/prisma.service';
import { AuthModule } from 'src/modules/auth/auth.module';
import { envConfig } from 'src/config/configuration';

const MOCK_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const MOCK_EMAIL = 'integration@test.com';
const MOCK_NAME = 'Integration User';
const TEST_PASS = 'Senha@123';

const safeUser = {
  id: MOCK_ID,
  name: MOCK_NAME,
  email: MOCK_EMAIL,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

const prismaStub = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const redisStub = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  userProfileKey: (id: string) => `user:${id}`,
  taskListKey: (userId: string, q?: string) => `tasks:${userId}:${q ?? 'all'}`,
};

// Módulo global de stubs de infra. Evita que os módulos reais (PrismaModule, CacheModule)
// tentem abrir conexões de banco/Redis durante os testes.
@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: prismaStub },
    { provide: RedisService, useValue: redisStub },
  ],
  exports: [PrismaService, RedisService],
})
class InfraStubModule {}

async function buildApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    imports: [InfraStubModule, AuthModule],
  }).compile();

  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
  await app.init();
  return app;
}

let PASSWORD_SALT: number;
describe('Auth — camada HTTP (integração)', () => {
  let app: INestApplication;
  let hashedPass: string;
  
  beforeAll(async () => {
    PASSWORD_SALT = envConfig().PASSWORD_SALT;
    hashedPass = await bcrypt.hash(TEST_PASS, PASSWORD_SALT);
    app = await buildApp();
  });

  afterAll(async () => await app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    prismaStub.refreshToken.create.mockResolvedValue({});
    prismaStub.refreshToken.delete.mockResolvedValue({});
    prismaStub.refreshToken.deleteMany.mockResolvedValue({});
    redisStub.get.mockResolvedValue(undefined);
    redisStub.set.mockResolvedValue(undefined);
    redisStub.del.mockResolvedValue(undefined);
    redisStub.delByPattern.mockResolvedValue(undefined);
  });

  async function doLogin() {
    prismaStub.user.findUnique
      .mockResolvedValueOnce({ ...safeUser, password: hashedPass }) // findByEmail em AuthService.login
      .mockResolvedValue(safeUser); // findById (JwtStrategy + getProfile)
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: MOCK_EMAIL, password: TEST_PASS });
  }

  describe('POST /api/v1/auth/register', () => {
    it('cria usuário e retorna tokens (201)', async () => {
      // findByEmail chamado 2x (AuthService + UsersService.create) = null
      prismaStub.user.findUnique.mockResolvedValue(null);
      prismaStub.user.create.mockResolvedValue(safeUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: MOCK_NAME, email: MOCK_EMAIL, password: TEST_PASS })
        .expect(HttpStatus.CREATED);

      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('refresh_token');
      expect(res.body.data.user.email).toBe(MOCK_EMAIL);
      expect(res.body.data.user).not.toHaveProperty('password');
      expect(prismaStub.refreshToken.create).toHaveBeenCalled();
    });

    it('retorna 409 quando e-mail já existe', async () => {
      prismaStub.user.findUnique.mockResolvedValue({ ...safeUser, password: hashedPass });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Outro', email: MOCK_EMAIL, password: TEST_PASS })
        .expect(HttpStatus.CONFLICT);
    });

    it('retorna 400 para senha que não atende aos critérios', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'test@test.com', password: 'senhafraca' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('retorna 400 quando campos obrigatórios estão ausentes', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: MOCK_EMAIL })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('autentica e retorna tokens (200)', async () => {
      prismaStub.user.findUnique.mockResolvedValue({ ...safeUser, password: hashedPass });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: MOCK_EMAIL, password: TEST_PASS })
        .expect(HttpStatus.OK);

      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('refresh_token');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('retorna 401 para senha incorreta', async () => {
      prismaStub.user.findUnique.mockResolvedValue({ ...safeUser, password: hashedPass });

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: MOCK_EMAIL, password: 'SenhaErrada@9' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('retorna 401 para e-mail não cadastrado', async () => {
      prismaStub.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@test.com', password: TEST_PASS })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('retorna o perfil sem a senha (200)', async () => {
      const loginRes = await doLogin();
      const token = loginRes.body.data.access_token;

      // JwtStrategy.validate chama findById -> redis miss -> prisma
      // AuthService.getProfile chama findById -> redis miss -> prisma novamente
      prismaStub.user.findUnique.mockResolvedValue(safeUser);

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(res.body.data.email).toBe(MOCK_EMAIL);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('retorna 401 sem token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(HttpStatus.UNAUTHORIZED);
    });

    it('retorna 401 com token malformado', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer token.invalido.aqui')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('deleta o refresh token e coloca o access token na blacklist (200)', async () => {
      const loginRes = await doLogin();
      const { refresh_token, access_token } = loginRes.body.data;

      prismaStub.user.findUnique.mockResolvedValue(safeUser);

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${refresh_token}`)
        .send({ access_token })
        .expect(HttpStatus.OK);

      expect(prismaStub.refreshToken.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: MOCK_ID }) }),
      );
      expect(redisStub.set).toHaveBeenCalledWith(
        expect.stringContaining('blacklist:access:'),
        '1',
        expect.any(Number),
      );
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('emite novos tokens com refresh token válido (200)', async () => {
      const loginRes = await doLogin();
      const { refresh_token } = loginRes.body.data;

      // Captura o hash do refresh token salvo durante o login
      const createCall = prismaStub.refreshToken.create.mock.calls[0][0];
      const storedJti = createCall.data.id;
      const storedHash = createCall.data.token;

      // Reinicia mocks para a chamada de refresh
      jest.clearAllMocks();
      prismaStub.refreshToken.create.mockResolvedValue({});
      prismaStub.refreshToken.delete.mockResolvedValue({});
      redisStub.get.mockResolvedValue(undefined);
      redisStub.set.mockResolvedValue(undefined);

      prismaStub.refreshToken.findUnique.mockResolvedValue({
        id: storedJti,
        userId: MOCK_ID,
        token: storedHash,
        expiresAt: new Date(Date.now() + 86_400_000),
      });
      prismaStub.user.findUnique.mockResolvedValue(safeUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${refresh_token}`)
        .expect(HttpStatus.OK);

      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('refresh_token');
    });

    it('retorna 401 com refresh token inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer token.invalido.aqui')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
