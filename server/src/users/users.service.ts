import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { AdminUser, AdminUserDocument } from './schemas/admin-user.schema';
import { Business, BusinessDocument } from './schemas/business.schema';
import { AdminRole } from './enums/admin-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectModel(Business.name)
    private readonly businessModel: Model<BusinessDocument>,
  ) {}

  async createBusiness(name: string, domain?: string): Promise<BusinessDocument> {
    const randomHex = crypto.randomBytes(12).toString('hex');
    const publishableKey = `biz_live_${randomHex}`;

    const business = new this.businessModel({
      name,
      domain,
      publishableKey,
      status: 'active',
    });

    return business.save();
  }

  async createAdminUser(params: {
    businessId: Types.ObjectId | string;
    email: string;
    passwordHash: string;
    name: string;
    role?: AdminRole;
  }): Promise<AdminUserDocument> {
    const adminUser = new this.adminUserModel({
      businessId: new Types.ObjectId(params.businessId),
      email: params.email.toLowerCase(),
      passwordHash: params.passwordHash,
      name: params.name,
      role: params.role || AdminRole.USER,
      emailVerified: false,
    });

    return adminUser.save();
  }

  async findByEmail(email: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findById(id).exec();
  }

  async findBusinessById(id: string): Promise<BusinessDocument | null> {
    return this.businessModel.findById(id).exec();
  }

  async updateAdminUser(
    id: string,
    update: Partial<AdminUser>,
  ): Promise<AdminUserDocument | null> {
    return this.adminUserModel
      .findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' })
      .exec();
  }
}
