import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Business, BusinessDocument } from '../../users/schemas/business.schema';
import {
  BusinessArchetype,
  DEFAULT_ARCHETYPE,
  normalizeArchetype,
  resolveArchetype,
} from '../constants/archetypes';

/**
 * Resolves which agent profile a business is currently running.
 *
 * The archetype is an entity: persona, voice, playbook and knowledge are all
 * keyed on (businessId, archetype), and `Business.activeArchetype` says which
 * of those profiles is live. Rather than thread an archetype parameter through
 * every controller and service signature, the services that own profile-scoped
 * data resolve it here — the same way they already resolve tenant scope from
 * the authenticated business rather than from the request body.
 *
 * Reads are cached briefly because the voice path resolves the archetype on
 * every RAG lookup. `invalidate` is called on switch so a merchant never
 * speaks to the profile they just left.
 */
@Injectable()
export class AgentProfileService {
  private readonly logger = new Logger(AgentProfileService.name);

  private readonly cache = new Map<string, { archetype: BusinessArchetype; expiresAt: number }>();
  private static readonly CACHE_TTL_MS = 30_000;

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) {}

  async getActiveArchetype(businessId: string): Promise<BusinessArchetype> {
    const key = String(businessId);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.archetype;

    let archetype: BusinessArchetype = DEFAULT_ARCHETYPE;

    try {
      if (Types.ObjectId.isValid(key)) {
        const business = await this.businessModel
          .findById(key)
          .select('activeArchetype')
          .lean()
          .exec();
        archetype = resolveArchetype(business?.activeArchetype);
      }
    } catch (err: any) {
      // A profile lookup must never take down a voice session. The default
      // archetype is the conservative one — it grants no catalogue tools.
      this.logger.warn(
        `Failed to resolve active archetype for business ${key}: ${err.message}. Falling back to '${DEFAULT_ARCHETYPE}'.`,
      );
    }

    this.cache.set(key, {
      archetype,
      expiresAt: Date.now() + AgentProfileService.CACHE_TTL_MS,
    });

    return archetype;
  }

  /**
   * Points the business at a different profile. Returns the resolved archetype
   * so callers can report what is now live. Nothing is deleted: the profile
   * being left stays on disk and is restored by switching back.
   */
  async setActiveArchetype(
    businessId: string,
    archetype: string,
  ): Promise<BusinessArchetype | null> {
    const resolved = normalizeArchetype(archetype);
    if (!resolved) return null;

    await this.businessModel
      .findByIdAndUpdate(businessId, { $set: { activeArchetype: resolved } })
      .exec();

    this.invalidate(businessId);
    return resolved;
  }

  invalidate(businessId: string): void {
    this.cache.delete(String(businessId));
  }
}
