import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { AdminUser } from './schemas/admin-user.schema';
import { Business } from './schemas/business.schema';
import { DomainException } from '../common/exceptions/domain.exception';
import { HttpStatus } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let mockBusinessModel: any;

  beforeEach(async () => {
    mockBusinessModel = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(AdminUser.name),
          useValue: jest.fn(),
        },
        {
          provide: getModelToken(Business.name),
          useValue: mockBusinessModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deletePublishableKey', () => {
    it('should set publishableKey to null and save the business', async () => {
      const mockBusiness = {
        _id: 'biz_123',
        name: 'Test Store',
        publishableKey: 'biz_live_abcdef123456',
        save: jest.fn().mockResolvedValue({
          _id: 'biz_123',
          name: 'Test Store',
          publishableKey: null,
        }),
      };

      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBusiness),
      });

      const result = await service.deletePublishableKey('biz_123');
      expect(mockBusiness.publishableKey).toBeNull();
      expect(mockBusiness.save).toHaveBeenCalled();
      expect(result.publishableKey).toBeNull();
    });

    it('should throw NOT_FOUND exception if business does not exist', async () => {
      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deletePublishableKey('non_existent')).rejects.toThrow(DomainException);
    });
  });

  describe('generatePublishableKey', () => {
    it('should generate a new key if business currently has no active key', async () => {
      const mockBusiness = {
        _id: 'biz_123',
        name: 'Test Store',
        publishableKey: null,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBusiness),
      });

      const result = await service.generatePublishableKey('biz_123');
      expect(result.publishableKey).toMatch(/^biz_live_[a-f0-9]{24}$/);
      expect(mockBusiness.publishableKey).toBe(result.publishableKey);
      expect(mockBusiness.save).toHaveBeenCalled();
    });

    it('should throw KEY_ALREADY_EXISTS (409 Conflict) if business already has an active key', async () => {
      const mockBusiness = {
        _id: 'biz_123',
        name: 'Test Store',
        publishableKey: 'biz_live_existing_key_12345',
      };

      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBusiness),
      });

      try {
        await service.generatePublishableKey('biz_123');
        fail('Should have thrown DomainException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DomainException);
        expect(err.code).toBe('KEY_ALREADY_EXISTS');
        expect(err.getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });

    it('should throw NOT_FOUND exception if business does not exist', async () => {
      mockBusinessModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.generatePublishableKey('non_existent')).rejects.toThrow(DomainException);
    });
  });
});
