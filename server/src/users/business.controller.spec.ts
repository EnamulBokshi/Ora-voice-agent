import { Test, TestingModule } from '@nestjs/testing';
import { BusinessController } from './business.controller';
import { UsersService } from './users.service';
import { VoiceProxyGateway } from '../ai-voice/voice-proxy.gateway';

describe('BusinessController', () => {
  let controller: BusinessController;
  let mockUsersService: any;
  let mockVoiceProxyGateway: any;

  beforeEach(async () => {
    mockUsersService = {
      findBusinessById: jest.fn(),
      deletePublishableKey: jest.fn(),
      generatePublishableKey: jest.fn(),
    };

    mockVoiceProxyGateway = {
      invalidatePublishableKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: VoiceProxyGateway,
          useValue: mockVoiceProxyGateway,
        },
      ],
    }).compile();

    controller = module.get<BusinessController>(BusinessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentBusiness', () => {
    it('should return current business for tenant', async () => {
      const mockBiz = { _id: 'biz_123', name: 'My Store', publishableKey: 'biz_live_123' };
      mockUsersService.findBusinessById.mockResolvedValue(mockBiz);

      const result = await controller.getCurrentBusiness({ businessId: 'biz_123' });
      expect(result).toEqual(mockBiz);
      expect(mockUsersService.findBusinessById).toHaveBeenCalledWith('biz_123');
    });
  });

  describe('deletePublishableKey', () => {
    it('should revoke key and invalidate gateway cache', async () => {
      const mockBiz = { _id: 'biz_123', name: 'My Store', publishableKey: 'biz_live_oldkey' };
      const updatedBiz = { _id: 'biz_123', name: 'My Store', publishableKey: null };

      mockUsersService.findBusinessById.mockResolvedValue(mockBiz);
      mockUsersService.deletePublishableKey.mockResolvedValue(updatedBiz);

      const result = await controller.deletePublishableKey({ businessId: 'biz_123' });

      expect(mockVoiceProxyGateway.invalidatePublishableKey).toHaveBeenCalledWith('biz_live_oldkey');
      expect(mockUsersService.deletePublishableKey).toHaveBeenCalledWith('biz_123');
      expect(result.message).toBe('Publishable key revoked successfully.');
      expect(result.business).toEqual(updatedBiz);
    });
  });

  describe('generatePublishableKey', () => {
    it('should generate a new key and invalidate gateway cache', async () => {
      const updatedBiz = { _id: 'biz_123', name: 'My Store', publishableKey: 'biz_live_newkey' };

      mockUsersService.generatePublishableKey.mockResolvedValue({
        publishableKey: 'biz_live_newkey',
        business: updatedBiz,
      });

      const result = await controller.generatePublishableKey({ businessId: 'biz_123' });

      expect(mockVoiceProxyGateway.invalidatePublishableKey).toHaveBeenCalled();
      expect(mockUsersService.generatePublishableKey).toHaveBeenCalledWith('biz_123');
      expect(result.publishableKey).toBe('biz_live_newkey');
      expect(result.business).toEqual(updatedBiz);
    });
  });
});
