import { ClassSerializerInterceptor, Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { GlobalExceptionFilter } from 'src/infra/http/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/infra/http/interceptors/response.interceptor';
import { RedisService } from 'src/infra/cache/redis.service';
import { MqttService } from 'src/infra/mqtt/mqtt.service';
import { PrismaService } from 'src/infra/database/prisma/prisma.service';
import { AuthModule } from 'src/modules/auth/auth.module';
import { TasksModule } from 'src/modules/tasks/tasks.module';

const MOCK_USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const MOCK_TASK_ID = '11111111-2222-3333-4444-555555555555';

const mockUser = {
  id: MOCK_USER_ID,
  name: 'Test User',
  email: 'tasks@test.com',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

const mockTask = {
  id: MOCK_TASK_ID,
  title: 'Tarefa de Integração',
  description: 'Descrição da tarefa',
  status: 'TODO',
  userId: MOCK_USER_ID,
  dueDate: null,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
};

const prismaStub = {
  user: { findUnique: jest.fn() },
  task: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const redisStub = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
  userProfileKey: (id: string) => `user:${id}`,
  taskListKey: (userId: string, q?: string) => `tasks:${userId}:${q ?? 'all'}`,
};

const mqttStub = {
  publishTaskCreated: jest.fn(),
  publishTaskUpdated: jest.fn(),
  publishTaskDeleted: jest.fn(),
};

@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: prismaStub },
    { provide: RedisService, useValue: redisStub },
    { provide: MqttService, useValue: mqttStub },
  ],
  exports: [PrismaService, RedisService, MqttService],
})
class InfraStubModule {}

async function buildApp(): Promise<{ app: INestApplication; module: TestingModule }> {
  // InfraStubModule → PrismaService global (para UsersModule via AuthModule)
  // overrideProvider(PrismaService) → sobrescreve o PrismaService local do TasksModule
  const module = await Test.createTestingModule({
    imports: [InfraStubModule, AuthModule, TasksModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaStub)
    .compile();

  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
  await app.init();
  return { app, module };
}

describe('Tasks — camada HTTP (integração)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const built = await buildApp();
    app = built.app;

    // Gera token JWT diretamente — sem chamar o endpoint de login
    const jwtService = built.module.get(JwtService);
    accessToken = jwtService.sign(
      { sub: MOCK_USER_ID, email: 'tasks@test.com', jti: 'test-access-jti' },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
  });

  afterAll(async () => await app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    redisStub.get.mockResolvedValue(undefined);
    redisStub.set.mockResolvedValue(undefined);
    redisStub.del.mockResolvedValue(undefined);
    redisStub.delByPattern.mockResolvedValue(undefined);
    prismaStub.refreshToken.create.mockResolvedValue({});
    prismaStub.refreshToken.deleteMany.mockResolvedValue({});
    // JwtStrategy chama UsersService.findById → prisma.user.findUnique
    prismaStub.user.findUnique.mockResolvedValue(mockUser);
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /api/v1/tasks', () => {
    it('retorna 401 sem autenticação', async () => {
      await request(app.getHttpServer()).get('/api/v1/tasks').expect(401);
    });

    it('retorna lista paginada de tarefas (200)', async () => {
      prismaStub.$transaction.mockResolvedValue([[mockTask], 1]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({ total: 1, page: 1 });
      expect(res.body.data[0].id).toBe(MOCK_TASK_ID);
    });

    it('retorna resultado do cache quando disponível (200)', async () => {
      const cached = { data: [mockTask], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
      // Retorna cached apenas para chaves de task; chaves de blacklist devem retornar undefined
      redisStub.get.mockImplementation((key: string) =>
        key.startsWith('tasks:') ? Promise.resolve(cached) : Promise.resolve(undefined),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data[0].id).toBe(MOCK_TASK_ID);
      // Com cache hit, prisma.$transaction não deve ser chamado
      expect(prismaStub.$transaction).not.toHaveBeenCalled();
    });

    it('filtra tarefas por status (200)', async () => {
      prismaStub.$transaction.mockResolvedValue([[mockTask], 1]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks?status=TODO')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.every((t: { status: string }) => t.status === 'TODO')).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /api/v1/tasks', () => {
    it('cria tarefa e publica notificação MQTT (201)', async () => {
      prismaStub.task.create.mockResolvedValue(mockTask);

      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Tarefa de Integração', description: 'Descrição da tarefa', status: 'TODO' })
        .expect(201);

      expect(res.body.data.id).toBe(MOCK_TASK_ID);
      expect(res.body.data.title).toBe('Tarefa de Integração');
      expect(prismaStub.task.create).toHaveBeenCalled();
      expect(redisStub.delByPattern).toHaveBeenCalledWith('tasks:all');
      expect(mqttStub.publishTaskCreated).toHaveBeenCalledWith(
        MOCK_USER_ID,
        expect.objectContaining({ id: MOCK_TASK_ID }),
      );
    });

    it('retorna 400 quando título está ausente', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'sem título' })
        .expect(400);
    });

    it('retorna 401 sem autenticação', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .send({ title: 'Qualquer' })
        .expect(401);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe('GET /api/v1/tasks/:id', () => {
    it('retorna tarefa específica (200)', async () => {
      prismaStub.task.findUnique.mockResolvedValue(mockTask);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${MOCK_TASK_ID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(MOCK_TASK_ID);
      expect(res.body.data.title).toBe('Tarefa de Integração');
    });

    it('retorna 404 para tarefa inexistente', async () => {
      prismaStub.task.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe('PATCH /api/v1/tasks/:id', () => {
    it('atualiza tarefa e publica notificação MQTT (200)', async () => {
      const updated = { ...mockTask, status: 'DONE' };
      prismaStub.task.findUnique.mockResolvedValue(mockTask);
      prismaStub.task.update.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${MOCK_TASK_ID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'DONE' })
        .expect(200);

      expect(res.body.data.status).toBe('DONE');
      expect(redisStub.delByPattern).toHaveBeenCalledWith('tasks:all');
      expect(mqttStub.publishTaskUpdated).toHaveBeenCalledWith(
        MOCK_USER_ID,
        expect.objectContaining({ id: MOCK_TASK_ID }),
      );
    });

    it('retorna 404 para tarefa inexistente', async () => {
      prismaStub.task.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'DONE' })
        .expect(404);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe('DELETE /api/v1/tasks/:id', () => {
    it('exclui tarefa e publica notificação MQTT (200)', async () => {
      prismaStub.task.findUnique.mockResolvedValue(mockTask);
      prismaStub.task.delete.mockResolvedValue(mockTask);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${MOCK_TASK_ID}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('statusCode', 200);
      expect(prismaStub.task.delete).toHaveBeenCalledWith({ where: { id: MOCK_TASK_ID } });
      expect(redisStub.delByPattern).toHaveBeenCalledWith('tasks:all');
      expect(mqttStub.publishTaskDeleted).toHaveBeenCalledWith(
        MOCK_USER_ID,
        expect.objectContaining({ id: MOCK_TASK_ID }),
      );
    });

    it('retorna 404 para tarefa inexistente', async () => {
      prismaStub.task.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
