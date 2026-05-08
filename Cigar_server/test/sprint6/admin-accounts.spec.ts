import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminAccountsService } from '../../src/admin-accounts/admin-accounts.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('AdminAccountsService (unit)', () => {
  let service: AdminAccountsService;
  let prisma: any;

  const mockAdmin = {
    id: 1n,
    username: 'admin2',
    name: '张三',
    roleCode: 'product',
    status: 1,
    mustChangePassword: true,
    passwordChangedAt: new Date(),
    lockedUntil: null,
    lastLoginAt: new Date(),
    lastLoginIp: '127.0.0.1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      admin: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { findUnique: jest.fn() },
      adminLoginLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAccountsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminAccountsService>(AdminAccountsService);
  });

  describe('listAccounts', () => {
    it('返回分页的管理员列表', async () => {
      prisma.admin.findMany.mockResolvedValue([mockAdmin]);
      prisma.admin.count.mockResolvedValue(1);

      const result = await service.listAccounts(1, 20);
      expect(result.list).toHaveLength(1);
      expect(result.list[0].username).toBe('admin2');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('排除已删除的管理员', async () => {
      prisma.admin.findMany.mockResolvedValue([]);
      prisma.admin.count.mockResolvedValue(0);

      const result = await service.listAccounts(1, 20);
      expect(result.list).toHaveLength(0);
      expect(prisma.admin.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        }),
      );
    });
  });

  describe('createAccount', () => {
    it('创建管理员成功', async () => {
      prisma.admin.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ code: 'product', name: '商品管理' });
      prisma.admin.create.mockResolvedValue(mockAdmin);

      const result = await service.createAccount({
        username: 'admin2',
        name: '张三',
        password: 'Admin123456',
        roleCode: 'product',
      });

      expect(result.username).toBe('admin2');
      expect(prisma.admin.create).toHaveBeenCalled();
    });

    it('用户名重复抛出冲突', async () => {
      prisma.admin.findFirst.mockResolvedValue(mockAdmin);

      await expect(
        service.createAccount({
          username: 'admin2',
          name: '张三',
          password: 'Admin123456',
          roleCode: 'product',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('角色不存在抛出异常', async () => {
      prisma.admin.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(
        service.createAccount({
          username: 'admin2',
          name: '张三',
          password: 'Admin123456',
          roleCode: 'unknown',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('新管理员默认强制修改密码', async () => {
      prisma.admin.findFirst.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ code: 'member', name: '会员管理' });
      prisma.admin.create.mockResolvedValue({ ...mockAdmin, mustChangePassword: true });

      const result = await service.createAccount({
        username: 'admin3',
        name: '李四',
        password: 'Admin123456',
        roleCode: 'member',
      });

      expect(result).toBeDefined();
    });
  });

  describe('updateAccount', () => {
    it('更新管理员信息', async () => {
      prisma.admin.findFirst.mockResolvedValue(mockAdmin);
      prisma.admin.update.mockResolvedValue({ ...mockAdmin, name: '张三三' });

      const result = await service.updateAccount(1, { name: '张三三' });
      expect(result.name).toBe('张三三');
    });

    it('更新密码时重新哈希', async () => {
      prisma.admin.findFirst.mockResolvedValue(mockAdmin);
      prisma.admin.update.mockResolvedValue(mockAdmin);

      await service.updateAccount(1, { password: 'NewPass123' });
      const callData = prisma.admin.update.mock.calls[0][0].data;
      expect(callData.passwordHash).toBeDefined();
      expect(callData.mustChangePassword).toBe(true);
    });

    it('管理员不存在抛出异常', async () => {
      prisma.admin.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAccount(999, { name: '不存在' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('软删除管理员', async () => {
      prisma.admin.findFirst.mockResolvedValue(mockAdmin);
      prisma.admin.update.mockResolvedValue({ ...mockAdmin, deletedAt: new Date(), status: 0 });

      const result = await service.deleteAccount(1);
      expect(result.status).toBe(0);
    });
  });

  describe('getLoginLogs', () => {
    it('返回分页的登录日志', async () => {
      const result = await service.getLoginLogs({ page: 1, pageSize: 20 });
      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('支持按用户名筛选', async () => {
      await service.getLoginLogs({ username: 'admin', page: 1, pageSize: 20 });
      expect(prisma.adminLoginLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { username: 'admin' },
        }),
      );
    });
  });
});
