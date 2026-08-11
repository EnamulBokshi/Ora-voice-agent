import { Model } from 'mongoose';
import { CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class CustomersService {
    private readonly customerModel;
    constructor(customerModel: Model<CustomerDocument>);
    create(businessId: string, dto: CreateCustomerDto): Promise<{
        id: any;
        businessId: any;
        name: any;
        email: string | null;
        phone: string | null;
        extractedPreferences: any;
        pastOrderIds: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }>;
    findAll(businessId: string, search?: string): Promise<{
        id: any;
        businessId: any;
        name: any;
        email: string | null;
        phone: string | null;
        extractedPreferences: any;
        pastOrderIds: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    findOne(businessId: string, id: string): Promise<{
        id: any;
        businessId: any;
        name: any;
        email: string | null;
        phone: string | null;
        extractedPreferences: any;
        pastOrderIds: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }>;
    update(businessId: string, id: string, dto: UpdateCustomerDto): Promise<{
        id: any;
        businessId: any;
        name: any;
        email: string | null;
        phone: string | null;
        extractedPreferences: any;
        pastOrderIds: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }>;
    private formatCustomer;
}
