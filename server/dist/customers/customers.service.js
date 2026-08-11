"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const customer_schema_1 = require("./schemas/customer.schema");
const encryption_util_1 = require("../common/utils/encryption.util");
const domain_exception_1 = require("../common/exceptions/domain.exception");
let CustomersService = class CustomersService {
    customerModel;
    constructor(customerModel) {
        this.customerModel = customerModel;
    }
    async create(businessId, dto) {
        const customer = new this.customerModel({
            businessId: businessId,
            name: dto.name,
            emailEncrypted: dto.email ? encryption_util_1.EncryptionUtil.encrypt(dto.email) : undefined,
            phoneEncrypted: dto.phone ? encryption_util_1.EncryptionUtil.encrypt(dto.phone) : undefined,
            extractedPreferences: dto.extractedPreferences || {},
            metadata: dto.metadata || {},
        });
        const saved = await customer.save();
        return this.formatCustomer(saved);
    }
    async findAll(businessId, search) {
        const filter = {
            businessId: businessId,
        };
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        const items = await this.customerModel
            .find(filter)
            .sort({ updatedAt: -1 })
            .exec();
        return items.map((item) => this.formatCustomer(item));
    }
    async findOne(businessId, id) {
        const customer = await this.customerModel
            .findOne({
            _id: id,
            businessId: businessId,
        })
            .exec();
        if (!customer) {
            throw new domain_exception_1.DomainException('CUSTOMER_NOT_FOUND', `Customer with ID '${id}' not found.`, common_1.HttpStatus.NOT_FOUND);
        }
        return this.formatCustomer(customer);
    }
    async update(businessId, id, dto) {
        const customer = await this.customerModel
            .findOne({
            _id: id,
            businessId: businessId,
        })
            .exec();
        if (!customer) {
            throw new domain_exception_1.DomainException('CUSTOMER_NOT_FOUND', `Customer with ID '${id}' not found.`, common_1.HttpStatus.NOT_FOUND);
        }
        if (dto.name !== undefined)
            customer.name = dto.name;
        if (dto.email !== undefined)
            customer.emailEncrypted = encryption_util_1.EncryptionUtil.encrypt(dto.email);
        if (dto.phone !== undefined)
            customer.phoneEncrypted = encryption_util_1.EncryptionUtil.encrypt(dto.phone);
        if (dto.extractedPreferences !== undefined)
            customer.extractedPreferences = {
                ...customer.extractedPreferences,
                ...dto.extractedPreferences,
            };
        if (dto.metadata !== undefined)
            customer.metadata = { ...customer.metadata, ...dto.metadata };
        const updated = await customer.save();
        return this.formatCustomer(updated);
    }
    formatCustomer(customer) {
        const doc = customer.toObject ? customer.toObject() : customer;
        return {
            id: doc._id.toString(),
            businessId: doc.businessId.toString(),
            name: doc.name,
            email: doc.emailEncrypted ? encryption_util_1.EncryptionUtil.decrypt(doc.emailEncrypted) : null,
            phone: doc.phoneEncrypted ? encryption_util_1.EncryptionUtil.decrypt(doc.phoneEncrypted) : null,
            extractedPreferences: doc.extractedPreferences || {},
            pastOrderIds: doc.pastOrderIds || [],
            metadata: doc.metadata || {},
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(customer_schema_1.Customer.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], CustomersService);
//# sourceMappingURL=customers.service.js.map