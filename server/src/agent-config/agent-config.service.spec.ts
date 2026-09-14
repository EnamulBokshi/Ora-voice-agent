import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { AgentConfigService } from './agent-config.service';
import {
  AgentConfig,
  VoiceSettings,
  SalesPlaybook,
} from './schemas/agent-config.schema';
import { AgentProfileService } from '../common/agent-profile/agent-profile.service';
import { DomainException } from '../common/exceptions/domain.exception';

/**
 * The archetype used to be a string field on a single AgentConfig, so changing
 * it overwrote the merchant's only setup. It is now the identity of a profile:
 * every read and write is keyed on (businessId, archetype), and switching
 * leaves the previous profile untouched on disk.
 */
describe('AgentConfigService', () => {
  const BUSINESS_ID = '671234567890123456789012';

  let service: AgentConfigService;
  let agentConfigModel: any;
  let voiceSettingsModel: any;
  let salesPlaybookModel: any;
  let agentProfileService: {
    getActiveArchetype: jest.Mock;
    setActiveArchetype: jest.Mock;
    invalidate: jest.Mock;
  };

  /** A findOne that records its filter and resolves to `result`. */
  const findOneReturning = (result: any, calls: any[]) =>
    jest.fn((filter: any) => {
      calls.push(filter);
      return { exec: jest.fn().mockResolvedValue(result) };
    });

  let configFilters: any[];
  let updateFilters: any[];

  beforeEach(async () => {
    configFilters = [];
    updateFilters = [];

    agentConfigModel = findOneReturning({ archetype: 'ecommerce' }, configFilters);
    agentConfigModel.findOne = agentConfigModel;
    agentConfigModel.findOneAndUpdate = jest.fn((filter: any, update: any) => {
      updateFilters.push({ filter, update });
      return { exec: jest.fn().mockResolvedValue({ archetype: filter.archetype }) };
    });
    agentConfigModel.find = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        { archetype: 'ecommerce', systemPrompt: 'Sell things', updatedAt: 'then' },
        { archetype: 'clinic_appointments', systemPrompt: '', businessSummary: '' },
      ]),
    }));

    voiceSettingsModel = findOneReturning({ voiceId: 'Aoede' }, []);
    voiceSettingsModel.findOne = voiceSettingsModel;
    voiceSettingsModel.findOneAndUpdate = jest.fn(() => ({
      exec: jest.fn().mockResolvedValue({ voiceId: 'Kore' }),
    }));

    salesPlaybookModel = findOneReturning({ mentionLowStockUrgency: true }, []);
    salesPlaybookModel.findOne = salesPlaybookModel;
    salesPlaybookModel.findOneAndUpdate = jest.fn(() => ({
      exec: jest.fn().mockResolvedValue({}),
    }));

    agentProfileService = {
      getActiveArchetype: jest.fn().mockResolvedValue('ecommerce'),
      setActiveArchetype: jest
        .fn()
        .mockImplementation(async (_id: string, a: string) =>
          a === 'not_a_real_type' ? null : a,
        ),
      invalidate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentConfigService,
        { provide: getModelToken(AgentConfig.name), useValue: agentConfigModel },
        { provide: getModelToken(VoiceSettings.name), useValue: voiceSettingsModel },
        { provide: getModelToken(SalesPlaybook.name), useValue: salesPlaybookModel },
        { provide: AgentProfileService, useValue: agentProfileService },
      ],
    }).compile();

    service = module.get<AgentConfigService>(AgentConfigService);
  });

  it('reads the profile of the archetype that is live', async () => {
    const res = await service.getConfig(BUSINESS_ID);

    expect(res.activeArchetype).toBe('ecommerce');
    expect(configFilters[0]).toEqual({
      businessId: BUSINESS_ID,
      archetype: 'ecommerce',
    });
  });

  it('writes updates into the live profile only', async () => {
    await service.updateConfig(BUSINESS_ID, { brandVoiceDescription: 'Warm' });

    expect(updateFilters[0].filter).toEqual({
      businessId: BUSINESS_ID,
      archetype: 'ecommerce',
    });
    expect(updateFilters[0].update.$set.archetype).toBe('ecommerce');
  });

  it('switches the pointer without touching the profile being left', async () => {
    agentProfileService.getActiveArchetype.mockResolvedValue('clinic_appointments');

    const res = await service.switchArchetype(BUSINESS_ID, 'clinic_appointments');

    expect(agentProfileService.setActiveArchetype).toHaveBeenCalledWith(
      BUSINESS_ID,
      'clinic_appointments',
    );
    // A switch reads; it must never update or delete the old profile's rows.
    expect(agentConfigModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(res.activeArchetype).toBe('clinic_appointments');
  });

  it('rejects an unknown archetype instead of silently defaulting', async () => {
    await expect(
      service.switchArchetype(BUSINESS_ID, 'not_a_real_type'),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('reports which profiles the merchant has already set up', async () => {
    const res = await service.listProfiles(BUSINESS_ID);

    expect(res.profiles).toEqual([
      expect.objectContaining({ archetype: 'ecommerce', isConfigured: true }),
      expect.objectContaining({ archetype: 'clinic_appointments', isConfigured: false }),
    ]);
  });
});
