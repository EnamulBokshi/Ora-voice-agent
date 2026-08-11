import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { DomainException } from '../common/exceptions/domain.exception';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) {}

  async create(businessId: string, dto: CreateCustomerDto) {
    const customer = new this.customerModel({
      businessId: businessId as any,
      name: dto.name,
      emailEncrypted: dto.email ? EncryptionUtil.encrypt(dto.email) : undefined,
      phoneEncrypted: dto.phone ? EncryptionUtil.encrypt(dto.phone) : undefined,
      extractedPreferences: dto.extractedPreferences || {},
      metadata: dto.metadata || {},
    });

    const saved = await customer.save();
    return this.formatCustomer(saved);
  }

  async findAll(businessId: string, search?: string) {
    const filter: Record<string, any> = {
      businessId: businessId as any,
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

  async findOne(businessId: string, id: string) {
    const customer = await this.customerModel
      .findOne({
        _id: id as any,
        businessId: businessId as any,
      })
      .exec();

    if (!customer) {
      throw new DomainException(
        'CUSTOMER_NOT_FOUND',
        `Customer with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    return this.formatCustomer(customer);
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.customerModel
      .findOne({
        _id: id as any,
        businessId: businessId as any,
      })
      .exec();

    if (!customer) {
      throw new DomainException(
        'CUSTOMER_NOT_FOUND',
        `Customer with ID '${id}' not found.`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.email !== undefined)
      customer.emailEncrypted = EncryptionUtil.encrypt(dto.email);
    if (dto.phone !== undefined)
      customer.phoneEncrypted = EncryptionUtil.encrypt(dto.phone);
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

  private formatCustomer(customer: CustomerDocument) {
    const doc = customer.toObject ? customer.toObject() : customer;
    return {
      id: doc._id.toString(),
      businessId: doc.businessId.toString(),
      name: doc.name,
      email: doc.emailEncrypted ? EncryptionUtil.decrypt(doc.emailEncrypted) : null,
      phone: doc.phoneEncrypted ? EncryptionUtil.decrypt(doc.phoneEncrypted) : null,
      extractedPreferences: doc.extractedPreferences || {},
      pastOrderIds: doc.pastOrderIds || [],
      metadata: doc.metadata || {},
      createdAt: (doc as any).createdAt,
      updatedAt: (doc as any).updatedAt,
    };
  }
}
