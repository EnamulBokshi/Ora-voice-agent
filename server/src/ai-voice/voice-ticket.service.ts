import { HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RedisService } from '../common/redis/redis.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { DomainException } from '../common/exceptions/domain.exception';
import { AdminRole } from '../users/enums/admin-role.enum';

// Training writes to the store's knowledge, which is an owner/admin action
// everywhere else on the agent surface.
const TRAINING_ROLES: string[] = [AdminRole.SUPER_ADMIN, AdminRole.OWNER, AdminRole.ADMIN];

/**
 * - `test`: the owner trying their own agent. The session meets ORA as an
 *   anonymous shopper and is kept out of listings, analytics and usage.
 * - `training`: the owner teaching their own agent. Same bookkeeping as `test`,
 *   but the model knows it is talking to the owner.
 * - `visitor`: a logged-in merchant on ORA's platform assistant, which greets
 *   them by name. On any other store it grants nothing.
 */
export type VoiceTicketMode = 'test' | 'training' | 'visitor';

export interface VoiceTicket {
  adminUserId: string;
  /** The dashboard login session the ticket was issued under. */
  authSessionId: string;
  mode: VoiceTicketMode;
}

const TICKET_TTL_SECONDS = 60;
const ticketKey = (id: string) => `voice:ticket:${id}`;

/**
 * Short-lived, single-use proof that a dashboard user opened a voice session.
 *
 * It replaces the dashboard JWT the clients used to put in the WebSocket URL,
 * where access logs record it and where it outlived logout. The ticket is
 * opaque, lasts a minute, works once, and is refused if the login session it
 * came from has since been revoked.
 */
@Injectable()
export class VoiceTicketService {
  constructor(private readonly redisService: RedisService) {}

  async issue(user: JwtPayloadUser, mode: VoiceTicketMode): Promise<{ ticket: string; expiresIn: number }> {
    if (mode === 'training' && !TRAINING_ROLES.includes(user.role)) {
      throw new DomainException(
        'VOICE_TRAINING_FORBIDDEN',
        'Only store owners and admins can train ORA.',
        HttpStatus.FORBIDDEN,
      );
    }

    const id = randomBytes(24).toString('hex');
    const ticket: VoiceTicket = { adminUserId: user.sub, authSessionId: user.sessionId, mode };
    await this.redisService.setSingleUseValue(ticketKey(id), JSON.stringify(ticket), TICKET_TTL_SECONDS);
    return { ticket: id, expiresIn: TICKET_TTL_SECONDS };
  }

  /** Consumes the ticket. Null when it is unknown, used, expired, or its login session is gone. */
  async redeem(id: string | undefined): Promise<VoiceTicket | null> {
    if (!id || !/^[a-f0-9]{48}$/.test(id)) return null;

    const raw = await this.redisService.consumeSingleUseValue(ticketKey(id));
    if (!raw) return null;

    let ticket: VoiceTicket;
    try {
      ticket = JSON.parse(raw);
    } catch {
      return null;
    }

    const session = await this.redisService.getSession(ticket.authSessionId);
    if (!session || session.adminUserId !== ticket.adminUserId) return null;

    return ticket;
  }
}
