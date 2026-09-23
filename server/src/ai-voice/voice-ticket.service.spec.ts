import { VoiceTicketService } from './voice-ticket.service';
import { DomainException } from '../common/exceptions/domain.exception';

describe('VoiceTicketService', () => {
  let store: Map<string, string>;
  let sessions: Map<string, { adminUserId: string }>;
  let service: VoiceTicketService;

  const owner = { sub: 'u1', businessId: 'biz-a', email: 'o@example.com', role: 'owner', sessionId: 's1' };

  beforeEach(() => {
    store = new Map();
    sessions = new Map([['s1', { adminUserId: 'u1' }]]);
    const redis: any = {
      setSingleUseValue: jest.fn(async (k: string, v: string) => void store.set(k, v)),
      consumeSingleUseValue: jest.fn(async (k: string) => {
        const v = store.get(k) ?? null;
        store.delete(k);
        return v;
      }),
      getSession: jest.fn(async (id: string) => sessions.get(id) ?? null),
    };
    service = new VoiceTicketService(redis);
  });

  it('redeems a ticket once', async () => {
    const { ticket } = await service.issue(owner, 'test');
    await expect(service.redeem(ticket)).resolves.toEqual({ adminUserId: 'u1', authSessionId: 's1', mode: 'test' });
    await expect(service.redeem(ticket)).resolves.toBeNull();
  });

  it('refuses a ticket whose login session was revoked', async () => {
    const { ticket } = await service.issue(owner, 'test');
    sessions.delete('s1');
    await expect(service.redeem(ticket)).resolves.toBeNull();
  });

  it('refuses a malformed or missing ticket', async () => {
    await expect(service.redeem(undefined)).resolves.toBeNull();
    await expect(service.redeem('not-a-ticket')).resolves.toBeNull();
  });

  it('only lets owners and admins train', async () => {
    await expect(service.issue({ ...owner, role: 'staff' }, 'training')).rejects.toBeInstanceOf(DomainException);
    await expect(service.issue({ ...owner, role: 'staff' }, 'test')).resolves.toHaveProperty('ticket');
    await expect(service.issue({ ...owner, role: 'admin' }, 'training')).resolves.toHaveProperty('ticket');
  });
});
