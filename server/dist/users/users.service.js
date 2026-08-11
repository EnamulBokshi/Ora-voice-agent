"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const crypto = __importStar(require("crypto"));
const admin_user_schema_1 = require("./schemas/admin-user.schema");
const business_schema_1 = require("./schemas/business.schema");
const admin_role_enum_1 = require("./enums/admin-role.enum");
let UsersService = class UsersService {
    adminUserModel;
    businessModel;
    constructor(adminUserModel, businessModel) {
        this.adminUserModel = adminUserModel;
        this.businessModel = businessModel;
    }
    async createBusiness(name, domain) {
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
    async createAdminUser(params) {
        const adminUser = new this.adminUserModel({
            businessId: new mongoose_2.Types.ObjectId(params.businessId),
            email: params.email.toLowerCase(),
            passwordHash: params.passwordHash,
            name: params.name,
            role: params.role || admin_role_enum_1.AdminRole.OWNER,
            emailVerified: false,
        });
        return adminUser.save();
    }
    async findByEmail(email) {
        return this.adminUserModel.findOne({ email: email.toLowerCase() }).exec();
    }
    async findById(id) {
        return this.adminUserModel.findById(id).exec();
    }
    async findBusinessById(id) {
        return this.businessModel.findById(id).exec();
    }
    async updateAdminUser(id, update) {
        return this.adminUserModel
            .findByIdAndUpdate(id, { $set: update }, { new: true })
            .exec();
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(admin_user_schema_1.AdminUser.name)),
    __param(1, (0, mongoose_1.InjectModel)(business_schema_1.Business.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map