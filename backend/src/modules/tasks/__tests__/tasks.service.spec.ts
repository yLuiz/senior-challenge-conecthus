import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../infra/database/prisma/prisma.service';
import { RedisService } from '../../../infra/cache/redis.service';
import { MqttService } from '../../../infra/mqtt/mqtt.service';
import { PaginatedResultDto } from '../../../common/dtos/paginated-result.dto';
import { TasksService } from '../tasks.service';

const mockPrisma = {
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delByPattern: jest.fn().mockResolvedValue(undefined),
  userProfileKey: jest.fn((id: string) => `user:profile:${id}`),
};

const mockMqtt = {
  publishTaskCreated: jest.fn(),
  publishTaskUpdated: jest.fn(),
  publishTaskDeleted: jest.fn(),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockCache },
        { provide: MqttService, useValue: mockMqtt },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.delByPattern.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('should create and return a task', async () => {
      const dto = { title: 'Test', status: TaskStatus.TODO };
      const userId = 'user1';
      const task = { id: '1', ...dto, userId, description: null, dueDate: null, createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.task.create.mockResolvedValue(task);

      const result = await service.create(dto, userId);

      expect(result).toEqual(task);
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Test',
          description: undefined,
          status: TaskStatus.TODO,
          dueDate: undefined,
          userId: 'user1',
        },
      });
      expect(mockMqtt.publishTaskCreated).toHaveBeenCalledWith(userId, { id: task.id, title: task.title });
    });

    it('should invalidate the tasks cache after creation', async () => {
      const task = { id: '1', title: 'Test', status: TaskStatus.TODO, userId: 'user1', description: null, dueDate: null, createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.task.create.mockResolvedValue(task);

      await service.create({ title: 'Test', status: TaskStatus.TODO }, 'user1');

      expect(mockCache.delByPattern).toHaveBeenCalledWith('tasks:all');
    });
  });

  describe('findAll', () => {
    it('should return a paginated result without filters', async () => {
      const tasks = [{ id: '1', title: 'Task' }];
      mockPrisma.$transaction.mockResolvedValue([tasks, 1]);

      const result = await service.findAll({ page: 1, limit: 10 }, 'user1');

      expect(result).toBeInstanceOf(PaginatedResultDto);
      expect(result.data).toEqual(tasks);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should store the result in cache after a cache miss', async () => {
      const tasks = [{ id: '1', title: 'Task' }];
      mockPrisma.$transaction.mockResolvedValue([tasks, 1]);

      await service.findAll({ page: 1, limit: 10 }, 'user1');

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('tasks:all:user1'),
        expect.any(PaginatedResultDto),
      );
    });

    it('should apply status filter when provided', async () => {
      const tasks = [{ id: '1', title: 'Task', status: TaskStatus.TODO }];
      mockPrisma.$transaction.mockResolvedValue([tasks, 1]);

      const result = await service.findAll({ page: 1, limit: 10, status: TaskStatus.TODO }, 'user1');

      expect(result).toBeInstanceOf(PaginatedResultDto);
      expect(result.data).toEqual(tasks);
    });

    it('should apply dueDateFrom filter when provided', async () => {
      const tasks = [{ id: '1', title: 'Task', dueDate: new Date('2026-06-01') }];
      mockPrisma.$transaction.mockResolvedValue([tasks, 1]);

      const result = await service.findAll({ page: 1, limit: 10, dueDateFrom: '2026-01-01' }, 'user1');

      expect(result).toBeInstanceOf(PaginatedResultDto);
      expect(result.data).toEqual(tasks);
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('2026-01-01'),
        expect.any(PaginatedResultDto),
      );
    });

    it('should apply search filter when provided', async () => {
      const tasks = [{ id: '1', title: 'NestJS Workshop', description: 'Learn NestJS' }];
      mockPrisma.$transaction.mockResolvedValue([tasks, 1]);

      const result = await service.findAll({ page: 1, limit: 10, search: 'NestJS' }, 'user1');

      expect(result).toBeInstanceOf(PaginatedResultDto);
      expect(result.data).toEqual(tasks);
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('NestJS'),
        expect.any(PaginatedResultDto),
      );
    });

    it('should return cached result when cache hits', async () => {
      const cached = new PaginatedResultDto<{ id: string; title: string }>([{ id: '1', title: 'Cached' }], 1, 1, 10);
      mockCache.get.mockResolvedValue(cached);

      const result = await service.findAll({ page: 1, limit: 10 }, 'user1');

      expect(result).toEqual(cached);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a task when found', async () => {
      const task = { id: '1', title: 'Task', userId: 'user1' };
      mockPrisma.task.findUnique.mockResolvedValue(task);

      const result = await service.findById('1', 'user1');

      expect(result).toEqual(task);
      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({ where: { id: '1', userId: 'user1' } });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent', 'user1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return the task', async () => {
      const existing = { id: '1', title: 'Old', userId: 'user1' };
      const updated = { id: '1', title: 'New', userId: 'user1' };
      mockPrisma.task.findUnique.mockResolvedValue(existing);
      mockPrisma.task.update.mockResolvedValue(updated);

      const result = await service.update('1', { title: 'New' }, 'user1');

      expect(result).toEqual(updated);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'New', dueDate: undefined },
      });
    });

    it('should invalidate the tasks cache after update', async () => {
      const existing = { id: '1', title: 'Old', userId: 'user1' };
      const updated = { id: '1', title: 'New', userId: 'user1' };
      mockPrisma.task.findUnique.mockResolvedValue(existing);
      mockPrisma.task.update.mockResolvedValue(updated);

      await service.update('1', { title: 'New' }, 'user1');

      expect(mockCache.delByPattern).toHaveBeenCalledWith('tasks:all');
    });

    it('should publish a task updated MQTT event', async () => {
      const existing = { id: '1', title: 'Old', userId: 'user1' };
      const updated = { id: '1', title: 'New', userId: 'user1' };
      mockPrisma.task.findUnique.mockResolvedValue(existing);
      mockPrisma.task.update.mockResolvedValue(updated);

      await service.update('1', { title: 'New' }, 'user1');

      expect(mockMqtt.publishTaskUpdated).toHaveBeenCalledWith('user1', { id: '1', title: 'New' });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'New' }, 'user1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: '1', userId: 'user1', title: 'Task' });
      mockPrisma.task.delete.mockResolvedValue({});

      await expect(service.delete('1', 'user1')).resolves.toBeUndefined();
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should invalidate the tasks cache after deletion', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: '1', userId: 'user1', title: 'Task' });
      mockPrisma.task.delete.mockResolvedValue({});

      await service.delete('1', 'user1');

      expect(mockCache.delByPattern).toHaveBeenCalledWith('tasks:all');
    });

    it('should publish a task deleted MQTT event', async () => {
      const task = { id: '1', userId: 'user1', title: 'Task' };
      mockPrisma.task.findUnique.mockResolvedValue(task);
      mockPrisma.task.delete.mockResolvedValue({});

      await service.delete('1', 'user1');

      expect(mockMqtt.publishTaskDeleted).toHaveBeenCalledWith('user1', { id: '1', title: 'Task' });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent', 'user1')).rejects.toThrow(NotFoundException);
    });
  });
});
