import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../infra/database/prisma/prisma.service';
import { PaginatedResultDto } from '../../common/dtos/paginated-result.dto';
import { TasksService } from './tasks.service';

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

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and return a task', async () => {
      const dto = { title: 'Test', userId: 'user1', status: TaskStatus.TODO };
      const task = { id: '1', ...dto, description: null, dueDate: null, createdAt: new Date(), updatedAt: new Date() };
      mockPrisma.task.create.mockResolvedValue(task);

      const result = await service.create(dto);

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
    });
  });

  describe('findAll', () => {
    it('should return a paginated result', async () => {
      const tasks = [{ id: '1', title: 'Task' }];
      mockPrisma.$transaction.mockResolvedValue([tasks, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toBeInstanceOf(PaginatedResultDto);
      expect(result.data).toEqual(tasks);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return a task when found', async () => {
      const task = { id: '1', title: 'Task', userId: 'user1' };
      mockPrisma.task.findUnique.mockResolvedValue(task);

      const result = await service.findById('1');

      expect(result).toEqual(task);
      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return the task', async () => {
      const existing = { id: '1', title: 'Old', userId: 'user1' };
      const updated = { id: '1', title: 'New', userId: 'user1' };
      mockPrisma.task.findUnique.mockResolvedValue(existing);
      mockPrisma.task.update.mockResolvedValue(updated);

      const result = await service.update('1', { title: 'New' });

      expect(result).toEqual(updated);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'New', dueDate: undefined },
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.task.delete.mockResolvedValue({});

      await expect(service.delete('1')).resolves.toBeUndefined();
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
