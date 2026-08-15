import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Business, BusinessDocument } from '../users/schemas/business.schema';
import { AdminUser, AdminUserDocument } from '../users/schemas/admin-user.schema';
import { Conversation, ConversationDocument, ConversationChannel } from '../conversations/schemas/conversation.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { RedisService } from '../common/redis/redis.service';
import { DomainException } from '../common/exceptions/domain.exception';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Aggregates high-level platform-wide statistics for the SuperAdmin command center.
   */
  async getPlatformStats() {
    const [
      totalBusinesses,
      activeBusinesses,
      totalUsers,
      totalConversations,
      totalCustomers,
      voiceConversationsCount,
      recentBusinesses,
    ] = await Promise.all([
      this.businessModel.countDocuments({ name: { $ne: 'ORA Platform' } }),
      this.businessModel.countDocuments({ name: { $ne: 'ORA Platform' }, status: 'active' }),
      this.adminUserModel.countDocuments(),
      this.conversationModel.countDocuments(),
      this.customerModel.countDocuments(),
      this.conversationModel.countDocuments({ channel: ConversationChannel.WIDGET_VOICE }),
      this.businessModel
        .find({ name: { $ne: 'ORA Platform' } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Calculate approximate voice minutes (estimate 2.4 mins avg per voice conversation)
    const estimatedVoiceMinutes = Math.round(voiceConversationsCount * 2.4);

    // Redis Health Check
    let redisLatencyMs = 0;
    let redisStatus = 'healthy';
    try {
      const start = Date.now();
      await this.redisService.getClient().ping();
      redisLatencyMs = Date.now() - start;
    } catch (err) {
      redisStatus = 'degraded';
      redisLatencyMs = -1;
    }

    return {
      overview: {
        totalBusinesses,
        activeBusinesses,
        suspendedBusinesses: totalBusinesses - activeBusinesses,
        totalUsers,
        totalConversations,
        totalCustomers,
        totalVoiceMinutes: estimatedVoiceMinutes,
        voiceConversationsCount,
        platformMRR: totalBusinesses * 49, // Base Tier Estimated MRR
      },
      system: {
        serverUptimeSeconds: Math.floor(process.uptime()),
        nodeMemoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        redisStatus,
        redisLatencyMs,
        mongoStatus: 'connected',
      },
      recentSignups: recentBusinesses.map((b) => ({
        id: (b as any)._id.toString(),
        name: b.name,
        domain: b.domain,
        publishableKey: b.publishableKey,
        status: b.status,
        connectedPlatform: b.connectedPlatform || 'none',
        createdAt: (b as any).createdAt,
      })),
    };
  }

  /**
   * Retrieves paginated list of merchant businesses with filtering & stats.
   */
  async getBusinesses(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const filter: any = { name: { $ne: 'ORA Platform' } };
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { domain: { $regex: query.search, $options: 'i' } },
        { publishableKey: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [total, businesses] = await Promise.all([
      this.businessModel.countDocuments(filter),
      this.businessModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    // Attach owner info and conversation stats per business
    const enriched = await Promise.all(
      businesses.map(async (b: any) => {
        const owner = await this.adminUserModel
          .findOne({ businessId: b._id, role: { $in: ['owner', 'admin'] } } as any)
          .select('email name role createdAt')
          .lean();

        const conversationsCount = await this.conversationModel.countDocuments({
          businessId: b._id,
        } as any);

        return {
          id: b._id.toString(),
          name: b.name,
          domain: b.domain || 'N/A',
          publishableKey: b.publishableKey,
          status: b.status || 'active',
          connectedPlatform: b.connectedPlatform || 'none',
          ownerEmail: owner?.email || 'unassigned@ora.ai',
          ownerName: owner?.name || 'Store Owner',
          conversationsCount,
          createdAt: (b as any).createdAt,
        };
      }),
    );

    return {
      businesses: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates business status (active / suspended).
   */
  async updateBusinessStatus(businessId: string, status: string) {
    if (!['active', 'suspended', 'pending'].includes(status)) {
      throw new DomainException(
        'INVALID_STATUS',
        'Status must be active, suspended, or pending.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const business = await this.businessModel.findByIdAndUpdate(
      businessId,
      { status },
      { new: true },
    );

    if (!business) {
      throw new DomainException(
        'BUSINESS_NOT_FOUND',
        'Business tenant not found.',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      id: business._id.toString(),
      name: business.name,
      status: business.status,
      message: `Business status successfully updated to "${status}".`,
    };
  }

  /**
   * Retrieves all users across businesses.
   */
  async getUsers(query: { page?: number; limit?: number; role?: string; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.role && query.role !== 'all') {
      filter.role = query.role;
    }
    if (query.search) {
      filter.$or = [
        { email: { $regex: query.search, $options: 'i' } },
        { name: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.adminUserModel.countDocuments(filter),
      this.adminUserModel
        .find(filter)
        .populate('businessId', 'name domain status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const mappedUsers = users.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      emailVerified: u.emailVerified,
      businessName: u.businessId?.name || 'Independent / Platform',
      businessId: u.businessId?._id?.toString() || null,
      businessStatus: u.businessId?.status || 'active',
      createdAt: u.createdAt,
    }));

    return {
      users: mappedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves active & recent voice sessions across the platform.
   */
  async getVoiceSessions() {
    const recentVoiceSessions = await this.conversationModel
      .find({ channel: ConversationChannel.WIDGET_VOICE })
      .populate('businessId', 'name domain')
      .populate('customerId', 'name phone email')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    return {
      sessions: recentVoiceSessions.map((s: any) => ({
        id: s._id.toString(),
        sessionId: s.sessionId,
        businessName: s.businessId?.name || 'Store Tenant',
        customerIdentifier: s.customerId?.name || s.customerId?.phone || 'Guest Shopper',
        status: s.status,
        turnCount: s.turnCount || 0,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  }

  /**
   * System health status check.
   */
  async getSystemHealth() {
    const start = Date.now();
    let redisStatus = 'healthy';
    let redisLatency = 0;
    try {
      await this.redisService.getClient().ping();
      redisLatency = Date.now() - start;
    } catch (err) {
      redisStatus = 'error';
      redisLatency = -1;
    }

    return {
      status: 'operational',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        driver: 'mongoose',
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatency,
      },
      process: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        totalMemoryMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        nodeVersion: process.version,
      },
    };
  }
}
