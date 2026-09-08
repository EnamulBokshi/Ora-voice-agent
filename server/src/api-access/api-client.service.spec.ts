import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { ApiClientService } from './api-client.service';
import {
  ApiClient,
  ApiClientStatus,
  ApiScope,
} from './schemas/api-client.schema';
import { DomainException } from '../common/exceptions/domain.exception';

describe('ApiClientService', () => {
  let service: ApiClientService;
  let mockApiClientModel: any;

  const mockBusinessId = '671234567890123456789012';

  beforeEach(async () => {
    mockApiClientModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiClientService,
        {
          provide: getModelToken(ApiClient.name),
          useValue: mockApiClientModel,
        },
      ],
    }).compile();

    service = module.get<ApiClientService>(ApiClientService);
  });

  describe('createClient', () => {
    it('should create an API client with default write scope and hashed secret', async () => {
      mockApiClientModel.create.mockImplementation((data: any) => ({
        _id: 'client_obj_id_123',
        name: data.name,
        clientId: data.clientId,
        scopes: data.scopes,
        allowedIps: data.allowedIps,
      }));

      const result = await service.createClient(
        mockBusinessId,
        { name: 'Telegram Bot' },
        'admin_user_1',
      );

      expect(mockApiClientModel.create).toHaveBeenCalledTimes(1);
      const createArgs = mockApiClientModel.create.mock.calls[0][0];

      expect(createArgs.businessId).toBe(mockBusinessId);
      expect(createArgs.name).toBe('Telegram Bot');
      expect(createArgs.clientId).toMatch(/^ora_client_[a-f0-9]{24}$/);
      expect(createArgs.scopes).toEqual([ApiScope.INPUTS_WRITE]);
      expect(createArgs.status).toBe(ApiClientStatus.ACTIVE);
      expect(createArgs.createdBy).toBe('admin_user_1');

      // Password hash verification
      expect(createArgs.clientSecretHash).toBeDefined();
      expect(createArgs.secretHint).toBe(result.client_secret.slice(-4));
      const hashMatches = await bcrypt.compare(
        result.client_secret,
        createArgs.clientSecretHash,
      );
      expect(hashMatches).toBe(true);

      // Result shape
      expect(result.client_id).toBe(createArgs.clientId);
      expect(result.client_secret).toMatch(/^ora_secret_[A-Za-z0-9_-]+$/);
      expect(result.tokenUrl).toBe('/api/v1/oauth/token');
      expect(result.warning).toContain('cannot be retrieved later');
    });

    it('should accept custom scopes and allowed IPs', async () => {
      mockApiClientModel.create.mockImplementation((data: any) => ({
        _id: 'client_obj_id_456',
        name: data.name,
        clientId: data.clientId,
        scopes: data.scopes,
        allowedIps: data.allowedIps,
      }));

      const result = await service.createClient(
        mockBusinessId,
        {
          name: 'Read-Write Worker',
          scopes: [ApiScope.INPUTS_WRITE, ApiScope.INPUTS_READ],
          allowedIps: ['192.168.1.50'],
        },
      );

      const createArgs = mockApiClientModel.create.mock.calls[0][0];
      expect(createArgs.scopes).toEqual([
        ApiScope.INPUTS_WRITE,
        ApiScope.INPUTS_READ,
      ]);
      expect(createArgs.allowedIps).toEqual(['192.168.1.50']);
      expect(result.scopes).toEqual([
        ApiScope.INPUTS_WRITE,
        ApiScope.INPUTS_READ,
      ]);
    });
  });

  describe('listClients', () => {
    it('should list clients for the business with masked hints and no secret hashes', async () => {
      const mockClients = [
        {
          _id: 'client_1',
          name: 'Bot 1',
          clientId: 'ora_client_111',
          secretHint: 'abcd',
          scopes: [ApiScope.INPUTS_WRITE],
          status: ApiClientStatus.ACTIVE,
          allowedIps: [],
          lastUsedAt: new Date(),
          revokedAt: undefined,
        },
      ];

      const selectMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClients),
      });

      mockApiClientModel.find.mockReturnValue({
        select: selectMock,
        sort: sortMock,
      });

      const result = await service.listClients(mockBusinessId);

      expect(mockApiClientModel.find).toHaveBeenCalledWith({
        businessId: mockBusinessId,
      });
      expect(selectMock).toHaveBeenCalledWith('-clientSecretHash');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('client_1');
      expect(result[0].secretHint).toBe('****abcd');
      expect((result[0] as any).clientSecretHash).toBeUndefined();
    });
  });

  describe('revokeClient', () => {
    it('should revoke an existing client belonging to the tenant', async () => {
      mockApiClientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'client_1',
          clientId: 'ora_client_111',
          status: ApiClientStatus.REVOKED,
        }),
      });

      const result = await service.revokeClient(
        mockBusinessId,
        'client_1',
        'owner_1',
      );

      expect(mockApiClientModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'client_1', businessId: mockBusinessId },
        {
          $set: {
            status: ApiClientStatus.REVOKED,
            revokedAt: expect.any(Date),
            revokedBy: 'owner_1',
          },
        },
        { returnDocument: 'after' },
      );
      expect(result.status).toBe(ApiClientStatus.REVOKED);
    });

    it('should throw 404 DomainException if client does not exist or tenant does not match', async () => {
      mockApiClientModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.revokeClient(mockBusinessId, 'nonexistent_or_other_tenant'),
      ).rejects.toThrow(DomainException);

      try {
        await service.revokeClient(mockBusinessId, 'nonexistent_or_other_tenant');
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(err.code).toBe('API_CLIENT_NOT_FOUND');
      }
    });
  });

  describe('verifyCredentials', () => {
    const rawSecret = 'ora_secret_super_secret_key_123';
    let hashedSecret: string;

    beforeAll(async () => {
      hashedSecret = await bcrypt.hash(rawSecret, 10);
    });

    it('should return client document when credentials are valid and client is active', async () => {
      const mockClient = {
        _id: 'client_1',
        clientId: 'ora_client_valid',
        clientSecretHash: hashedSecret,
        status: ApiClientStatus.ACTIVE,
        allowedIps: [],
        scopes: [ApiScope.INPUTS_WRITE],
        businessId: mockBusinessId,
      };

      mockApiClientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClient),
      });

      const verified = await service.verifyCredentials(
        'ora_client_valid',
        rawSecret,
        '10.0.0.1',
      );

      expect(verified).toBe(mockClient);
    });

    it('should return null when client does not exist', async () => {
      mockApiClientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const verified = await service.verifyCredentials(
        'ora_client_nonexistent',
        rawSecret,
      );

      expect(verified).toBeNull();
    });

    it('should return null when client is revoked', async () => {
      mockApiClientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          clientId: 'ora_client_revoked',
          clientSecretHash: hashedSecret,
          status: ApiClientStatus.REVOKED,
          allowedIps: [],
        }),
      });

      const verified = await service.verifyCredentials(
        'ora_client_revoked',
        rawSecret,
      );

      expect(verified).toBeNull();
    });

    it('should return null when secret does not match', async () => {
      mockApiClientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          clientId: 'ora_client_valid',
          clientSecretHash: hashedSecret,
          status: ApiClientStatus.ACTIVE,
          allowedIps: [],
        }),
      });

      const verified = await service.verifyCredentials(
        'ora_client_valid',
        'wrong_secret',
      );

      expect(verified).toBeNull();
    });

    it('should enforce IP allowlist: reject non-allowlisted IP', async () => {
      mockApiClientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          clientId: 'ora_client_ip_restricted',
          clientSecretHash: hashedSecret,
          status: ApiClientStatus.ACTIVE,
          allowedIps: ['203.0.113.5'],
        }),
      });

      const verified = await service.verifyCredentials(
        'ora_client_ip_restricted',
        rawSecret,
        '198.51.100.22',
      );

      expect(verified).toBeNull();
    });

    it('should enforce IP allowlist: accept allowlisted IP', async () => {
      const mockClient = {
        clientId: 'ora_client_ip_restricted',
        clientSecretHash: hashedSecret,
        status: ApiClientStatus.ACTIVE,
        allowedIps: ['203.0.113.5'],
      };

      mockApiClientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClient),
      });

      const verified = await service.verifyCredentials(
        'ora_client_ip_restricted',
        rawSecret,
        '203.0.113.5',
      );

      expect(verified).toBe(mockClient);
    });
  });

  describe('findActiveByClientId', () => {
    it('should return client if active', async () => {
      const mockClient = {
        clientId: 'ora_client_active',
        status: ApiClientStatus.ACTIVE,
      };
      mockApiClientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClient),
      });

      const result = await service.findActiveByClientId('ora_client_active');
      expect(result).toBe(mockClient);
    });

    it('should return null if revoked or not found', async () => {
      mockApiClientModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          clientId: 'ora_client_revoked',
          status: ApiClientStatus.REVOKED,
        }),
      });

      const result = await service.findActiveByClientId('ora_client_revoked');
      expect(result).toBeNull();
    });
  });

  describe('touchLastUsed', () => {
    it('should update lastUsedAt for the client', async () => {
      const updateMock = {
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      };
      mockApiClientModel.updateOne.mockReturnValue(updateMock);

      await service.touchLastUsed('ora_client_123');

      expect(mockApiClientModel.updateOne).toHaveBeenCalledWith(
        { clientId: 'ora_client_123' },
        { $set: { lastUsedAt: expect.any(Date) } },
      );
    });
  });
});
