import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';

import { VoiceGateway } from './voice.gateway';
import { SessionTimerService } from './session-timer.service';
import { GeminiVoiceService } from '../ai-voice/gemini-voice.service';
import { EntitlementService } from '../common/entitlement/entitlement.service';
import { BillingService } from '../billing/billing.service';
import { Business } from '../users/schemas/business.schema';

const KEY = 'biz_live_0123456789abcdef01234567';

/**
 * The publishable key decides which tenant a storefront shopper reaches, and
 * this gateway is reachable by anyone who can open a socket. These tests pin
 * the one rule that matters: an unrecognized key resolves to no tenant at all.
 */
describe('VoiceGateway tenant resolution', () => {
  let gateway: VoiceGateway;
  let businessModel: { findOne: jest.Mock; findById: jest.Mock };
  let geminiVoiceService: { createVoiceSession: jest.Mock };
  let entitlementService: { decide: jest.Mock };
  let client: { id: string; emit: jest.Mock; handshake: { headers: Record<string, string> } };

  const exec = (result: unknown) => ({
    exec: jest.fn().mockResolvedValue(result),
    sort: jest.fn().mockReturnThis(),
  });

  const storeDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => 'biz-1' },
    name: 'Demo Store',
    publishableKey: KEY,
    status: 'active',
    keyStatus: 'active',
    isWidgetActive: true,
    ...overrides,
  });

  beforeEach(async () => {
    businessModel = {
      findOne: jest.fn().mockReturnValue(exec(null)),
      // recordOriginTelemetry re-reads the tenant; nothing here asserts on it.
      findById: jest.fn().mockResolvedValue(null),
    };
    geminiVoiceService = {
      createVoiceSession: jest.fn().mockResolvedValue({
        sendAudioChunk: jest.fn(),
        sendTextMessage: jest.fn(),
        closeSession: jest.fn(),
      }),
    };
    entitlementService = {
      decide: jest.fn().mockResolvedValue({ entitled: true }),
    };
    client = { id: 'socket-1', emit: jest.fn(), handshake: { headers: {} } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceGateway,
        { provide: getModelToken(Business.name), useValue: businessModel },
        { provide: GeminiVoiceService, useValue: geminiVoiceService },
        {
          provide: SessionTimerService,
          useValue: {
            startTimer: jest.fn(),
            clearTimer: jest.fn(),
            markActivity: jest.fn(),
            markAgentSpeaking: jest.fn(),
            markAgentTurnComplete: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: EntitlementService, useValue: entitlementService },
        {
          provide: BillingService,
          useValue: {
            incrementUsage: jest.fn().mockResolvedValue(undefined),
            getSubscription: jest.fn().mockResolvedValue({
              subscription: { status: 'active' },
              plan: { limits: { voiceMinutes: 500 } },
              usage: { voiceMinutes: 10 },
            }),
          },
        },
      ],
    }).compile();

    gateway = module.get<VoiceGateway>(VoiceGateway);
  });

  const start = (publishableKey: string) =>
    gateway.handleStartVoiceSession(client as any, {
      publishableKey,
      sessionId: 'sess-1',
    });

  it('refuses an unknown publishable key instead of substituting a tenant', async () => {
    // Answers any query that is not an exact key match with a real tenant,
    // which is exactly what the removed fallback queries looked like. If the
    // gateway ever widens its search again, this store is what it finds.
    businessModel.findOne.mockImplementation((filter: any) =>
      typeof filter?.publishableKey === 'string'
        ? exec(null)
        : exec(storeDoc({ name: 'Someone Else' })),
    );

    await start('biz_live_doesnotexist000000000000');

    // The rejection must be total. Falling back to "the newest active store"
    // answered a stranger's shopper out of another merchant's catalog and
    // billed that merchant for it.
    expect(geminiVoiceService.createVoiceSession).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('voice-error', {
      message: 'Invalid publishable key. Access denied.',
    });
  });

  it('looks a key up exactly once, with no second query to widen the search', async () => {
    await start('biz_live_doesnotexist000000000000');

    expect(businessModel.findOne).toHaveBeenCalledTimes(1);
    expect(businessModel.findOne).toHaveBeenCalledWith({
      publishableKey: 'biz_live_doesnotexist000000000000',
    });
  });

  it('opens a session for the tenant the key actually belongs to', async () => {
    businessModel.findOne.mockReturnValue(exec(storeDoc()));

    await start(KEY);

    expect(geminiVoiceService.createVoiceSession).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: 'biz-1', sessionId: 'sess-1' }),
    );
  });

  it('refuses a suspended store', async () => {
    businessModel.findOne.mockReturnValue(exec(storeDoc({ status: 'suspended' })));

    await start(KEY);

    expect(geminiVoiceService.createVoiceSession).not.toHaveBeenCalled();
  });

  it('refuses a store with no active subscription', async () => {
    businessModel.findOne.mockReturnValue(exec(storeDoc()));
    entitlementService.decide.mockResolvedValue({
      entitled: false,
      code: 'SUBSCRIPTION_REQUIRED',
    });

    await start(KEY);

    expect(geminiVoiceService.createVoiceSession).not.toHaveBeenCalled();
  });

  it('requires both a key and a session id', async () => {
    await gateway.handleStartVoiceSession(client as any, {
      publishableKey: '',
      sessionId: 'sess-1',
    });

    expect(businessModel.findOne).not.toHaveBeenCalled();
    expect(geminiVoiceService.createVoiceSession).not.toHaveBeenCalled();
  });
});
