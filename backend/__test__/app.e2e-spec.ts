import { ClassSerializerInterceptor, HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '@prisma/client';
import * as request from 'supertest';
import { GlobalExceptionFilter } from 'src/infra/http/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/infra/http/interceptors/response.interceptor';
import { AppModule } from '../src/app.module';

describe('Task Manager (e2e)', () => {
  let app: INestApplication;
  let userAAccessToken: string;
  let userARefreshToken: string;
  let createdTaskId: string;
  let userAEmail: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(
      new ResponseInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    it('POST /api/v1/auth/register - should register a user and return tokens', async () => {
      userAEmail = `e2e_${Date.now()}@test.com`;

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'E2E User', email: userAEmail, password: 'Senha@123' })
        .expect(HttpStatus.CREATED);

      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('refresh_token');
      expect(res.body.data).toHaveProperty('user');
      userAAccessToken = res.body.data.access_token;
      userARefreshToken = res.body.data.refresh_token;
    });

    it('POST /api/v1/auth/register - should return 409 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Duplicate', email: userAEmail, password: 'Senha@123' })
        .expect(HttpStatus.CONFLICT);
    });

    it('POST /api/v1/auth/login - should login and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: userAEmail, password: 'Senha@123' })
        .expect(HttpStatus.OK);

      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('refresh_token');
    });

    it('POST /api/v1/auth/login - should return 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: userAEmail, password: 'wrongpassword' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /api/v1/auth/login - should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@test.com', password: 'Senha@123' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('GET /api/v1/auth/me - should return user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.data).toHaveProperty('email', userAEmail);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('GET /api/v1/auth/me - should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /api/v1/auth/refresh - should return new tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${userARefreshToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('refresh_token');

      userAAccessToken = res.body.data.access_token;
      userARefreshToken = res.body.data.refresh_token;
    });

    it('POST /api/v1/auth/logout - should invalidate tokens', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userARefreshToken}`)
        .send({ access_token: userAAccessToken })
        .expect(HttpStatus.OK);
    });

    it('POST /api/v1/auth/refresh - should return 401 after logout', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${userARefreshToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /api/v1/auth/login - re-login to restore valid access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: userAEmail, password: 'Senha@123' })
        .expect(HttpStatus.OK);

      userAAccessToken = res.body.data.access_token;
      userARefreshToken = res.body.data.refresh_token;
    });
  });

  describe('Tasks', () => {
    it('GET /api/v1/tasks - should require authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/tasks').expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /api/v1/tasks - should create a task', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .send({ title: 'E2E Task', description: 'Test task', status: TaskStatus.TODO })
        .expect(HttpStatus.CREATED);

      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('E2E Task');
      expect(res.body.data.status).toBe(TaskStatus.TODO);
      createdTaskId = res.body.data.id;
    });

    it('GET /api/v1/tasks - should list tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/tasks?status=TODO - should filter tasks by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks?status=TODO')
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('data');
      res.body.data.forEach((task: { status: string }) => {
        expect(task.status).toBe(TaskStatus.TODO);
      });
    });

    it('GET /api/v1/tasks?search=E2E - should return tasks matching the search term', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks?search=E2E')
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/tasks/:id - should get a single task', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .expect(HttpStatus.OK);

      expect(res.body.data.id).toBe(createdTaskId);
    });

    it('GET /api/v1/tasks/:id - should return 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('PATCH /api/v1/tasks/:id - should update a task', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .send({ status: TaskStatus.DONE })
        .expect(HttpStatus.OK);

      expect(res.body.data.status).toBe(TaskStatus.DONE);
    });

    it('PATCH /api/v1/tasks/:id - should return 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .send({ status: TaskStatus.DONE })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('DELETE /api/v1/tasks/:id - should delete a task', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .expect(HttpStatus.OK);
    });

    it('DELETE /api/v1/tasks/:id - should return 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('Tasks — isolamento entre usuários', () => {
    let userTwoAccessToken: string;

    beforeAll(async () => {
      const userBEmail = `e2e_b_${Date.now()}@test.com`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'User B', email: userBEmail, password: 'Senha@123' });
      userTwoAccessToken = res.body.data.access_token;
    });

    it('GET /api/v1/tasks - user B should not see user A tasks in their list', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${userAAccessToken}`)
        .send({ title: 'User A exclusive task', status: TaskStatus.TODO });

      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${userTwoAccessToken}`)
        .expect(HttpStatus.OK);

      const titles = res.body.data.map((t: { title: string }) => t.title);
      expect(titles).not.toContain('User A exclusive task');
    });
  });
});
