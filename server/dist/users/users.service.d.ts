import { Model, Types } from 'mongoose';
import { AdminUser, AdminUserDocument } from './schemas/admin-user.schema';
import { BusinessDocument } from './schemas/business.schema';
import { AdminRole } from './enums/admin-role.enum';
export declare class UsersService {
    private readonly adminUserModel;
    private readonly businessModel;
    constructor(adminUserModel: Model<AdminUserDocument>, businessModel: Model<BusinessDocument>);
    createBusiness(name: string, domain?: string): Promise<BusinessDocument>;
    createAdminUser(params: {
        businessId: Types.ObjectId | string;
        email: string;
        passwordHash: string;
        name: string;
        role?: AdminRole;
    }): Promise<AdminUserDocument>;
    findByEmail(email: string): Promise<AdminUserDocument | null>;
    findById(id: string): Promise<AdminUserDocument | null>;
    findBusinessById(id: string): Promise<BusinessDocument | null>;
    updateAdminUser(id: string, update: Partial<AdminUser>): Promise<AdminUserDocument | null>;
}
